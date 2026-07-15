import { useState, useEffect, useCallback, useRef } from 'react';
import type { ZodType } from 'zod';

// Use the installed zod (already a project dep) — ponytail: don't pull RHF
// for what a tiny validate-and-setStates helper covers.

/**
 * Tiny zod-driven form helper. Use this instead of pulling in react-hook-form
 * for the kinds of forms already in the app (10-30 fields, single submit).
 *
 *   const f = useZodForm({ name: '', age: '' }, z.object({ name: z.string().min(2), age: z.coerce.number().min(0) }));
 *   <input value={f.values.name} onChange={e => f.set('name', e.target.value)} />
 *   onClick={() => f.submit(async v => { await api.create(v); }))}
 */
export function useZodForm<T extends Record<string, unknown>>(
  initial: T,
  schema: ZodType<T>,
) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues(v => ({ ...v, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }, []);

  const reset = useCallback(() => {
    setValues(initial);
    setErrors({});
  }, [initial]);

  const validate = useCallback((): T | null => {
    const result = schema.safeParse(values);
    if (result.success) return result.data;
    const flat: Partial<Record<keyof T, string>> = {};
    for (const issue of result.error.issues) {
      const k = issue.path[0] as keyof T | undefined;
      if (k && !flat[k]) flat[k] = issue.message;
    }
    setErrors(flat);
    return null;
  }, [schema, values]);

  const submit = useCallback(
    async (action: (v: T) => Promise<void> | void) => {
      const v = validate();
      if (!v) return false;
      setSubmitting(true);
      try {
        await action(v);
        return true;
      } finally {
        setSubmitting(false);
      }
    },
    [validate],
  );

  return { values, errors, submitting, set, reset, validate, submit };
}

/**
 * Lightweight data-fetching hook.
 *
 * - `fetcher`  — async function that returns data from the API.
 * - `options.deps` — extra dependency array that triggers a re-fetch.
 * - `options.skip` — skip the fetch entirely (e.g. when a required param is missing).
 */
export interface UseApiQueryOptions {
  deps?: unknown[];
  skip?: boolean;
}

export interface UseApiQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApiQuery<T>(
  fetcher: () => Promise<T>,
  options: UseApiQueryOptions = {},
): UseApiQueryResult<T> {
  const { deps = [], skip = false } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (skip) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        const msg =
          err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          'Something went wrong';
        setError(msg);
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, ...deps]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Imperative mutation helper — not a hook, just a wrapper for
 * create / update / delete calls with consistent error extraction.
 */
export async function apiMutate<T>(
  mutator: () => Promise<T>,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await mutator();
    return { data, error: null };
  } catch (err: any) {
    const msg =
      err?.response?.data?.error?.message ||
      err?.response?.data?.message ||
      err?.message ||
      'Something went wrong';
    return { data: null, error: msg };
  }
}
