import React from 'react';
import { Calendar, Filter, CheckSquare, Square } from 'lucide-react';
import { ExpenseFilters as IExpenseFilters } from '../types/expense';
import { EXPENSE_CATEGORIES } from '../utils/constants';

interface ExpenseFiltersProps {
  filters: IExpenseFilters;
  onUpdateFilters: (filters: Partial<IExpenseFilters>) => void;
}

export const ExpenseFilters: React.FC<ExpenseFiltersProps> = ({
  filters,
  onUpdateFilters
}) => {
  const handleMonthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateFilters({ month: event.target.value });
  };

  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateFilters({ category: event.target.value });
  };

  const handleTransactionTypeChange = (type: 'debit' | 'credit') => {
    const currentTypes = filters.transactionTypes || ['debit', 'credit'];
    const updatedTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    
    onUpdateFilters({ transactionTypes: updatedTypes });
  };

  // Quick year selection helpers
  const handleYearSelect = (year: string) => {
    const currentMonth = filters.month.split('-')[1] || '01';
    onUpdateFilters({ month: `${year}-${currentMonth}` });
  };

  const selectedYear = filters.month.split('-')[0];
  const selectedMonth = filters.month.split('-')[1];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => handleYearSelect(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Month:</label>
            <select
              value={selectedMonth}
              onChange={(e) => onUpdateFilters({ month: `${selectedYear}-${e.target.value}` })}
              className="border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="01">January</option>
              <option value="02">February</option>
              <option value="03">March</option>
              <option value="04">April</option>
              <option value="05">May</option>
              <option value="06">June</option>
              <option value="07">July</option>
              <option value="08">August</option>
              <option value="09">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Category:</label>
            <select
              value={filters.category}
              onChange={handleCategoryChange}
              className="border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {EXPENSE_CATEGORIES.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4 pt-2 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Transaction Type:</label>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleTransactionTypeChange('debit')}
              className="flex items-center gap-2 px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              {(filters.transactionTypes || ['debit', 'credit']).includes('debit') ? (
                <CheckSquare className="w-4 h-4 text-red-600" />
              ) : (
                <Square className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-sm text-gray-700">Debit (Expenses)</span>
            </button>
            <button
              onClick={() => handleTransactionTypeChange('credit')}
              className="flex items-center gap-2 px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              {(filters.transactionTypes || ['debit', 'credit']).includes('credit') ? (
                <CheckSquare className="w-4 h-4 text-green-600" />
              ) : (
                <Square className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-sm text-gray-700">Credit (Income)</span>
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          💡 Data available from January 2024 to present. Select year first, then month.
        </div>
      </div>
    </div>
  );
}; 