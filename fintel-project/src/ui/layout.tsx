import { useEffect, useState, type ReactNode } from 'react';

// Panel layout: an ordered list of panels with grid widths. Presets plus a saved custom layout.

export type Span = 'c3' | 'c4' | 'c6' | 'c8' | 'c12';
export interface Item { key: string; span: Span }
export interface Layout { name: string; items: Item[] }
export const SPANS: Span[] = ['c3', 'c4', 'c6', 'c8', 'c12'];

const it = (s: string): Item[] => s.trim().split(/\s+/).map((x) => { const [key, n] = x.split(':'); return { key, span: ('c' + n) as Span }; });
export const PRESETS: Layout[] = [
  { name: 'Full terminal', items: it('map:8 indices:4 sectors:4 vol:4 fx:4 heatmap:8 cmdty:4 watch:8 alerts:4 crypto:4 curve:4 cb:4 rates:4 credit:4 auctions:4 eco:12 cot:12 link:12 news:6 filings:3 cal:3 hist:6 brief:6') },
  { name: 'Equities desk', items: it('indices:4 sectors:4 vol:4 heatmap:8 alerts:4 watch:8 cal:4 link:12 filings:6 news:6 hist:6 brief:6') },
  { name: 'Macro & rates', items: it('curve:4 cb:4 rates:4 credit:4 eco:8 cot:8 auctions:4 fx:4 cmdty:4 vol:4 map:8 news:4') },
  { name: 'Cross-asset', items: it('map:8 indices:4 fx:4 cmdty:4 rates:4 crypto:4 vol:4 curve:4 cot:12 news:12') },
];
const KEY = 'fintel.layout';

export function useLayout(known: string[]) {
  const [layout, setLayout] = useState<Layout>(() => {
    try {
      const l = JSON.parse(localStorage.getItem(KEY) || 'null') as Layout | null;
      const preset = PRESETS.find((p) => p.name === l?.name);
      if (preset) return preset;
      if (l?.items?.length) return { name: l.name, items: l.items.filter((i) => known.includes(i.key)) };
    } catch { /* ignore */ }
    return PRESETS[0];
  });
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(layout)); } catch { /* ignore */ } }, [layout]);
  const edit = (f: (items: Item[]) => Item[]) => setLayout((l) => ({ name: 'Custom', items: f([...l.items]) }));
  return {
    layout,
    choose: (p: Layout) => setLayout({ name: p.name, items: p.items.map((i) => ({ ...i })) }),
    move: (key: string, d: -1 | 1) => edit((xs) => { const i = xs.findIndex((x) => x.key === key), j = i + d; if (i < 0 || j < 0 || j >= xs.length) return xs; [xs[i], xs[j]] = [xs[j], xs[i]]; return xs; }),
    moveTo: (key: string, before: string) => edit((xs) => { const i = xs.findIndex((x) => x.key === key); if (i < 0 || key === before) return xs; const [m] = xs.splice(i, 1); const j = xs.findIndex((x) => x.key === before); xs.splice(j < 0 ? xs.length : j, 0, m); return xs; }),
    resize: (key: string, d: -1 | 1) => edit((xs) => xs.map((x) => (x.key === key ? { ...x, span: SPANS[Math.max(0, Math.min(SPANS.length - 1, SPANS.indexOf(x.span) + d))] } : x))),
    hide: (key: string) => edit((xs) => xs.filter((x) => x.key !== key)),
    show: (key: string, span: Span) => edit((xs) => (xs.some((x) => x.key === key) ? xs : [...xs, { key, span }])),
  };
}

export function Slot({ item, editing, label, children, onMove, onResize, onHide, onDrop }: {
  item: Item; editing: boolean; label: string; children: ReactNode;
  onMove: (d: -1 | 1) => void; onResize: (d: -1 | 1) => void; onHide: () => void; onDrop: (from: string) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <div className={'slot ' + item.span + (editing ? ' editing' : '') + (over ? ' over' : '')}
      draggable={editing} onDragStart={(e) => e.dataTransfer.setData('text/plain', item.key)}
      onDragOver={(e) => { if (editing) { e.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const k = e.dataTransfer.getData('text/plain'); if (k) onDrop(k); }}>
      {editing && (
        <div className="slot-bar" aria-label={`Layout controls for ${label}`}>
          <span className="grip" title="Drag to move">⠿ {label}</span>
          <button className="btn" onClick={() => onMove(-1)} aria-label="Move earlier">←</button>
          <button className="btn" onClick={() => onMove(1)} aria-label="Move later">→</button>
          <button className="btn" onClick={() => onResize(-1)} aria-label="Narrower">−</button>
          <span className="mono dim" style={{ fontSize: 10.5 }}>{item.span.slice(1)}/12</span>
          <button className="btn" onClick={() => onResize(1)} aria-label="Wider">+</button>
          <button className="btn" onClick={onHide} aria-label="Hide panel">Hide</button>
        </div>
      )}
      {children}
    </div>
  );
}
