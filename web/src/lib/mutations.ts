import { useState, useCallback } from 'react';

/**
 * Generic mutation hook with optional optimistic update support.
 */
export interface UseMutationOptions<TData, TVariables, TOptimisticData> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onMutate?: (variables: TVariables) => Promise<TOptimisticData | void>;
  onError?: (error: Error, variables: TVariables, optimisticData?: TOptimisticData) => void;
  onSuccess?: (data: TData, variables: TVariables, optimisticData?: TOptimisticData) => void;
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
}

export interface UseMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData | null>;
  mutateAsync: (variables: TVariables) => Promise<TData | null>;
  data: TData | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
}

export function useMutation<TData, TVariables, TOptimisticData = unknown>(
  options: UseMutationOptions<TData, TVariables, TOptimisticData>
): UseMutationResult<TData, TVariables> {
  const { mutationFn, onMutate, onError, onSuccess, onSettled } = options;

  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData | null> => {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      setIsError(false);

      let optimisticData: TOptimisticData | undefined = undefined;
      if (onMutate) {
        const val = await onMutate(variables);
        if (val !== undefined) optimisticData = val;
      }

      try {
        const result = await mutationFn(variables);
        setData(result);
        setIsSuccess(true);
        onSuccess?.(result, variables, optimisticData);
        return result;
      } catch (err: any) {
        const msg =
          err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          'Something went wrong';
        setError(msg);
        setIsError(true);
        onError?.(new Error(msg), variables, optimisticData);
        return null;
      } finally {
        setIsLoading(false);
        onSettled?.(data ?? undefined, error ? new Error(error) : null, variables);
      }
    },
    [mutationFn, onMutate, onError, onSuccess, onSettled, data, error]
  );

  const mutate = useCallback(
    (variables: TVariables) => {
      return mutateAsync(variables);
    },
    [mutateAsync]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
    setIsSuccess(false);
    setIsError(false);
  }, []);

  return { mutate, mutateAsync, data, error, isLoading, isSuccess, isError, reset };
}

/**
 * Optimistic update helper for array-based lists.
 * Returns a function that applies the optimistic update to a list.
 */
export function createOptimisticUpdater<T>() {
  return {
    // Add new item to list
    add: (list: T[] | undefined, newItem: T): T[] => {
      return list ? [newItem, ...list] : [newItem];
    },

    // Update existing item
    update: (list: T[] | undefined, id: string | number, updates: Partial<T>): T[] => {
      if (!list) return [];
      return list.map(item =>
        (item as any).id === id ? { ...item, ...updates } : item
      );
    },

    // Remove item from list
    remove: (list: T[] | undefined, id: string | number): T[] => {
      if (!list) return [];
      return list.filter(item => (item as any).id !== id);
    },
  };
}