import { useCallback, useEffect, useState } from 'react';

export type Row = Record<string, any>;

export type AsyncStatus = 'initial' | 'updating' | 'ready' | 'error';

export interface SqlResult {
  rows: Row[];
  columns: string[];
  truncated: boolean;
  status: AsyncStatus;
  error: unknown;
  refresh: () => void;
}

/** Run one read-only query against Snowflake. */
export async function runSql(sql: string, signal?: AbortSignal) {
  const response = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql }),
    signal,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.detail ?? `Query failed (${response.status})`);
  }
  return body as { columns: string[]; rows: Row[]; truncated: boolean };
}

/**
 * Run a query and re-run it whenever the SQL string changes.
 * Pass `null` to hold off (e.g. a filter isn't chosen yet).
 *
 *   const sales = useSql(`select REGION, sum(AMOUNT) as TOTAL from ... group by 1`);
 *   <BarChart labels={sales.rows.map(r => r.REGION)}
 *             series={[{ label: 'Total', data: sales.rows.map(r => r.TOTAL) }]} />
 */
export function useSql(sql: string | null): SqlResult {
  const [state, setState] = useState<Omit<SqlResult, 'refresh'>>({
    rows: [],
    columns: [],
    truncated: false,
    status: 'initial',
    error: null,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!sql) return;
    const controller = new AbortController();

    // 'initial' means nothing has ever loaded, which is what draws skeletons;
    // a re-run keeps the old rows on screen and just shows the spinner.
    setState((prev) => ({ ...prev, status: prev.status === 'ready' ? 'updating' : 'initial' }));

    runSql(sql, controller.signal)
      .then((result) => setState({ ...result, status: 'ready', error: null }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ rows: [], columns: [], truncated: false, status: 'error', error });
      });

    return () => controller.abort();
  }, [sql, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, refresh };
}
