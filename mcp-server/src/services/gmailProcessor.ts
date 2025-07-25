import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ExpenseParser } from './expenseParser.js';
import fs from 'fs';
import path from 'path';

export interface ExpenseData {
  id: string;
  date: string;
  amount: number;
  merchant: string;
  category: string;
  description: string;
  source: 'gmail';
  bank: string;
  gmailLink: string;
  threadId: string;
  isRealData: boolean;
}

export interface FetchExpensesOptions {
  maxResults?: number;
  dateFrom?: string;
  dateTo?: string;
  bankFilter?: string[];
}

export class GmailExpenseProcessor {
  private oauth2Client: OAuth2Client;
  private gmail: any;
  private expenseParser: ExpenseParser;
  private isAuth = false;
  private tokensPath: string;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    this.expenseParser = new ExpenseParser();
    this.tokensPath = path.join(process.cwd(), '.gmail-tokens.json');

    // Try to load existing tokens
    this.loadStoredTokens();
  }

  private loadStoredTokens() {
    try {
      // Try to load from file first
      if (fs.existsSync(this.tokensPath)) {
        const tokensData = fs.readFileSync(this.tokensPath, 'utf8');
        const tokens = JSON.parse(tokensData);
        this.oauth2Client.setCredentials(tokens);
        this.isAuth = true;
        console.log('[Gmail Processor] Loaded stored tokens from file');
        return;
      }

      // Fallback to environment variable
      if (process.env.GMAIL_REFRESH_TOKEN) {
        this.oauth2Client.setCredentials({
          refresh_token: process.env.GMAIL_REFRESH_TOKEN,
        });
        this.isAuth = true;
        console.log('[Gmail Processor] Loaded tokens from environment');
      }
    } catch (error) {
      console.warn('[Gmail Processor] No stored tokens found:', error);
    }
  }

  private saveTokens(tokens: any) {
    try {
      // Save tokens to file
      fs.writeFileSync(this.tokensPath, JSON.stringify(tokens, null, 2));
      console.log('[Gmail Processor] Tokens saved successfully');
      
      // Also log the refresh token for manual backup
      if (tokens.refresh_token) {
        console.log('[Gmail Processor] Refresh token (for backup):');
        console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
      }
    } catch (error) {
      console.error('[Gmail Processor] Failed to save tokens:', error);
    }
  }

  async getAuthUrl(): Promise<string> {
    const scopes = process.env.GMAIL_SCOPES?.split(',') || [
      'https://www.googleapis.com/auth/gmail.readonly'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent' // Force consent to get refresh token
    });
  }

  async authenticate(authCode: string): Promise<any> {
    try {
      const { tokens } = await this.oauth2Client.getToken(authCode);
      this.oauth2Client.setCredentials(tokens);
      this.saveTokens(tokens);
      this.isAuth = true;
      
      console.log('[Gmail Processor] Authentication successful');
      return tokens;
    } catch (error) {
      console.error('[Gmail Processor] Authentication failed:', error);
      throw new Error('Failed to authenticate with Gmail');
    }
  }

  async isAuthenticated(): Promise<boolean> {
    if (!this.isAuth) return false;

    try {
      // Test authentication by making a simple API call
      await this.gmail.users.getProfile({ userId: 'me' });
      return true;
    } catch (error) {
      console.error('[Gmail Processor] Auth check failed:', error);
      this.isAuth = false;
      return false;
    }
  }

  async getUserInfo(): Promise<any> {
    try {
      const response = await this.gmail.users.getProfile({ userId: 'me' });
      return {
        email: response.data.emailAddress,
        messagesTotal: response.data.messagesTotal,
        threadsTotal: response.data.threadsTotal,
      };
    } catch (error) {
      console.error('[Gmail Processor] Failed to get user info:', error);
      return null;
    }
  }

  async fetchExpenses(options: FetchExpensesOptions = {}): Promise<ExpenseData[]> {
    const {
      maxResults = 50,
      dateFrom,
      dateTo,
      bankFilter
    } = options;

    try {
      // Build search query for transaction emails (expanded to catch all bank variations)
      let query = 'subject:(transaction alert OR "payment received" OR "amount credited" OR "amount debited" OR "transaction notification" OR "account debited" OR "account credited" OR "payment alert" OR "fund transfer")';
      
      // Also search by bank email domains to catch bank-specific patterns
      query += ' OR from:(noreply@icicibank.com OR alerts@hdfcbank.com OR noreply@axisbank.com OR alerts@sbi.co.in OR donotreply.sbiatm@alerts.sbi.co.in OR bankalerts@kotak.com OR noreply@paytm.com OR alerts@phonepe.com OR noreply@googlepay.com)';
      
      // Exclude promotional emails only
      query += ' -subject:("increase your credit limit" OR "avail now" OR "lifetime free" OR "pre-approved" OR "apply now" OR "congratulations" OR "reward points" OR "upgrade your")';

      // Convert date format from YYYY-MM-DD to YYYY/MM/DD for Gmail search
      if (dateFrom) {
        const gmailDateFrom = dateFrom.replace(/-/g, '/');
        query += ` after:${gmailDateFrom}`;
      }
      if (dateTo) {
        const gmailDateTo = dateTo.replace(/-/g, '/');
        query += ` before:${gmailDateTo}`;
      }

      console.log('[Gmail Processor] Searching emails with query:', query);

      // Search for transaction emails
      const searchResponse = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: maxResults,
      });

      if (!searchResponse.data.messages) {
        console.log('[Gmail Processor] No transaction emails found');
        return [];
      }

      console.log(`[Gmail Processor] Found ${searchResponse.data.messages.length} potential transaction emails`);

      // Process each email
      const expenses: ExpenseData[] = [];
      const processedCount = Math.min(searchResponse.data.messages.length, maxResults);

      for (let i = 0; i < processedCount; i++) {
        const message = searchResponse.data.messages[i];
        try {
          const expense = await this.parseEmailExpense(message.id);
          if (expense && this.shouldIncludeExpense(expense, bankFilter)) {
            expenses.push(expense);
          }
        } catch (error) {
          console.warn(`[Gmail Processor] Failed to parse message ${message.id}:`, error);
        }
      }

      console.log(`[Gmail Processor] Successfully parsed ${expenses.length} expenses`);
      return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    } catch (error) {
      console.error('[Gmail Processor] Failed to fetch expenses:', error);
      throw new Error('Failed to fetch expenses from Gmail');
    }
  }

  async parseEmailExpense(messageId: string): Promise<ExpenseData | null> {
    try {
      // Fetch email content
      const messageResponse = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const messageData = messageResponse.data;
      
      // Parse the email using our expense parser
      const expense = this.expenseParser.parseExpenseFromEmail(messageData);
      
      // Return all transactions (both debits and credits) for complete financial picture
      if (expense) {
        return {
          ...expense,
          id: messageId,
          gmailLink: `https://mail.google.com/mail/u/0/#inbox/${messageId}`,
          threadId: messageData.threadId,
          source: 'gmail' as const,
          isRealData: true,
        };
      }

      return null;
    } catch (error) {
      console.error(`[Gmail Processor] Failed to parse email ${messageId}:`, error);
      return null;
    }
  }

  private shouldIncludeExpense(expense: ExpenseData, bankFilter?: string[]): boolean {
    if (!bankFilter || bankFilter.length === 0) {
      return true;
    }

    return bankFilter.some(bank => 
      expense.bank.toLowerCase().includes(bank.toLowerCase())
    );
  }

  // Debug method to search for SBI emails specifically
  async searchSBIEmails(dateFrom?: string, dateTo?: string): Promise<any[]> {
    try {
      // Test different SBI search patterns
      const sbiQueries = [
        'from:donotreply.sbiatm@alerts.sbi.co.in',
        'from:alerts.sbi.co.in',
        'subject:"State Bank of India"',
        'subject:"Transaction alert" from:sbi.co.in',
        'sbi.co.in'
      ];

      const results = [];
      
      for (const query of sbiQueries) {
        let fullQuery = query;
        
        // Add date filters if provided
        if (dateFrom) {
          const gmailDateFrom = dateFrom.replace(/-/g, '/');
          fullQuery += ` after:${gmailDateFrom}`;
        }
        if (dateTo) {
          const gmailDateTo = dateTo.replace(/-/g, '/');
          fullQuery += ` before:${gmailDateTo}`;
        }

        console.log(`[SBI Debug] Testing query: ${fullQuery}`);
        
        const searchResponse = await this.gmail.users.messages.list({
          userId: 'me',
          q: fullQuery,
          maxResults: 10,
        });

        if (searchResponse.data.messages) {
          console.log(`[SBI Debug] Found ${searchResponse.data.messages.length} emails with query: ${fullQuery}`);
          
          // Get details of first email for debugging
          if (searchResponse.data.messages.length > 0) {
            const firstMessage = searchResponse.data.messages[0];
            const messageResponse = await this.gmail.users.messages.get({
              userId: 'me',
              id: firstMessage.id,
              format: 'full',
            });
            
            const headers = messageResponse.data.payload?.headers || [];
            const subject = headers.find((h: any) => h.name?.toLowerCase() === 'subject')?.value || '';
            const from = headers.find((h: any) => h.name?.toLowerCase() === 'from')?.value || '';
            const date = new Date(parseInt(messageResponse.data.internalDate)).toISOString();
            
            results.push({
              query: fullQuery,
              count: searchResponse.data.messages.length,
              firstEmailSample: {
                subject,
                from,
                date,
                id: firstMessage.id
              }
            });
          }
        } else {
          console.log(`[SBI Debug] No emails found with query: ${fullQuery}`);
          results.push({
            query: fullQuery,
            count: 0
          });
        }
      }

      return results;
    } catch (error) {
      console.error('[SBI Debug] Failed to search SBI emails:', error);
      return [];
    }
  }

  // Debug method to get raw email content
  async getEmailContent(messageId: string): Promise<any> {
    try {
      // Fetch email content
      const messageResponse = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const messageData = messageResponse.data;
      const headers = messageData.payload?.headers || [];
      const subject = headers.find((h: any) => h.name?.toLowerCase() === 'subject')?.value || '';
      const from = headers.find((h: any) => h.name?.toLowerCase() === 'from')?.value || '';
      const date = new Date(parseInt(messageData.internalDate)).toISOString();

      // Extract email body using the same method as expense parser
      const body = this.extractEmailBodyForDebug(messageData.payload);

      return {
        id: messageId,
        subject,
        from,
        date,
        body: body,
        bodyPreview: body.substring(0, 1000), // First 1000 chars for preview
        headers: headers.map((h: any) => ({ name: h.name, value: h.value }))
      };
    } catch (error) {
      console.error(`[Gmail Processor] Failed to get email content for ${messageId}:`, error);
      throw error;
    }
  }

  private extractEmailBodyForDebug(payload: any): string {
    let body = '';

    try {
      // Handle different email structures - enhanced for multipart emails
      if (payload.body?.data) {
        body = this.decodeBase64ForDebug(payload.body.data);
      } else if (payload.parts) {
        body = this.extractFromParts(payload.parts);
      }

      return body;
    } catch (error) {
      console.error('[Gmail Processor] Failed to extract email body:', error);
      return '';
    }
  }

  private extractFromParts(parts: any[]): string {
    let body = '';
    
    for (const part of parts) {
      // Direct text content
      if ((part.mimeType === 'text/plain' || part.mimeType === 'text/html') && part.body?.data) {
        const content = this.decodeBase64ForDebug(part.body.data);
        if (content.trim()) {
          body += content + '\n';
        }
      }
      // Nested multipart structures
      else if (part.parts && Array.isArray(part.parts)) {
        const nestedContent = this.extractFromParts(part.parts);
        if (nestedContent.trim()) {
          body += nestedContent + '\n';
        }
      }
      // Handle other content types that might contain text
      else if (part.body?.data && 
               (part.mimeType?.includes('text') || 
                part.mimeType?.includes('html') ||
                part.mimeType?.includes('plain'))) {
        const content = this.decodeBase64ForDebug(part.body.data);
        if (content.trim()) {
          body += content + '\n';
        }
      }
    }
    
    return body;
  }

  private decodeBase64ForDebug(data: string): string {
    try {
      // Replace URL-safe base64 characters
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      return Buffer.from(base64, 'base64').toString('utf-8');
    } catch (error) {
      console.error('[Gmail Processor] Failed to decode base64:', error);
      return '';
    }
  }
} 