import { Expense } from '../types/expense';

// Gmail API configuration
const GMAIL_API_CONFIG = {
  clientId: import.meta.env.VITE_GMAIL_CLIENT_ID || 'your-client-id',
  clientSecret: import.meta.env.VITE_GMAIL_CLIENT_SECRET || 'your-client-secret',
  redirectUri: 'http://localhost:3000/auth/callback',
  scopes: ['https://www.googleapis.com/auth/gmail.readonly']
};

export class RealGmailService {
  private static accessToken: string | null = null;

  /**
   * Authenticate with Gmail using OAuth2
   */
  static async authenticate(): Promise<boolean> {
    try {
      // Step 1: Redirect to Google OAuth2
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GMAIL_API_CONFIG.clientId}&` +
        `redirect_uri=${GMAIL_API_CONFIG.redirectUri}&` +
        `response_type=code&` +
        `scope=${GMAIL_API_CONFIG.scopes.join(' ')}`;
      
      console.log('Redirecting to Gmail OAuth:', authUrl);
      window.location.href = authUrl;
      
      return true;
    } catch (error) {
      console.error('Gmail authentication failed:', error);
      return false;
    }
  }

  /**
   * Exchange authorization code for access token
   */
  static async handleAuthCallback(code: string): Promise<boolean> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GMAIL_API_CONFIG.clientId,
          client_secret: GMAIL_API_CONFIG.clientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: GMAIL_API_CONFIG.redirectUri,
        }),
      });

      const data = await response.json();
      this.accessToken = data.access_token;
      
      // Store token securely (consider using secure storage)
      localStorage.setItem('gmail_access_token', data.access_token);
      
      return true;
    } catch (error) {
      console.error('Token exchange failed:', error);
      return false;
    }
  }

  /**
   * Fetch expense emails from Gmail
   */
  static async fetchExpenses(): Promise<Expense[]> {
    if (!this.accessToken) {
      this.accessToken = localStorage.getItem('gmail_access_token');
    }

    if (!this.accessToken) {
      throw new Error('Not authenticated with Gmail');
    }

    try {
      // Step 1: Search for transaction emails
      const searchQuery = 'from:(noreply@icicibank.com OR alerts@hdfcbank.com OR noreply@axisbank.com) subject:(transaction OR debited OR credited)';
      
      const searchResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(searchQuery)}&maxResults=50`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      const searchData = await searchResponse.json();
      
      if (!searchData.messages) {
        return [];
      }

      // Step 2: Fetch email content for each message
      const expenses: Expense[] = [];
      
      for (const message of searchData.messages.slice(0, 20)) { // Limit to 20 emails
        const messageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
            },
          }
        );

        const messageData = await messageResponse.json();
        const expense = this.parseExpenseFromEmail(messageData);
        
        if (expense) {
          expenses.push(expense);
        }
      }

      return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
    } catch (error) {
      console.error('Failed to fetch Gmail expenses:', error);
      throw new Error('Failed to fetch expenses from Gmail');
    }
  }

  /**
   * Parse expense data from Gmail message
   */
  private static parseExpenseFromEmail(messageData: any): Expense | null {
    try {
      const headers = messageData.payload.headers;
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const date = new Date(parseInt(messageData.internalDate)).toISOString().split('T')[0];
      
      // Extract email body
      let body = '';
      if (messageData.payload.body?.data) {
        body = atob(messageData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      } else if (messageData.payload.parts) {
        for (const part of messageData.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            break;
          }
        }
      }

      // Parse transaction details from subject and body
      const amountMatch = body.match(/(?:INR|Rs\.?)\s*([0-9,]+(?:\.[0-9]{2})?)/i);
      const merchantMatch = body.match(/(?:at|from|to)\s+([A-Za-z\s]+)/i);
      
      if (!amountMatch) return null;

      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      const merchant = merchantMatch?.[1]?.trim() || 'Unknown Merchant';
      
      // Determine bank from email
      let bank = 'Unknown Bank';
      if (from.includes('icicibank.com')) bank = 'ICICI Bank';
      else if (from.includes('hdfcbank.com')) bank = 'HDFC Bank';
      else if (from.includes('axisbank.com')) bank = 'Axis Bank';
      
      // Simple category detection
      const category = this.detectCategory(merchant, subject + ' ' + body);
      
      return {
        id: messageData.id,
        date: date,
        amount: amount,
        merchant: merchant,
        category: category,
        description: subject,
        source: 'gmail' as const,
        bank: bank,
        gmailLink: `https://mail.google.com/mail/u/0/#inbox/${messageData.id}`,
        threadId: messageData.threadId,
        isRealData: true
      };
      
    } catch (error) {
      console.error('Failed to parse email:', error);
      return null;
    }
  }

  /**
   * Detect transaction category based on merchant and content
   */
  private static detectCategory(merchant: string, content: string): string {
    const merchantLower = merchant.toLowerCase();
    const contentLower = content.toLowerCase();
    
    if (merchantLower.includes('amazon') || merchantLower.includes('flipkart')) return 'Shopping';
    if (merchantLower.includes('spotify') || merchantLower.includes('netflix')) return 'Entertainment';
    if (merchantLower.includes('uber') || merchantLower.includes('ola')) return 'Transportation';
    if (merchantLower.includes('swiggy') || merchantLower.includes('zomato')) return 'Food & Dining';
    if (contentLower.includes('electricity') || contentLower.includes('gas')) return 'Utilities';
    if (contentLower.includes('atm') || contentLower.includes('bank')) return 'Banking';
    if (merchantLower.includes('grocery') || merchantLower.includes('supermarket')) return 'Groceries';
    if (merchantLower.includes('flight') || merchantLower.includes('hotel')) return 'Travel';
    
    return 'Others';
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return !!this.accessToken || !!localStorage.getItem('gmail_access_token');
  }
} 