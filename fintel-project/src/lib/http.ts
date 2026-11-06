// Small fetch helpers: timeouts, readable errors, bounded concurrency.

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function getText(url: string, init: RequestInit & { timeout?: number } = {}): Promise<string> {
  const { timeout = 15000, ...rest } = init;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(url, { ...rest, signal: ctl.signal });
    if (!res.ok) {
      const hint = res.status === 429 ? 'rate limited, will retry' : res.status === 401 || res.status === 403 ? 'refused (check the API key)' : res.statusText;
      throw new HttpError(res.status, `HTTP ${res.status}${hint ? ' · ' + hint : ''}`);
    }
    return await res.text();
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('timed out');
    if (e instanceof TypeError) throw new Error('network error (offline or blocked)');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function getJSON<T>(url: string, init?: RequestInit & { timeout?: number }): Promise<T> {
  const text = await getText(url, init);
  try { return JSON.parse(text) as T; } catch { throw new Error('unexpected response (not JSON)'); }
}

/** Run fn over items with at most n in flight. Results keep input order; failures become undefined. */
export async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<(R | undefined)[]> {
  const out: (R | undefined)[] = new Array(items.length);
  let i = 0;
  const errors: unknown[] = [];
  async function worker() {
    while (i < items.length) {
      const k = i++;
      try { out[k] = await fn(items[k]); } catch (e) { errors.push(e); out[k] = undefined; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  if (items.length && errors.length === items.length) throw errors[0];
  return out;
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
