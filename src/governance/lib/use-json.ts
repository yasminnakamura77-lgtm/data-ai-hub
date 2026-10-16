import { useEffect, useState } from 'react';

import type { AsyncStatus } from './use-sql';

export interface JsonResult<T> {
  data: T | null;
  status: AsyncStatus;
  error: unknown;
}

/**
 * GET a JSON endpoint. Same status/error shape as useSql, for the same
 * reason: Card/ChartCard already know how to draw loading and error states
 * from it. Pass `null` to hold off.
 *
 *   const source = useJson<SourceDetail>(`/api/catalogue/sources/${id}`);
 */
export function useJson<T>(url: string | null): JsonResult<T> {
  const [state, setState] = useState<Omit<JsonResult<T>, never>>({
    data: null,
    status: 'initial',
    error: null,
  });

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();

    setState((prev) => ({ ...prev, status: prev.status === 'ready' ? 'updating' : 'initial' }));

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.detail ?? `Request failed (${response.status})`);
        return body as T;
      })
      .then((data) => setState({ data, status: 'ready', error: null }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ data: null, status: 'error', error });
      });

    return () => controller.abort();
  }, [url]);

  return state;
}
