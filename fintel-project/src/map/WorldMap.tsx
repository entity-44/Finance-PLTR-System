import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useQuotes } from '@/data/yahoo';
import { useSource } from '@/data/store';
import { WB_INDICATORS, worldBankSource } from '@/data/sources';
import { CHOKEPOINTS, COUNTRIES, type Country } from '@/data/universe';
import { big, num, price } from '@/lib/format';
import { Chg, Panel } from '@/ui/kit';
import { heat } from '@/ui/theme';

// Keyless dark basemap (CARTO). If a Protomaps key is set in .env (VITE_PROTOMAPS_KEY), its style is used instead.
const PM_KEY = import.meta.env.VITE_PROTOMAPS_KEY as string | undefined;
const STYLE = PM_KEY ? `https://api.protomaps.com/styles/v2/black.json?key=${PM_KEY}` : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const WB = worldBankSource(COUNTRIES.map((c) => c.iso3).filter((c) => c !== 'TWN'));

export function WorldMap() {
  const symbols = useMemo(() => COUNTRIES.flatMap((c) => [c.index?.[0], c.fx?.[0]]).filter(Boolean) as string[], []);
  const q = useQuotes(symbols);
  const wb = useSource(WB);
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Map<string, HTMLDivElement>>(new Map());
  const [sel, setSel] = useState<Country | null>(COUNTRIES[0]);
  const [showCp, setShowCp] = useState(true);
  const [mapErr, setMapErr] = useState('');
  const cpMarkers = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!box.current) return;
    let m: maplibregl.Map;
    try {
      m = new maplibregl.Map({ container: box.current, style: STYLE, center: [20, 25], zoom: 1.15, minZoom: 0.8, maxZoom: 7, attributionControl: { compact: true }, renderWorldCopies: false, dragRotate: false });
    } catch (e) { setMapErr('Map needs WebGL, which this browser has turned off.'); return; }
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    m.on('error', (e) => { if (String(e.error?.message || '').match(/style|Failed to fetch/i)) setMapErr('Map tiles could not load.'); });
    for (const c of COUNTRIES) {
      const el = document.createElement('div');
      el.className = 'mk';
      el.title = c.name;
      el.addEventListener('click', () => setSel(c));
      markers.current.set(c.iso3, el);
      new maplibregl.Marker({ element: el }).setLngLat([c.lng, c.lat]).addTo(m);
    }
    for (const p of CHOKEPOINTS) {
      const el = document.createElement('div');
      el.className = 'mk-cp';
      cpMarkers.current.push(new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).setPopup(new maplibregl.Popup({ offset: 8, closeButton: false }).setText(p.name)).addTo(m));
    }
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(box.current);
    return () => { ro.disconnect(); m.remove(); markers.current.clear(); cpMarkers.current = []; };
  }, []);

  // colour markers by the local index's daily change (or currency if there's no index)
  useEffect(() => {
    for (const c of COUNTRIES) {
      const el = markers.current.get(c.iso3);
      if (!el) continue;
      const iq = c.index ? q.data?.[c.index[0]] : undefined;
      el.style.background = heat(iq?.changePct ?? null, 2);
      el.classList.toggle('sel', sel?.iso3 === c.iso3);
    }
  }, [q.data, sel]);
  useEffect(() => { cpMarkers.current.forEach((mk) => { mk.getElement().style.display = showCp ? '' : 'none'; }); }, [showCp]);

  const iq = sel?.index ? q.data?.[sel.index[0]] : undefined;
  const fq = sel?.fx ? q.data?.[sel.fx[0]] : undefined;
  const fund = sel ? wb.data?.[sel.iso3] : undefined;
  return (
    <Panel id="p-map" title="Global markets map" src={[q, wb]} span="c8 mappanel" hasData>
      <div className="mapwrap">
        <div ref={box} className="mapcanvas" />
        {mapErr && <div className="maperr" role="status">{mapErr}</div>}
        <div className="maplayers"><button className="btn" onClick={() => setShowCp((v) => !v)} aria-pressed={showCp}>{showCp ? '◆ Chokepoints on' : '◇ Chokepoints off'}</button></div>
        <div className="maplegend"><span>Index today</span><span style={{ width: 90, height: 6, borderRadius: 3, background: 'linear-gradient(90deg,#dc2626,#1a1a1d,#16a34a)', display: 'inline-block' }} /><span>−2% … +2%</span></div>
        {sel && (
          <aside className="mapside" aria-live="polite">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <h3>{sel.name}</h3>
              <button className="link" style={{ color: 'var(--faint)', textDecoration: 'none' }} onClick={() => setSel(null)} aria-label="Close">×</button>
            </div>
            <table className="t" style={{ marginTop: 6 }}>
              <tbody>
                {sel.index && <tr><td>{sel.index[1]}</td><td>{iq ? price(iq.price) : '—'}</td><td><Chg v={iq?.changePct} /></td></tr>}
                {sel.fx && <tr><td>{sel.fx[1]}</td><td>{fq ? price(fq.price) : '—'}</td><td><Chg v={fq?.changePct} /></td></tr>}
              </tbody>
            </table>
            <div className="mono faint" style={{ fontSize: 9.5, letterSpacing: '.1em', margin: '12px 0 2px' }}>FUNDAMENTALS · WORLD BANK</div>
            {sel.iso3 === 'TWN' ? <p className="dim" style={{ fontSize: 11 }}>The World Bank doesn't publish data for Taiwan.</p> : (
              <table className="t"><tbody>
                {WB_INDICATORS.map((ind) => {
                  const v = fund?.[ind.id];
                  return <tr key={ind.id}><td>{ind.label}</td><td>{v ? (ind.unit === 'USD' ? '$' + big(v.v) : num(v.v, 1) + (ind.unit.startsWith('%') ? '%' : '')) : '—'}</td><td className="faint">{v?.year ?? ''}</td></tr>;
                })}
              </tbody></table>
            )}
            <p className="faint" style={{ fontSize: 10.5, marginTop: 6 }}>Annual figures; the year shown is the latest available.</p>
          </aside>
        )}
      </div>
    </Panel>
  );
}
