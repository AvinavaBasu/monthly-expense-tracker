export interface ParsedExpense {
  date: string;
  amount: number;
  merchant: string;
  category: string;
  description: string;
  bank: string;
  transactionType: 'debit' | 'credit'; // Added to distinguish expenses from income
}

export class ExpenseParser {
  // Bank email patterns and their corresponding bank names
  private bankPatterns = {
    'icicibank.com': 'ICICI Bank',
    'hdfcbank.com': 'HDFC Bank', 
    'axisbank.com': 'Axis Bank',
    'sbi.co.in': 'State Bank of India',
    'alerts.sbi.co.in': 'State Bank of India',
    'kotak.com': 'Kotak Mahindra Bank',
    'yesbank.in': 'Yes Bank',
    'pnb.co.in': 'Punjab National Bank',
  };

  // Category detection patterns
  private categoryPatterns = {
    'Shopping': [
      'amazon', 'flipkart', 'myntra', 'ajio', 'shopping', 'mall', 'store',
      'market', 'retail', 'purchase', 'bigbasket', 'grofers', 'blinkit'
    ],
    'Food & Dining': [
      'swiggy', 'zomato', 'dominos', 'pizza', 'restaurant', 'cafe', 'food',
      'dining', 'mcdonald', 'kfc', 'burger', 'starbucks', 'dunkin'
    ],
    'Transportation': [
      'uber', 'ola', 'rapido', 'metro', 'bus', 'taxi', 'auto', 'petrol',
      'fuel', 'diesel', 'gas', 'parking', 'toll', 'travel'
    ],
    'Entertainment': [
      'netflix', 'amazon prime', 'disney', 'hotstar', 'spotify', 'youtube',
      'movie', 'cinema', 'theatre', 'bookmyshow', 'entertainment', 'music'
    ],
    'Utilities': [
      'electricity', 'power', 'gas', 'water', 'internet', 'broadband', 'wifi',
      'mobile', 'phone', 'recharge', 'bill', 'utility', 'bsnl', 'airtel', 'jio'
    ],
    'Banking': [
      'bank', 'atm', 'interest', 'fd', 'deposit', 'loan', 'emi', 'credit',
      'debit', 'transfer', 'payment', 'fee', 'charge'
    ],
    'Healthcare': [
      'hospital', 'clinic', 'pharmacy', 'medicine', 'doctor', 'medical',
      'health', 'apollo', 'fortis', '1mg', 'pharmeasy'
    ],
    'Travel': [
      'flight', 'airline', 'hotel', 'booking', 'makemytrip', 'goibibo',
      'cleartrip', 'indigo', 'spicejet', 'air india', 'vacation'
    ],
    'Groceries': [
      'grocery', 'vegetables', 'fruits', 'milk', 'bread', 'supermarket',
      'hypermarket', 'dmart', 'more', 'reliance fresh', 'spencer'
    ]
  };

  parseExpenseFromEmail(messageData: any): ParsedExpense | null {
    try {
      const headers = messageData.payload?.headers || [];
      const subject = this.getHeader(headers, 'Subject') || '';
      const from = this.getHeader(headers, 'From') || '';
      const date = new Date(parseInt(messageData.internalDate)).toISOString().split('T')[0];

      // Extract email body
      const body = this.extractEmailBody(messageData.payload);
      if (!body) {
        console.warn('[Expense Parser] No email body found');
        return null;
      }

      // Parse transaction amount
      const amount = this.extractAmount(subject + ' ' + body);
      if (!amount) {
        console.warn('[Expense Parser] No amount found in email');
        console.warn('[Expense Parser] Subject:', subject);
        console.warn('[Expense Parser] Body preview:', body.substring(0, 200));
        return null;
      }

      // Extract merchant/description
      const merchant = this.extractMerchant(subject, body);
      const description = this.extractDescription(subject, body, merchant);

      // Detect bank
      const bank = this.detectBank(from);

      // Detect category
      const category = this.detectCategory(merchant, subject + ' ' + body);

      // Detect transaction type (debit = expense, credit = income)
      const transactionType = this.detectTransactionType(subject, body);

      return {
        date,
        amount,
        merchant,
        category,
        description,
        bank,
        transactionType,
      };

    } catch (error) {
      console.error('[Expense Parser] Failed to parse email:', error);
      return null;
    }
  }

