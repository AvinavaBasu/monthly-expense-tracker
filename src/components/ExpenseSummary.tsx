import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';
import { ExpenseSummary as IExpenseSummary } from '../types/expense';
import { formatCurrency } from '../utils/expenseUtils';

interface ExpenseSummaryProps {
  summary: IExpenseSummary;
}

export const ExpenseSummary: React.FC<ExpenseSummaryProps> = ({ summary }) => {
  const summaryCards = [
    {
      title: 'Net Total',
      value: formatCurrency(summary.netAmount),
      icon: DollarSign,
      color: summary.netAmount >= 0 ? 'text-green-600' : 'text-red-600'
    },
    {
      title: 'Total Credit',
      value: formatCurrency(summary.totalCredit),
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      title: 'Total Debit',
      value: formatCurrency(summary.totalDebit),
      icon: TrendingDown,
      color: 'text-red-600'
    },
    {
      title: 'Categories',
      value: summary.categoriesCount.toString(),
      icon: CreditCard,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {summaryCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Icon className={`w-8 h-8 ${card.color}`} />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}; 