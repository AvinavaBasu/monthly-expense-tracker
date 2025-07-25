import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Expense, SortConfig } from '../types/expense';
import { formatCurrency, formatDate, getMonthYearDisplay } from '../utils/expenseUtils';
import { BANK_COLORS, SOURCE_COLORS, SOURCE_LABELS } from '../utils/constants';

interface ExpenseTableProps {
  expenses: Expense[];
  selectedMonth: string;
  isLoading: boolean;
}

export const ExpenseTable: React.FC<ExpenseTableProps> = ({
  expenses,
  selectedMonth,
  isLoading
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });

  const getBankColorClass = (bank: string): string => {
    return BANK_COLORS[bank as keyof typeof BANK_COLORS] || BANK_COLORS.default;
  };

  const getSourceColorClass = (source: string): string => {
    return SOURCE_COLORS[source as keyof typeof SOURCE_COLORS] || SOURCE_COLORS.credit;
  };

  const getSourceLabel = (source: string): string => {
    return SOURCE_LABELS[source as keyof typeof SOURCE_LABELS] || source;
  };

  const handleSort = (key: 'date' | 'amount') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedExpenses = useMemo(() => {
    const sorted = [...expenses].sort((a, b) => {
      if (sortConfig.key === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortConfig.key === 'amount') {
        return sortConfig.direction === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      return 0;
    });
    return sorted;
  }, [expenses, sortConfig]);

  const SortIcon = ({ column }: { column: 'date' | 'amount' }) => {
    if (sortConfig.key !== column) {
      return <ChevronUp className="w-4 h-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="w-4 h-4 text-gray-600" /> : 
      <ChevronDown className="w-4 h-4 text-gray-600" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          Transactions for {getMonthYearDisplay(selectedMonth)}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center gap-1">
                  Date
                  <SortIcon column="date" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center justify-end gap-1">
                  Amount
                  <SortIcon column="amount" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedExpenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(expense.date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    expense.transactionType === 'credit' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {expense.transactionType === 'credit' ? '↗ Credit' : '↙ Debit'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {expense.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                  {expense.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                  {formatCurrency(expense.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${getBankColorClass(expense.bank)}`}>
                    {expense.bank}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <a
                    href={expense.gmailLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center px-2 py-1 text-xs rounded-full transition-colors cursor-pointer ${getSourceColorClass(expense.source)}`}
                  >
                    {getSourceLabel(expense.source)}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500">🔄 Loading expenses from Gmail...</p>
            <p className="text-sm text-gray-400 mt-2">
              Searching your emails for transactions...
            </p>
          </div>
        )}
        {!isLoading && sortedExpenses.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              No transactions found for the selected filters.
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Try changing the month, category, or transaction type filters, or click "Sync Gmail" to refresh data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}; 