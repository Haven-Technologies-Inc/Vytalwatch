/**
 * VitalWatch API Query Hook
 * A hook that wraps useApi with auto-fetch on mount, refetch, and optional polling
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiError } from '@/services/api/client';

interface UseApiQueryOptions<T> {
  /** Whether to fetch immediately on mount (default: true) */
  enabled?: boolean;
  /** Polling interval in milliseconds. Pass 0 or undefined to disable polling */
  pollingInterval?: number;
  /** Callback when data is fetched successfully */
  onSuccess?: (data: T) => void;
  /** Callback when an error occurs */
  onError?: (error: ApiError) => void;
  /** Dependencies that trigger a refetch when changed */
  deps?: unknown[];
}

interface UseApiQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  /** Raw ApiError object if available */
  apiError: ApiError | null;
  /** Manually trigger a refetch */
  refetch: () => Promise<void>;
  /** Whether a background refetch is in progress (not the initial load) */
  isRefetching: boolean;
}

export function useApiQuery<T>(
  apiCall: () => Promise<T>,
  options: UseApiQueryOptions<T> = {}
): UseApiQueryResult<T> {
  const {
    enabled = true,
    pollingInterval,
    onSuccess,
    onError,
    deps = [],
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefetching, setIsRefetching] = useState(false);
  const [apiError, setApiError] = useState<ApiError | null>(null);

  const mountedRef = useRef(true);
  const hasFetchedRef = useRef(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stabilize callbacks with refs to avoid re-render loops
  const apiCallRef = useRef(apiCall);
  apiCallRef.current = apiCall;
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const fetchData = useCallback(async (isBackground = false) => {
    if (!mountedRef.current) return;

    if (isBackground) {
      setIsRefetching(true);
    } else {
      setIsLoading(true);
    }
    setApiError(null);

    try {
      const result = await apiCallRef.current();
      if (mountedRef.current) {
        setData(result);
        setIsLoading(false);
        setIsRefetching(false);
        onSuccessRef.current?.(result);
      }
    } catch (error) {
      if (mountedRef.current) {
        const err =
          error instanceof ApiError
            ? error
            : new ApiError(
                error instanceof Error ? error.message : 'Unknown error',
                'UNKNOWN',
                500
              );
        setApiError(err);
        setIsLoading(false);
        setIsRefetching(false);
        onErrorRef.current?.(err);
      }
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchData(hasFetchedRef.current);
  }, [fetchData]);

  // Auto-fetch on mount and when deps change
  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      fetchData(hasFetchedRef.current);
      hasFetchedRef.current = true;
    }

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, fetchData, ...deps]);

  // Polling
  useEffect(() => {
    if (pollingInterval && pollingInterval > 0 && enabled) {
      pollingRef.current = setInterval(() => {
        fetchData(true);
      }, pollingInterval);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [pollingInterval, enabled, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  return {
    data,
    isLoading,
    error: apiError?.message || null,
    apiError,
    refetch,
    isRefetching,
  };
}
