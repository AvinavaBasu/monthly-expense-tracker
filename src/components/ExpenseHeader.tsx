import React from 'react';
import { Upload, Download } from 'lucide-react';
import { GmailSyncStatus } from '../types/expense';

interface ExpenseHeaderProps {
  syncStatus: GmailSyncStatus;
  onSyncGmail: () => void;
  onExportCSV: () => void;
  totalExpenses: number;
}

export const ExpenseHeader: React.FC<ExpenseHeaderProps> = ({
  syncStatus,
  onSyncGmail,
  onExportCSV,
  totalExpenses
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Monthly Expense Mapper
          </h1>
          <p className="text-gray-600">
            Track and analyze your expenses from Gmail in real-time
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3">
          <button
            onClick={onSyncGmail}
            disabled={syncStatus.isLoading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            {syncStatus.isLoading ? 'Syncing...' : 'Sync Gmail'}
          </button>
          <button
            onClick={onExportCSV}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>
      {syncStatus.lastSync && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-500">
          <span>Last synced: {syncStatus.lastSync.toLocaleString()}</span>
          <span>•</span>
          <span>{totalExpenses} real transactions from Gmail</span>
          <span>•</span>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            100% Real Data
          </span>
        </div>
      )}
      {syncStatus.error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="text-sm font-medium">Error: {syncStatus.error}</p>
        </div>
      )}
    </div>
  );
}; 