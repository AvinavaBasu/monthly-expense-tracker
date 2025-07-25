import { useState, useEffect, useMemo } from 'react';
import { Expense, ExpenseFilters, GmailSyncStatus } from '../types/expense';
import { SecureGmailService as GmailService } from '../services/mcpGmailService';
import { filterExpenses, calculateExpenseSummary } from '../utils/expenseUtils';

export const useExpenseData = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filters, setFilters] = useState<ExpenseFilters>({
    month: new Date().toISOString().slice(0, 7), // Default to current month
    category: 'all',
    transactionTypes: ['debit', 'credit'] // Default to both transaction types
  });
  const [syncStatus, setSyncStatus] = useState<GmailSyncStatus>({
    isLoading: false,
    lastSync: null,
    error: null
  });

  // Cache to store fetched data by month
  const [expenseCache, setExpenseCache] = useState<Map<string, {
    data: Expense[];
    fetchedAt: Date;
  }>>(new Map());

  // Initialize Gmail service instance
  const gmailService = useMemo(() => new GmailService(), []);

  // Calculate date range for selected month
  const getMonthDateRange = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0); // Last day of month
    
    return {
      dateFrom: startDate.toISOString().split('T')[0],
      dateTo: endDate.toISOString().split('T')[0]
    };
  };

  // Check if cached data is still fresh (within 5 minutes)
  const isCacheValid = (fetchedAt: Date): boolean => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    return fetchedAt > fiveMinutesAgo;
  };

  // Fetch data for a specific month (with caching)
  const fetchMonthData = async (monthStr: string, forceRefresh: boolean = false) => {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = expenseCache.get(monthStr);
      if (cachedData && isCacheValid(cachedData.fetchedAt)) {
        console.log(`[Cache] Using cached data for ${monthStr}`);
        setExpenses(cachedData.data);
        setSyncStatus(prev => ({
          ...prev,
          lastSync: cachedData.fetchedAt,
          error: null
        }));
        return;
      }
    }

    console.log(`[API] Fetching fresh data for ${monthStr}`);
    setSyncStatus(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Check if already authenticated
      const isAuth = await gmailService.isAuthenticated();
      
      if (!isAuth) {
        setSyncStatus(prev => ({
          ...prev,
          isLoading: false,
          error: 'Please authenticate with Gmail first by clicking "Sync Gmail".'
        }));
        return;
      }
      
      // Fetch expenses for the specified month
      const { dateFrom, dateTo } = getMonthDateRange(monthStr);
      
      const fetchedExpenses = await gmailService.fetchExpenses({
        maxResults: 100,
        dateFrom: dateFrom,
        dateTo: dateTo
      });
      
      // Update cache
      const now = new Date();
      setExpenseCache(prev => {
        const newCache = new Map(prev);
        newCache.set(monthStr, {
          data: fetchedExpenses,
          fetchedAt: now
        });
        return newCache;
      });
      
      setExpenses(fetchedExpenses);
      setSyncStatus(prev => ({
        ...prev,
        isLoading: false,
        lastSync: now,
        error: null
      }));
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch data for selected month'
      }));
      console.error('Month data fetch failed:', error);
    }
  };

  // Filter expenses based on current filters
  const filteredExpenses = useMemo(() => {
    return filterExpenses(expenses, filters);
  }, [expenses, filters]);

  // Calculate summary statistics
  const expenseSummary = useMemo(() => {
    return calculateExpenseSummary(filteredExpenses);
  }, [filteredExpenses]);

  // Sync with Gmail for the selected month (force refresh)
  const syncWithGmail = async () => {
    setSyncStatus(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Check if already authenticated
      const isAuth = await gmailService.isAuthenticated();
      
      if (!isAuth) {
        // Get auth URL and redirect user
        const authUrl = await gmailService.getAuthUrl();
        console.log('[Expense Tracker] Redirecting to Gmail authentication...');
        
        // Open OAuth in new window
        window.open(authUrl, '_blank', 'width=600,height=600');
        
        setSyncStatus(prev => ({
          ...prev,
          isLoading: false,
          error: 'Please complete Gmail authentication in the popup window, then try again.'
        }));
        return;
      }
      
      // Force refresh the currently selected month (bypass cache)
      await fetchMonthData(filters.month, true);
      
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to sync with Gmail'
      }));
      console.error('Gmail sync failed:', error);
    }
  };

  // Clear all cached data
  const clearCache = () => {
    setExpenseCache(new Map());
    console.log('[Cache] All cached data cleared');
  };

  // Get cache statistics
  const getCacheStats = () => {
    return {
      totalCachedMonths: expenseCache.size,
      cachedMonths: Array.from(expenseCache.keys()),
      totalCachedExpenses: Array.from(expenseCache.values()).reduce((sum, cache) => sum + cache.data.length, 0)
    };
  };

  // Update filters and fetch data if month changes
  const updateFilters = (newFilters: Partial<ExpenseFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    
    // If month changed, fetch data for the new month (use cache if available)
    if (newFilters.month && newFilters.month !== filters.month) {
      fetchMonthData(newFilters.month, false); // Don't force refresh on month change
    }
  };

  // Load data for current month on mount (if authenticated)
  useEffect(() => {
    const initializeData = async () => {
      try {
        const isAuth = await gmailService.isAuthenticated();
        if (isAuth) {
          // If already authenticated, load current month's data
          const currentMonth = new Date().toISOString().slice(0, 7);
          fetchMonthData(currentMonth);
        }
      } catch (error) {
        console.log('Authentication check failed on mount:', error);
      }
    };
    
    initializeData();
  }, []); // Run only once on mount

  return {
    expenses,
    filteredExpenses,
    expenseSummary,
    filters,
    syncStatus,
    syncWithGmail,
    updateFilters,
    // Cache management (for debugging/advanced use)
    clearCache,
    getCacheStats
  };
}; 