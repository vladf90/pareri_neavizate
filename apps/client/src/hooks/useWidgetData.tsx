import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL, REFRESH_INTERVALS } from "@/config";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseWidgetDataOptions {
  /** Refresh interval in milliseconds. Default: 5 minutes (300000ms) */
  refreshInterval?: number;
  /** Whether to auto-fetch on mount. Default: true */
  autoFetch?: boolean;
  /** Dependencies that trigger a refetch when changed */
  deps?: unknown[];
}

/**
 * Custom hook for fetching widget data from the API
 * Provides consistent error handling, loading states, and auto-refresh
 *
 * @param endpoint - API endpoint path (e.g., "/api/widgets/standings")
 * @param options - Configuration options
 * @returns Object with data, loading, error states and refetch function
 *
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useWidgetData<Standings>("/api/widgets/standings");
 *
 * if (loading) return <Spinner />;
 * if (error) return <ErrorMessage message={error} />;
 * return <StandingsTable data={data} />;
 * ```
 */
export function useWidgetData<T>(endpoint: string, options: UseWidgetDataOptions = {}) {
  const { refreshInterval = REFRESH_INTERVALS.WIDGET_DATA, autoFetch = true, deps = [] } = options;

  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: autoFetch,
    error: null,
  });

  const fetchData = useCallback(async () => {
    try {
      // Don't set loading to true if we already have data (background refresh)
      setState((prev) => ({ ...prev, loading: !prev.data, error: null }));

      const response = await fetch(`${API_BASE_URL}${endpoint}`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error occurred",
      });
    }
  }, [endpoint]);

  // Initial fetch and dependency-based refetch
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, autoFetch, ...deps]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  return {
    ...state,
    refetch: fetchData,
  };
}

/**
 * Wrapper component for displaying loading/error states
 */
export function WidgetStateWrapper({
  loading,
  error,
  children,
  width = "1920px",
  height = "1080px",
  loadingMessage = "Loading...",
  emptyMessage = "No data available",
}: {
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
  width?: string;
  height?: string;
  loadingMessage?: string;
  emptyMessage?: string;
}) {
  if (loading) {
    return (
      <div className="bg-transparent flex items-center justify-center" style={{ width, height }}>
        <div className="text-white/50 flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          {loadingMessage}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-transparent flex items-center justify-center" style={{ width, height }}>
        <div className="bg-red-500/20 text-red-400 px-6 py-4 rounded-lg">
          {error || emptyMessage}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
