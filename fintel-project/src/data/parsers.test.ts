import { describe, expect, it } from 'vitest';
import { parseFredCsv, yoy, yoySeries, diffSeries, atOrBefore } from './fred';
import { parseSpark, parseChart } from './yahoo';
import { cotRows, toAuction, tone } from './sources';

describe('FRED CSV', () => {
  const csv = 'observation_date,UNRATE\n2025-08-01,4.3\n2025-09-01,4.4\n2025-10-01,\n2025-11-01,4.5\n2025-12-01,.\n';
  it('skips blank and "." observations instead of treating them as zero', () => {
    expect(parseFredCsv(csv)).toEqual([{ d: '2025-08-01', v: 4.3 }, { d: '2025-09-01', v: 4.4 }, { d: '2025-11-01', v: 4.5 }]);
  });
  it('computes year-over-year against the same month a year earlier', () => {
    const s = Array.from({ length: 14 }, (_, i) => ({ d: `${2025 + Math.floor((i + 8) / 12)}-${String(((i + 8) % 12) + 1).padStart(2, '0')}-01`, v: 100 + i }));
    const r = yoy(s)!;
    expect(r.d).toBe(s[13].d);
    expect(r.v).toBeCloseTo((113 / 101 - 1) * 100, 6);
    expect(yoySeries(s, 2).length).toBe(2);
  });
  it('returns no YoY when the year-earlier month is missing', () => {
    expect(yoy([{ d: '2026-01-01', v: 1 }])).toBeUndefined();
  });
  it('diffs and looks up by date', () => {
    const s = [{ d: '2026-01-01', v: 10 }, { d: '2026-02-01', v: 13 }];
    expect(diffSeries(s)).toEqual([{ d: '2026-02-01', v: 3 }]);
    expect(atOrBefore(s, '2026-01-20')?.v).toBe(10);
    expect(atOrBefore(s, '2025-12-31')).toBeUndefined();
  });
});

describe('Yahoo', () => {
  const sparkJson = { spark: { error: null, result: [
    { symbol: 'SPY', response: [{ meta: { symbol: 'SPY', shortName: 'SPDR S&P 500', currency: 'USD', regularMarketPrice: 736.25, previousClose: 733, chartPreviousClose: 733, regularMarketTime: 1793988070, fiftyTwoWeekHigh: 781.62, fiftyTwoWeekLow: 629.28 }, timestamp: [1, 2, 3], indicators: { quote: [{ close: [734, null, 736.25] }] } }] },
    { symbol: 'BAD', response: [{ meta: { symbol: 'BAD' } }] },
  ] } };
  it('parses spark quotes and daily change vs previous close', () => {
    const q = parseSpark(sparkJson as never);
    expect(Object.keys(q)).toEqual(['SPY']);
    expect(q.SPY.change).toBeCloseTo(3.25);
    expect(q.SPY.changePct).toBeCloseTo((3.25 / 733) * 100);
    expect(q.SPY.spark).toEqual([734, 736.25]);
    expect(q.SPY.time).toBe(1793988070000);
  });
  it('parses chart bars and drops null closes', () => {
    const b = parseChart({ chart: { error: null, result: [{ meta: { symbol: 'X', chartPreviousClose: 9 }, timestamp: [10, 20, 30], indicators: { quote: [{ close: [1, null, 3] }] } }] } } as never);
    expect(b.t).toEqual([10000, 30000]);
    expect(b.c).toEqual([1, 3]);
  });
  it('throws a readable error for unknown symbols', () => {
    expect(() => parseChart({ chart: { result: null, error: { description: 'No data found, symbol may be delisted' } } } as never)).toThrow(/delisted/);
  });
});

describe('Treasury & CFTC', () => {
  it('uses high yield for coupons and investment rate for bills', () => {
    expect(toAuction({ security_type: 'Note', security_term: '10-Year', auction_date: '2026-10-08', issue_date: '', cusip: 'a', high_yield: '4.512', high_discnt_rate: null, high_investment_rate: null, bid_to_cover_ratio: '2.61', offering_amt: '39000000000', reopening: 'No' }))
      .toMatchObject({ rate: 4.512, rateKind: 'yield', btc: 2.61 });
    expect(toAuction({ security_type: 'Bill', security_term: '4-Week', auction_date: '2026-10-15', issue_date: '', cusip: 'b', high_yield: 'null', high_discnt_rate: '4.000000', high_investment_rate: '4.068000', bid_to_cover_ratio: '2.56', offering_amt: null, reopening: 'Yes' }))
      .toMatchObject({ rate: 4.068, rateKind: 'discount', reopening: true });
  });
  it('computes speculative net, weekly change and percentile', () => {
    const rows = [3, 1, 2].map((k, i) => ({ cftc_contract_market_code: '088691', report_date_as_yyyy_mm_dd: `2026-10-0${i + 1}T00:00:00.000`, open_interest_all: '1000', m_money_positions_long_all: String(100 * k), m_money_positions_short_all: '50' }));
    const [g] = cotRows(rows, 'dis');
    expect(g.market.label).toBe('Gold');
    expect(g.net).toBe(150);
    expect(g.change).toBe(100); // nets 250, 50, 150
    expect(g.netPctOi).toBeCloseTo(15);
    expect(g.pctile).toBeNull(); // fewer than 20 weeks: no percentile
  });
});

describe('headline tone', () => {
  it('scores words, clamped to -1..1', () => {
    expect(tone('Stocks rally to record as inflation cools')).toBe(1);
    expect(tone('Shares plunge on recession fears')).toBe(-1);
    expect(tone('Fed holds rates steady')).toBe(0);
  });
});

describe('store', () => {
  it('re-runs a source that was requested while a fetch was in flight, and keeps data when a refresh fails', async () => {
    const { register, run, stateOf } = await import('./store');
    let calls = 0, fail = false;
    register({ id: 'test:again', label: 't', provider: 'p', every: 1e9, fetch: async () => { calls++; await new Promise((r) => setTimeout(r, 5)); if (fail) throw new Error('boom'); return calls; } });
    const first = run('test:again');
    void run('test:again');            // requested mid-flight: must not be dropped
    await first;
    await new Promise((r) => setTimeout(r, 30));
    expect(calls).toBe(2);
    expect(stateOf<number>('test:again')).toMatchObject({ status: 'live', data: 2 });
    fail = true;
    await run('test:again');
    expect(stateOf<number>('test:again')).toMatchObject({ status: 'stale', data: 2, error: 'boom' });
  });
});
