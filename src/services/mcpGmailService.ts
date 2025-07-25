import { Expense } from '../types/expense';

export interface ServerResponse {
  success: boolean;
  message?: string;
  authUrl?: string;
  authenticated?: boolean;
  expenses?: Expense[];
  expense?: Expense;
  userInfo?: any;
  count?: number;
}

export class SecureGmailService {
  private serverUrl: string;

  constructor() {
    // Server URL - in production, this would be configurable
    this.serverUrl = 'http://localhost:3002';
  }

  /**
   * Make HTTP request to server
   */
  private async makeRequest(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any): Promise<ServerResponse> {
    try {
      const response = await fetch(`${this.serverUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`Server request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[Secure Gmail Service] Request failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get authentication URL from server
   */
  async getAuthUrl(): Promise<string> {
    const response = await this.makeRequest('/auth/url', 'POST');
    
    if (response.success && response.authUrl) {
      return response.authUrl;
    }

    throw new Error(response.message || 'Failed to get authentication URL');
  }

  /**
   * Complete authentication with auth code
   */
  async authenticate(authCode: string): Promise<boolean> {
    const response = await this.makeRequest('/auth/callback', 'POST', { authCode });
    
    if (response.success && response.authenticated) {
      return true;
    }

    throw new Error(response.message || 'Authentication failed');
  }

  /**
   * Check authentication status
   */
  async isAuthenticated(): Promise<boolean> {
    const response = await this.makeRequest('/auth/status');
    return response.success && response.authenticated === true;
  }

  /**
   * Get user information
   */
  async getUserInfo(): Promise<any> {
    const response = await this.makeRequest('/auth/status');
    return response.userInfo || null;
  }

  /**
   * Fetch expenses from Gmail via secure server
   */
  async fetchExpenses(options: {
    maxResults?: number;
    dateFrom?: string;
    dateTo?: string;
    bankFilter?: string[];
  } = {}): Promise<Expense[]> {
    const response = await this.makeRequest('/expenses', 'POST', options);
    
    if (response.success && response.expenses) {
      return response.expenses;
    }

    throw new Error(response.message || 'Failed to fetch expenses');
  }

  /**
   * Parse a specific email for expense data
   */
  async parseEmailExpense(emailId: string): Promise<Expense | null> {
    const response = await this.makeRequest('/expenses/parse', 'POST', { emailId });
    
    if (response.success) {
      return response.expense || null;
    }

    throw new Error(response.message || 'Failed to parse email');
  }
} 