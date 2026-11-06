import { describe, expect, it } from 'vitest';
import { buildNetwork, flowMetric, instantMetric, mergeFacts, parseForm4, tidyName, type CompanyData, type Fact } from './company';

const f = (start: string | undefined, end: string, val: number, form = '10-Q', filed = end): Fact => ({ start, end, val, form, filed });

describe('XBRL financials', () => {
  it('prefers the first concept in the list and the latest filing within it', () => {
    const doc = { cik: 1, entityName: 'X', facts: { 'us-gaap': {
      A: { units: { USD: [f('2025-01-01', '2025-12-31', 100, '10-K', '2026-02-01'), f('2025-01-01', '2025-12-31', 105, '10-K', '2026-03-01')] } },
      B: { units: { USD: [f('2025-01-01', '2025-12-31', 999, '10-K'), f('2024-01-01', '2024-12-31', 80, '10-K')] } },
    } } };
    const m = mergeFacts(doc, ['A', 'B']);
    expect(m.map((x) => x.val)).toEqual([80, 105]); // 2024 only in B; 2025 from A, restated value
  });
  it('computes TTM as last fiscal year + current YTD − prior-year YTD', () => {
    const facts = [
      f('2024-01-01', '2024-12-31', 1000, '10-K'), f('2025-01-01', '2025-12-31', 1200, '10-K'),
      f('2025-01-01', '2025-09-30', 870), f('2026-01-01', '2026-09-30', 1050),
      f('2026-07-01', '2026-09-30', 380),
    ].sort((a, b) => a.end.localeCompare(b.end));
    const m = flowMetric(facts);
    expect(m.annual.map((p) => p.val)).toEqual([1000, 1200]);
    expect(m.ttm?.val).toBe(1200 + 1050 - 870);
    expect(m.ttm?.end).toBe('2026-09-30');
    expect(m.quarters.map((q) => q.val)).toEqual([380]);
  });
  it('falls back to the last fiscal year when no YTD comparison exists', () => {
    expect(flowMetric([f('2025-01-01', '2025-12-31', 1200, '10-K')]).ttm?.val).toBe(1200);
  });
  it('takes balance-sheet items at the latest date', () => {
    const m = instantMetric([f(undefined, '2025-12-31', 50, '10-K'), f(undefined, '2026-09-30', 70)]);
    expect(m.latest?.val).toBe(70);
    expect(m.annual.map((p) => p.val)).toEqual([50]);
  });
});

describe('Form 4', () => {
  const xml = `<ownershipDocument><reportingOwner><reportingOwnerId><rptOwnerCik>0001197649</rptOwnerCik><rptOwnerName>HUANG JEN HSUN</rptOwnerName></reportingOwnerId>
  <reportingOwnerRelationship><isDirector>1</isDirector><isOfficer>1</isOfficer><officerTitle>President and CEO</officerTitle><isTenPercentOwner>0</isTenPercentOwner></reportingOwnerRelationship></reportingOwner>
  <nonDerivativeTable><nonDerivativeTransaction><transactionDate><value>2026-10-01</value></transactionDate><transactionCoding><transactionFormType>4</transactionFormType><transactionCode>S</transactionCode></transactionCoding>
  <transactionAmounts><transactionShares><value>120000</value></transactionShares><transactionPricePerShare><value>182.55</value></transactionPricePerShare><transactionAcquiredDisposedCode><value>D</value></transactionAcquiredDisposedCode></transactionAmounts>
  <postTransactionAmounts><sharesOwnedFollowingTransaction><value>75000000</value></sharesOwnedFollowingTransaction></postTransactionAmounts></nonDerivativeTransaction></nonDerivativeTable></ownershipDocument>`;
  it('extracts owner, role and transaction', () => {
    const { tx, people } = parseForm4(xml, 'L');
    expect(people[0]).toMatchObject({ cik: '0001197649', name: 'Jen Hsun Huang', role: 'President and CEO, Director', isDirector: true });
    expect(tx[0]).toMatchObject({ date: '2026-10-01', code: 'S', codeLabel: 'Sale', shares: 120000, price: 182.55, acquired: false, after: 75000000 });
  });
  it('tidies person names but leaves entities alone', () => {
    expect(tidyName('SMITH JOHN A')).toBe('John A Smith');
    expect(tidyName('VANGUARD GROUP INC')).toBe('VANGUARD GROUP INC');
  });
});

describe('network', () => {
  it('links people who sit at more than one company', () => {
    const co = (ticker: string, people: [string, string][]) => ({ ticker, name: ticker, industry: '', people: people.map(([cik, name]) => ({ cik, name, role: 'Director', isDirector: true, isOfficer: false, tenPct: false })) }) as unknown as CompanyData;
    const n = buildNetwork([co('AAA', [['1', 'Ann'], ['2', 'Bob']]), co('BBB', [['1', 'Ann'], ['3', 'Cy']])]);
    expect(n.people[0]).toMatchObject({ name: 'Ann', links: [{ ticker: 'AAA' }, { ticker: 'BBB' }] });
    expect(n.people.filter((p) => p.links.length > 1)).toHaveLength(1);
  });
});
