// Small fetch helpers: timeouts, readable errors, bounded concurrency.

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
/** In Node (the snapshot job) identify ourselves: SEC wants a contact; other hosts get a browser UA. */
function nodeHeaders(url: string): Record<string, string> {
  if (typeof window !== 'undefined') return {};
  const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
  if (/sec\.gov/.test(url)) return { 'User-Agent': env.SEC_USER_AGENT || 'Parallax open-source terminal (github.com/ldiazbusquets/parallax)', 'Accept-Encoding': 'identity' };
  const base = { 'User-Agent': BROWSER_UA, Accept: 'application/json, text/plain, */*', 'Accept-Language': 'en-US,en;q=0.9' };
  // Yahoo wants to see a finance.yahoo.com referer from servers; other hosts (e.g. imf.org) refuse a mismatched one.
  return /yahoo\.com/.test(url) ? { ...base, Referer: 'https://finance.yahoo.com/' } : base;
}

// The SEC allows ~10 requests/second per client. In the snapshot job, space every sec.gov request and
// retry rate-limit replies, so building many company pages never trips the limit.
let secNext = 0;
async function secPace() {
  const now = Date.now(), wait = Math.max(0, secNext - now);
  secNext = Math.max(now, secNext) + 140;
  if (wait) await new Promise((r) => setTimeout(r, wait));
}

export async function getText(url: string, init: RequestInit & { timeout?: number } = {}): Promise<string> {
  if (typeof window === 'undefined' && /sec\.gov/.test(url)) {
    for (let attempt = 0; ; attempt++) {
      await secPace();
      try { return await fetchText(url, init); } catch (e) {
        if (!(e instanceof HttpError && e.status === 429) || attempt >= 3) throw e;
        secNext = Date.now() + 5000 * (attempt + 1); // back off everyone
      }
    }
  }
  return fetchText(url, init);
}

async function fetchText(url: string, init: RequestInit & { timeout?: number } = {}): Promise<string> {
  const { timeout = 15000, ...rest } = init;
  rest.headers = { ...nodeHeaders(url), ...(rest.headers as Record<string, string> | undefined) };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(url, { ...rest, signal: ctl.signal });
    if (!res.ok) {
      const hint = res.status === 429 ? 'rate limited, will retry' : res.status === 401 ? 'unauthorized (check the API key)' : res.status === 403 ? 'refused by the source' : res.statusText;
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
