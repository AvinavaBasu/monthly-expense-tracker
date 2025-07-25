import { Expense, ExpenseFilters, ExpenseSummary } from '../types/expense';

export const filterExpenses = (
  expenses: Expense[],
  filters: ExpenseFilters
): Expense[] => {
  return expenses.filter(expense => {
    const expenseMonth = expense.date.slice(0, 7);
    const categoryMatch = filters.category === 'all' || expense.category === filters.category;
    const transactionTypes = filters.transactionTypes || ['debit', 'credit'];
    const transactionTypeMatch = transactionTypes.includes(expense.transactionType);
    
    return expenseMonth === filters.month && categoryMatch && transactionTypeMatch;
  });
};

export const calculateExpenseSummary = (expenses: Expense[]): ExpenseSummary => {
  const credits = expenses.filter(expense => expense.transactionType === 'credit');
  const debits = expenses.filter(expense => expense.transactionType === 'debit');
  
  const totalCredit = credits.reduce((sum, expense) => sum + expense.amount, 0);
  const totalDebit = debits.reduce((sum, expense) => sum + expense.amount, 0);
  const netAmount = totalCredit - totalDebit; // Positive = gaining money, Negative = spending more
  
  const transactionCount = expenses.length;
  const categoriesCount = new Set(expenses.map(expense => expense.category)).size;

  return {
    netAmount,
    totalCredit,
    totalDebit,
    transactionCount,
    categoriesCount
  };
};

export const sortExpensesByDate = (expenses: Expense[]): Expense[] => {
  return [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const exportToCSV = (expenses: Expense[], filename: string): void => {
  const csvContent = [
    ['Date', 'Type', 'Category', 'Amount', 'Description', 'Bank', 'Source'],
    ...expenses.map(expense => [
      expense.date,
      expense.transactionType,
      expense.category,
      expense.amount.toString(),
      expense.description,
      expense.bank,
      expense.source
    ])
  ].map(row => row.join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const formatCurrency = (amount: number): string => {
  return `INR ${amount.toLocaleString()}`;
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

export const getMonthYearDisplay = (monthString: string): string => {
  return new Date(monthString + '-01').toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });
}; 