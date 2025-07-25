import { ExpenseCategory } from '../types/expense';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'all',
  'Electronics',
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Utilities',
  'Banking',
  'Groceries',
  'Entertainment',
  'Travel'
];

export const BANK_COLORS = {
  'ICICI Bank': 'bg-purple-100 text-purple-800',
  'Axis Bank': 'bg-orange-100 text-orange-800',
  'HDFC Bank': 'bg-red-100 text-red-800',
  default: 'bg-blue-100 text-blue-800'
} as const;

export const SOURCE_COLORS = {
  gmail: 'bg-green-100 text-green-800 hover:bg-green-200',
  credit_card: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  credit: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
} as const;

export const SOURCE_LABELS = {
  gmail: '📧 Gmail',
  credit_card: '💳 Credit Card',
  credit: '💰 Bank Credit'
} as const; 