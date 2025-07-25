export interface Expense {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  amount: number;
  merchant: string;
  category: string;
  description: string;
  source: 'gmail' | 'credit_card' | 'credit';
  bank: string;
  gmailLink: string;
  threadId: string;
  isRealData: boolean;
  transactionType: 'debit' | 'credit'; // Added to distinguish expenses from income
}

export interface ExpenseFilters {
  month: string; // YYYY-MM format
  category: string;
  transactionTypes: ('debit' | 'credit')[]; // Array of selected transaction types
}

export interface SortConfig {
  key: 'date' | 'amount';
  direction: 'asc' | 'desc';
}

export interface ExpenseSummary {
  netAmount: number; // Credit - Debit (net difference)
  totalCredit: number; // Total money coming in
  totalDebit: number; // Total money going out
  transactionCount: number;
  categoriesCount: number;
}

export type ExpenseCategory = 
  | 'all'
  | 'Electronics'
  | 'Food & Dining'
  | 'Shopping'
  | 'Transportation'
  | 'Utilities'
  | 'Banking'
  | 'Groceries'
  | 'Entertainment'
  | 'Travel';

export interface GmailSyncStatus {
  isLoading: boolean;
  lastSync: Date | null;
  error: string | null;
} 