  private getHeader(headers: any[], name: string): string | null {
    const header = headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase());
    return header?.value || null;
  }

  private extractEmailBody(payload: any): string {
    let body = '';

    try {
      // Handle different email structures - enhanced for multipart emails
      if (payload.body?.data) {
        body = this.decodeBase64(payload.body.data);
      } else if (payload.parts) {
        body = this.extractFromParts(payload.parts);
      }

      return body;
    } catch (error) {
      console.error('[Expense Parser] Failed to extract email body:', error);
      return '';
    }
  }

  private extractFromParts(parts: any[]): string {
    let body = '';
    
    for (const part of parts) {
      // Direct text content
      if ((part.mimeType === 'text/plain' || part.mimeType === 'text/html') && part.body?.data) {
        const content = this.decodeBase64(part.body.data);
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
        const content = this.decodeBase64(part.body.data);
        if (content.trim()) {
          body += content + '\n';
        }
      }
    }
    
    return body;
  }

  private decodeBase64(data: string): string {
    try {
      // Replace URL-safe base64 characters
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      return Buffer.from(base64, 'base64').toString('utf-8');
    } catch (error) {
      console.error('[Expense Parser] Failed to decode base64:', error);
      return '';
    }
  }

  private extractAmount(text: string): number | null {
    // Enhanced patterns to match various bank email formats including structured tables
    const patterns = [
      // Standard patterns
      /(?:INR|Rs\.?|₹)\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
      /amount[:\s]+(?:INR|Rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
      /debited[:\s]+(?:INR|Rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
      /credited[:\s]+(?:INR|Rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
      /paid[:\s]+(?:INR|Rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
      /withdrawn[:\s]+(?:INR|Rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
      
      // Structured email patterns (like SBI, ICICI table formats)
      /amount\s*\(\s*inr\s*\)[:\s]*([0-9,]+(?:\.[0-9]{2})?)/gi,
      /amount\s*\(\s*rs\.?\s*\)[:\s]*([0-9,]+(?:\.[0-9]{2})?)/gi,
      /transaction\s*amount[:\s]*(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
      
      // HTML table cell patterns
      /<td[^>]*>\s*([0-9,]+(?:\.[0-9]{2})?)\s*<\/td>/gi,
      
      // Colon-separated patterns for structured data
      /:\s*([0-9,]+(?:\.[0-9]{2})?)\s*$/gm,
      
      // Value column patterns
      /value[:\s]*([0-9,]+(?:\.[0-9]{2})?)/gi,
    ];

    console.log('[Amount Debug] Processing text length:', text.length);
    console.log('[Amount Debug] Text preview:', text.substring(0, 500));

    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const matches = text.match(pattern);
      if (matches) {
        console.log(`[Amount Debug] Pattern ${i} matched:`, matches);
        for (const match of matches) {
          const amountMatch = match.match(/([0-9,]+(?:\.[0-9]{2})?)/);
          if (amountMatch) {
            const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
            console.log(`[Amount Debug] Found amount: ${amount} from match: ${match}`);
            if (amount > 0 && amount < 10000000) { // Reasonable upper limit to avoid false matches
              return amount;
            }
          }
        }
      }
    }

    console.log('[Amount Debug] No amount found with any pattern');
    return null;
  }

  private extractMerchant(subject: string, body: string): string {
    // Enhanced patterns to extract merchant from structured bank emails
    const patterns = [
      // Structured bank email patterns (SBI, ICICI, etc.)
      /terminal\s*owner\s*name[:\s]*([A-Za-z0-9\s\*\-\.]+?)(?:\n|\r|$)/gi,
      /terminal\s*name[:\s]*([A-Za-z0-9\s\*\-\.]+?)(?:\n|\r|$)/gi,
      /merchant\s*name[:\s]*([A-Za-z0-9\s\*\-\.]+?)(?:\n|\r|$)/gi,
      /location[:\s]*([A-Za-z0-9\s\*\-\.]+?)(?:\n|\r|$)/gi,
      
      // HTML table patterns for SBI emails
      /<td[^>]*>Terminal Owner Name<\/td>\s*<td[^>]*>([^<]+)<\/td>/gi,
      /<td[^>]*>Location<\/td>\s*<td[^>]*>([^<]+)<\/td>/gi,
      /<td[^>]*id="bank"[^>]*>([^<]+)<\/td>/gi,
      /<td[^>]*id="termLocation"[^>]*>([^<]+)<\/td>/gi,
      
      // Standard patterns
      /(?:at|from|to)\s+([A-Za-z0-9\s\*\-\.]+?)(?:\s|$|,|\.|;)/gi,
      /merchant[:\s]+([A-Za-z0-9\s\*\-\.]+?)(?:\s|$|,|\.|;)/gi,
      /transaction[:\s]+([A-Za-z0-9\s\*\-\.]+?)(?:\s|$|,|\.|;)/gi,
      
      // HTML table patterns
      /<td[^>]*>([A-Za-z0-9\s\*\-\.]+?)<\/td>/gi,
    ];

    const text = subject + ' ' + body;
    for (const pattern of patterns) {
      pattern.lastIndex = 0; // Reset regex state
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const merchant = match[1].trim().replace(/\*/g, '');
        if (merchant.length > 2 && merchant.length < 50 && 
            !merchant.toLowerCase().includes('bank') &&
            !merchant.toLowerCase().includes('card') &&
            !/^\d+$/.test(merchant)) { // Not just numbers
          return this.cleanMerchantName(merchant);
        }
      }
    }

    // Fallback: extract from subject
    const subjectWords = subject.split(' ').filter(word => 
      word.length > 3 && 
      !['transaction', 'debited', 'credited', 'payment', 'alert'].includes(word.toLowerCase())
    );

    if (subjectWords.length > 0) {
      return this.cleanMerchantName(subjectWords[0]);
    }

    return 'Unknown Merchant';
  }

  private cleanMerchantName(name: string): string {
    return name
      .replace(/[^\w\s\-\.]/g, '') // Remove special characters except word chars, spaces, hyphens, dots
      .replace(/\s+/g, ' ')        // Normalize spaces
      .trim()
      .slice(0, 30);               // Limit length
  }

  private extractDescription(subject: string, body: string, merchant: string): string {
    // Use the email subject as description - it contains the actual transaction context
    return subject
      .replace(/[^\w\s\-\.\,\:]/g, '') // Remove special characters except basic punctuation
      .replace(/\s+/g, ' ')           // Normalize spaces
      .trim()
      .slice(0, 100);                // Limit length to keep it readable
  }

  private cleanDescriptionText(text: string): string {
    return text
      .replace(/[^\w\s\-\.\,\:]/g, '') // Keep basic punctuation
      .replace(/\s+/g, ' ')           // Normalize spaces
      .replace(/transaction alert/gi, '') // Remove generic terms
      .replace(/for.*?bank/gi, '')    // Remove bank references
      .replace(/account.*?ending/gi, '') // Remove account details
      .replace(/card.*?ending/gi, '')  // Remove card details
      .trim()
      .slice(0, 80);                  // Limit length
  }

  private detectBank(fromEmail: string): string {
    const emailLower = fromEmail.toLowerCase();
    
    for (const [domain, bankName] of Object.entries(this.bankPatterns)) {
      if (emailLower.includes(domain)) {
        return bankName;
      }
    }

    return 'Unknown Bank';
  }

  private detectCategory(merchant: string, content: string): string {
    const textLower = (merchant + ' ' + content).toLowerCase();
    
    for (const [category, keywords] of Object.entries(this.categoryPatterns)) {
      for (const keyword of keywords) {
        if (textLower.includes(keyword.toLowerCase())) {
          return category;
        }
      }
    }

    return 'Others';
  }

  private detectTransactionType(subject: string, body: string): 'debit' | 'credit' {
    const text = (subject + ' ' + body).toLowerCase();
    
    // Keywords that indicate money going OUT (expenses/debits) - check first for specific patterns
    const specificDebitKeywords = [
      'id="trantype">purchase', 'trantype">purchase</td>', 'trantype">PURCHASE',
      'transaction type: purchase', 'transaction type: withdrawal',
      '>purchase<', 'purchase</td>', 'transaction type">purchase'
    ];
    
    // General debit keywords
    const debitKeywords = [
      'debited', 'charged', 'payment', 'withdrawal', 'purchase', 'spent',
      'paid', 'transaction alert', 'card used', 'amount debited', 'debit',
      'pos / ecom', 'online transaction', 'card transaction'
    ];
    
    // Keywords that indicate money coming IN (income/credits)
    const creditKeywords = [
      'credited', 'credit transaction', 'amount credited', 'deposited',
      'refund', 'cashback', 'reward', 'salary', 'contribution credit',
      'reversal', 'interest credited', 'dividend', 'payment received',
      'has been credited', 'neft transaction', 'fund transfer received',
      'transaction type: credit', 'transaction type: deposit'
    ];
    
    console.log('[Transaction Type Debug] Checking text:', text.substring(0, 200));
    
    // Check specific debit patterns first (highest priority)
    for (const keyword of specificDebitKeywords) {
      if (text.includes(keyword)) {
        console.log('[Transaction Type Debug] Matched specific debit keyword:', keyword);
        return 'debit';
      }
    }
    
    // Check for credit keywords
    for (const keyword of creditKeywords) {
      if (text.includes(keyword)) {
        console.log('[Transaction Type Debug] Matched credit keyword:', keyword);
        return 'credit';
      }
    }
    
    // Check for general debit keywords
    for (const keyword of debitKeywords) {
      if (text.includes(keyword)) {
        console.log('[Transaction Type Debug] Matched general debit keyword:', keyword);
        return 'debit';
      }
    }
    
    console.log('[Transaction Type Debug] No keywords matched, defaulting to debit');
    // Default to debit (expense) if unclear - better for expense tracking
    return 'debit';
  }
} 