/**
 * API Hook for VytalWatch
 *
 * Custom hook for making API requests with loading and error states.
 * @module hooks/useApi
 */

'use client';

import { useState, useCallback } from 'react';
import { ApiClientError } from '@/utils/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  errors: Record<string, string[]> | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook for making API requests with automatic state management
 *
 * @example
 * ```tsx
 * const { data, loading, error, execute } = useApi(api.patients.list);
 *
 * useEffect(() => {
 *   execute({ status: 'active' });
 * }, []);
 * ```
 */
export function useApi<T>(
  apiFunction: (...args: any[]) => Promise<T>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
    errors: null,
  });

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null, errors: null }));

      try {
        const result = await apiFunction(...args);
        setState({ data: result, loading: false, error: null, errors: null });
        return result;
      } catch (err) {
        if (err instanceof ApiClientError) {
          setState({
            data: null,
            loading: false,
            error: err.message,
            errors: err.errors || null,
          });
        } else {
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : 'An error occurred',
            errors: null,
          });
        }
        return null;
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null, errors: null });
  }, []);

  return { ...state, execute, reset };
}

/**
 * Hook for mutations (POST, PUT, DELETE) with optimistic updates
 */
export function useMutation<T, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<T>,
  options?: {
    onSuccess?: (data: T, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    onSettled?: (data: T | null, error: Error | null, variables: TVariables) => void;
  }
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
    errors: null,
  });

  const mutate = useCallback(
    async (variables: TVariables): Promise<T | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null, errors: null }));

      try {
        const result = await mutationFn(variables);
        setState({ data: result, loading: false, error: null, errors: null });
        options?.onSuccess?.(result, variables);
        options?.onSettled?.(result, null, variables);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('An error occurred');
        if (err instanceof ApiClientError) {
          setState({
            data: null,
            loading: false,
            error: err.message,
            errors: err.errors || null,
          });
        } else {
          setState({
            data: null,
            loading: false,
            error: error.message,
            errors: null,
          });
        }
        options?.onError?.(error, variables);
        options?.onSettled?.(null, error, variables);
        return null;
      }
    },
    [mutationFn, options]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null, errors: null });
  }, []);

  return { ...state, mutate, reset };
}

/**
 * Hook for paginated API requests
 */
export function usePaginatedApi<T>(
  apiFunction: (page: number, limit: number) => Promise<{ data: T[]; total: number; page: number }>
) {
  const [state, setState] = useState<{
    data: T[];
    total: number;
    page: number;
    loading: boolean;
    error: string | null;
  }>({
    data: [],
    total: 0,
    page: 1,
    loading: false,
    error: null,
  });

  const fetchPage = useCallback(
    async (page: number, limit: number = 10) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const result = await apiFunction(page, limit);
        setState({
          data: result.data,
          total: result.total,
          page: result.page,
          loading: false,
          error: null,
        });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'An error occurred',
        }));
      }
    },
    [apiFunction]
  );

  const nextPage = useCallback(() => {
    if (!state.loading) {
      fetchPage(state.page + 1);
    }
  }, [state.loading, state.page, fetchPage]);

  const prevPage = useCallback(() => {
    if (!state.loading && state.page > 1) {
      fetchPage(state.page - 1);
    }
  }, [state.loading, state.page, fetchPage]);

  return {
    ...state,
    fetchPage,
    nextPage,
    prevPage,
    hasMore: state.data.length < state.total,
  };
}

export default useApi;
