import React from 'react';
import { ExpenseHeader } from './ExpenseHeader';
import { ExpenseFilters } from './ExpenseFilters';
import { ExpenseSummary } from './ExpenseSummary';
import { ExpenseTable } from './ExpenseTable';
import { useExpenseData } from '../hooks/useExpenseData';
import { exportToCSV } from '../utils/expenseUtils';

export const ExpenseMapper: React.FC = () => {
  const {
    expenses,
    filteredExpenses,
    expenseSummary,
    filters,
    syncStatus,
    syncWithGmail,
    updateFilters
  } = useExpenseData();

  const handleExportCSV = () => {
    const filename = `expenses-${filters.month}.csv`;
    exportToCSV(filteredExpenses, filename);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <ExpenseHeader
          syncStatus={syncStatus}
          onSyncGmail={syncWithGmail}
          onExportCSV={handleExportCSV}
          totalExpenses={expenses.length}
        />
        
        <ExpenseFilters
          filters={filters}
          onUpdateFilters={updateFilters}
        />
        
        <ExpenseSummary
          summary={expenseSummary}
        />
        
        <ExpenseTable
          expenses={filteredExpenses}
          selectedMonth={filters.month}
          isLoading={syncStatus.isLoading}
        />
      </div>
    </div>
  );
};

export default ExpenseMapper; 