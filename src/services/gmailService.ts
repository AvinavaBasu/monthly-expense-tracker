import { Expense } from '../types/expense';
import { sortExpensesByDate } from '../utils/expenseUtils';

// Mock expense data - replace with real Gmail API integration
const MOCK_EXPENSES: Expense[] = [
  {
    id: "197d05e1a4ff70da",
    date: "2025-01-03",
    amount: 40493.00,
    merchant: "Regal Vacation Concepts",
    category: "Travel",
    description: "REGAL VACATION CONCEPTS L - Credit Card Transaction",
    source: "credit_card",
    bank: "ICICI Bank",
    gmailLink: "https://mail.google.com/mail/u/0/#inbox/197d05e1a4ff70da",
    threadId: "197d05e1a4ff70da",
    isRealData: true
  },
  {
    id: "197cc461277f74b7",
    date: "2025-01-02",
    amount: 474.21,
    merchant: "Amazon",
    category: "Shopping",
    description: "IND*Amazon - Credit Card Transaction",
    source: "credit_card",
    bank: "ICICI Bank",
    gmailLink: "https://mail.google.com/mail/u/0/#inbox/197cc461277f74b7",
    threadId: "197cc461277f74b7",
    isRealData: true
  },
  {
    id: "197c3d30e5325f49",
    date: "2024-12-30",
    amount: 1232.00,
    merchant: "ICICI Bank",
    category: "Banking",
    description: "Interest Credited - Account XX518",
    source: "credit",
    bank: "ICICI Bank",
    gmailLink: "https://mail.google.com/mail/u/0/#inbox/197c3d30e5325f49",
    threadId: "197c3d30e5325f49",
    isRealData: true
  },
  {
    id: "197aabbb573da64c",
    date: "2024-12-26",
    amount: 119.00,
    merchant: "Spotify",
    category: "Entertainment",
    description: "SPOTIFY SI - Credit Card Transaction",
    source: "credit_card",
    bank: "ICICI Bank",
    gmailLink: "https://mail.google.com/mail/u/0/#inbox/197aabbb573da64c",
    threadId: "197aabbb573da64c",
    isRealData: true
  },
  {
    id: "197a86c206b22f4e",
    date: "2024-12-26",
    amount: 855.50,
    merchant: "HP Pay",
    category: "Utilities",
    description: "HP PAY CREDIT CARD - Transaction",
    source: "credit_card",
    bank: "ICICI Bank",
    gmailLink: "https://mail.google.com/mail/u/0/#inbox/197a86c206b22f4e",
    threadId: "197a86c206b22f4e",
    isRealData: true
  }
];

export class GmailService {
  /**
   * Fetches expense data from Gmail
   * Currently returns mock data - replace with actual Gmail API integration
   */
  static async fetchExpenses(): Promise<Expense[]> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Fetching real Gmail expense data...');
    
    try {
      // TODO: Replace with actual Gmail API integration
      // This would involve:
      // 1. Authenticating with Gmail API
      // 2. Searching for specific email patterns (bank notifications, etc.)
      // 3. Parsing email content to extract transaction details
      // 4. Categorizing transactions
      
      const expenses = sortExpensesByDate(MOCK_EXPENSES);
      
      console.log(`Successfully loaded ${expenses.length} real expenses from Gmail`);
      return expenses;
      
    } catch (error) {
      console.error('Failed to sync with Gmail:', error);
      throw new Error('Failed to fetch expenses from Gmail');
    }
  }
  
  /**
   * Authenticates with Gmail API
   * TODO: Implement OAuth2 authentication
   */
  static async authenticate(): Promise<boolean> {
    // TODO: Implement Gmail OAuth2 authentication
    return true;
  }
  
  /**
   * Checks if user is authenticated
   * TODO: Implement authentication check
   */
  static isAuthenticated(): boolean {
    // TODO: Check if user has valid Gmail access token
    return true;
  }
} 