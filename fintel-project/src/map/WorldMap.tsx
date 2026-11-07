import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { Feature, FeatureCollection } from 'geojson';
import countriesUrl from 'world-atlas/countries-50m.json?url';
import { isStaleQuote, useQuotes } from '@/data/yahoo';
import { useSource } from '@/data/store';
import { IMF, IMF_INDICATORS, POLICY, WB_INDICATORS, worldBankSource, type ImfData } from '@/data/sources';
import { bondId, policyArea, CHOKEPOINTS, COUNTRIES, type Country } from '@/data/universe';
import { FRED_MACRO } from '@/data/fred';
import { big, num, price } from '@/lib/format';
import { Chg, Panel, Tabs } from '@/ui/kit';
import { heat } from '@/ui/theme';

// Keyless dark basemap (CARTO). If a Protomaps key is set in .env (VITE_PROTOMAPS_KEY), its style is used instead.
const PM_KEY = import.meta.env.VITE_PROTOMAPS_KEY as string | undefined;
const DARK = PM_KEY ? `https://api.protomaps.com/styles/v2/black.json?key=${PM_KEY}` : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
// Satellite: Esri World Imagery (free with attribution), toned down so markers and cards stay legible.
const SAT: maplibregl.StyleSpecification = {
  version: 8,
  sources: { sat: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 17, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics' } },
  layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#0c0c0c' } }, { id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-saturation': -0.45, 'raster-brightness-max': 0.62, 'raster-contrast': 0.12 } }],
};
type Base = 'sat' | 'dark';
const baseKey = 'fintel.mapbase';
const savedBase = (): Base => { try { return localStorage.getItem(baseKey) === 'dark' ? 'dark' : 'sat'; } catch { return 'sat'; } };
// Camera per country: big countries are framed on their middle rather than the capital, small ones zoom closer.
const VIEW: Record<string, [number, number, number]> = {
  USA: [-97, 38.5, 2.75], CAN: [-98, 58, 2.5], MEX: [-102, 23.5, 3.9], BRA: [-52, -12, 3.1], ARG: [-64, -37, 3.1],
  CHL: [-71, -36, 3.2], COL: [-73.5, 4.5, 4.4], PER: [-75, -9.5, 4.2], RUS: [95, 62, 1.9], CHN: [104, 35, 3],
  IND: [79, 22, 3.6], IDN: [118, -2.5, 3.4], AUS: [134, -26, 3.1], NZL: [172.5, -41.5, 4.4], SAU: [45, 24, 4.3],
  ZAF: [25, -29, 4.4], EGY: [30, 26.5, 4.6], NGA: [8, 9.5, 4.6], KEN: [38, 0.5, 5], MAR: [-6.5, 31.5, 4.8],
  GHA: [-1, 8, 5.4], PAK: [69.5, 30, 4.4], TUR: [35, 39, 4.6], JPN: [138, 37, 4.2], SWE: [16, 62, 3.9],
  NOR: [12, 64, 3.6], FIN: [26, 64.5, 3.9], FRA: [2.5, 46.5, 4.8], DEU: [10.4, 51.2, 5], ESP: [-3.7, 40.2, 5],
  ITA: [12.5, 42.5, 4.8], GBR: [-2.5, 54, 4.8], POL: [19.4, 52, 5.1], VNM: [106, 16, 4.4], THA: [101, 13.5, 4.6],
  MYS: [109, 4, 4.5], PHL: [122, 12, 4.6], KOR: [127.8, 36.3, 5.6], TWN: [121, 23.7, 6], BGD: [90.3, 23.7, 5.8],
};
const SMALL = new Set(['SGP', 'HKG', 'QAT', 'KWT', 'ISR', 'BEL', 'NLD', 'CHE', 'AUT', 'CZE', 'HUN', 'DNK', 'IRL', 'PRT', 'GRC', 'ARE']);
const viewFor = (c: Country): [number, number, number] => VIEW[c.iso3] ?? [c.lng, c.lat, SMALL.has(c.iso3) ? (['SGP', 'HKG'].includes(c.iso3) ? 8 : 6.2) : 5];
/** Leave room for the country card on the right (desktop); on phones it sits below the map. */
const cardPad = () => (typeof window !== 'undefined' && window.innerWidth > 760 ? { top: 90, bottom: 40, left: 40, right: 330 } : { top: 40, bottom: 20, left: 20, right: 20 });

// Country outlines: Natural Earth 1:50m admin-0 shapes (world-atlas, public domain), keyed by ISO 3166 numeric code.
const NUM: Record<string, string> = {
  USA: '840', CAN: '124', MEX: '484', BRA: '076', ARG: '032', CHL: '152', COL: '170', PER: '604', GBR: '826', DEU: '276',
  FRA: '250', ITA: '380', ESP: '724', NLD: '528', CHE: '756', SWE: '752', DNK: '208', NOR: '578', FIN: '246', IRL: '372',
  PRT: '620', GRC: '300', AUT: '040', BEL: '056', POL: '616', CZE: '203', HUN: '348', TUR: '792', ISR: '376', SAU: '682',
  ARE: '784', QAT: '634', KWT: '414', EGY: '818', MAR: '504', NGA: '566', GHA: '288', KEN: '404', ZAF: '710', RUS: '643',
  IND: '356', PAK: '586', BGD: '050', CHN: '156', HKG: '344', JPN: '392', KOR: '410', TWN: '158', SGP: '702', IDN: '360',
  THA: '764', MYS: '458', VNM: '704', PHL: '608', AUS: '036', NZL: '554',
};
const ISO_BY_NUM = Object.fromEntries(Object.entries(NUM).map(([k, v]) => [v, k]));
/** Rings that cross the 180° meridian (Russia's Chukotka) jump from +180 to -180 and draw lines across the
 *  whole map. Shift their western half by +360° so the ring is continuous (MapLibre accepts lng > 180). */
function unwrap(f: Feature): Feature {
  const fix = (ring: number[][]) => {
    let lo = Infinity, hi = -Infinity;
    for (const [x] of ring) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
    return hi - lo > 180 ? ring.map(([x, y]) => [x < 0 ? x + 360 : x, y]) : ring;
  };
  const g = f.geometry;
  if (g.type === 'Polygon') return { ...f, geometry: { ...g, coordinates: g.coordinates.map(fix) } };
  if (g.type === 'MultiPolygon') return { ...f, geometry: { ...g, coordinates: g.coordinates.map((p) => p.map(fix)) } };
  return f;
}
let shapes: Promise<Map<string, Feature>> | null = null;
/** Tracked countries' outlines, keyed by ISO3 (loaded once, ~230 KB gzipped, only when the map is shown). */
function countryShapes() {
  shapes ||= fetch(countriesUrl).then((r) => r.json()).then((t: Topology<{ countries: GeometryCollection }>) => {
    const fc = feature(t, t.objects.countries) as FeatureCollection;
    const out = new Map<string, Feature>();
    for (const f of fc.features) { const iso = ISO_BY_NUM[String(f.id)]; if (iso) out.set(iso, { ...unwrap(f), properties: { iso3: iso } }); }
    return out;
  });
  return shapes;
}
/** Bounds of a country's main landmass(es): polygons at least a quarter the size of the largest, so far-off
 *  islands and territories don't zoom the camera out. */
function mainBounds(f: Feature): [[number, number], [number, number]] | null {
  const g = f.geometry;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  const area = (r: number[][]) => Math.abs(r.reduce((a, p, i) => { const q = r[(i + 1) % r.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
  const items = polys.map((p) => ({ ring: p[0], a: area(p[0]) }));
  const max = Math.max(0, ...items.map((i) => i.a));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const it of items) if (it.a >= max * 0.25) for (const [x, y] of it.ring) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return Number.isFinite(x0) && x1 - x0 < 180 ? [[x0, y0], [x1, y1]] : null; // wider than 180° means it crosses the antimeridian
}
// Countries whose shapes mislead a bounding box (Alaska and Hawaii, Russia across the antimeridian, Svalbard)
const FIXED = new Set(['USA', 'RUS', 'NOR']);
/** Point the camera at a country: fit its real borders when we have them, otherwise the preset view. */
function frame(m: maplibregl.Map, c: Country, shape: Feature | undefined, animate: boolean) {
  const pad = cardPad();
  m.setPadding({ top: 0, bottom: 0, left: 0, right: 0 }); // padding persists on the map and would stack with fitBounds'
  const b = shape && !FIXED.has(c.iso3) ? mainBounds(shape) : null;
  if (b) { m.fitBounds(b, { padding: pad, maxZoom: 7, duration: animate ? 1600 : 0, essential: true }); return; }
  const v = viewFor(c);
  if (animate) m.flyTo({ center: [v[0], v[1]], zoom: v[2], padding: pad, speed: 1.4, curve: 1.5, essential: true });
  else m.jumpTo({ center: [v[0], v[1]], zoom: v[2], padding: pad });
}
const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };
/** Add the outline layers (again after a basemap switch, which drops custom layers). */
function addBorderLayers(m: maplibregl.Map, all: Map<string, Feature> | null, selIso: string | undefined) {
  if (!m.isStyleLoaded() || m.getSource('sel-border')) return;
  m.addSource('tracked', { type: 'geojson', data: all ? { type: 'FeatureCollection', features: [...all.values()] } : EMPTY });
  m.addLayer({ id: 'tracked-hit', type: 'fill', source: 'tracked', paint: { 'fill-color': '#ffffff', 'fill-opacity': 0 } });
  const f = selIso ? all?.get(selIso) : undefined;
  m.addSource('sel-border', { type: 'geojson', data: f ? { type: 'FeatureCollection', features: [f] } : EMPTY });
  m.addLayer({ id: 'sel-fill', type: 'fill', source: 'sel-border', paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.07 } });
  m.addLayer({ id: 'sel-glow', type: 'line', source: 'sel-border', paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.14, 'line-blur': 5 } });
  m.addLayer({ id: 'sel-line', type: 'line', source: 'sel-border', paint: { 'line-color': '#ffffff', 'line-width': 1.5, 'line-opacity': 0.95 } });
}

const WB = worldBankSource(COUNTRIES.map((c) => c.iso3).filter((c) => c !== 'TWN'));

export function WorldMap() {
  const symbols = useMemo(() => COUNTRIES.flatMap((c) => [c.index?.[0], c.fx?.[0]]).filter(Boolean) as string[], []);
  const q = useQuotes(symbols);
  const wb = useSource(WB);
  const fred = useSource(FRED_MACRO);
  const pol = useSource(POLICY);
  const imf = useSource(IMF);
  const [fundTab, setFundTab] = useState<'imf' | 'wb'>('imf');
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Map<string, HTMLDivElement>>(new Map());
  const [sel, setSel] = useState<Country | null>(COUNTRIES[0]);
  const [showCp, setShowCp] = useState(true);
  const [mapErr, setMapErr] = useState('');
  const [base, setBase] = useState<Base>(savedBase);
  const cpMarkers = useRef<maplibregl.Marker[]>([]);
  const shapesRef = useRef<Map<string, Feature> | null>(null);
  const selRef = useRef<Country | null>(sel);

  useEffect(() => {
    if (!box.current) return;
    let m: maplibregl.Map;
    try {
      const v0 = viewFor(sel ?? COUNTRIES[0]);
      m = new maplibregl.Map({ container: box.current, style: base === 'sat' ? SAT : DARK, center: [v0[0], v0[1]], zoom: v0[2], minZoom: 0.8, maxZoom: 9, attributionControl: { compact: true }, renderWorldCopies: false, dragRotate: false });
    } catch (e) { setMapErr('Map needs WebGL, which this browser has turned off.'); return; }
    map.current = m;
    m.once('load', () => frame(m, selRef.current ?? COUNTRIES[0], undefined, false));
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    // outlines: drawn once the style and shapes are ready, and again after a basemap switch
    m.on('load', () => { countryShapes().then((all) => { shapesRef.current = all; addBorderLayers(m, all, selRef.current?.iso3); if (selRef.current) frame(m, selRef.current, all.get(selRef.current.iso3), false); }).catch(() => { /* outlines are optional */ }); });
    m.on('styledata', () => { if (shapesRef.current) addBorderLayers(m, shapesRef.current, selRef.current?.iso3); });
    m.on('click', 'tracked-hit', (e) => { const iso = e.features?.[0]?.properties?.iso3 as string | undefined; const c = COUNTRIES.find((x) => x.iso3 === iso); if (c) setSel(c); });
    m.on('mouseenter', 'tracked-hit', () => { m.getCanvas().style.cursor = 'pointer'; });
    m.on('mouseleave', 'tracked-hit', () => { m.getCanvas().style.cursor = ''; });
    m.on('error', (e) => { if (String(e.error?.message || '').match(/style|Failed to fetch/i)) setMapErr('Map tiles could not load.'); });
    for (const c of COUNTRIES) {
      const el = document.createElement('div');
      el.className = 'mk';
      el.title = c.name;
      el.addEventListener('click', (e) => { e.stopPropagation(); setSel(c); });
      // keep the map from also treating a marker click as a click on the shape underneath
      for (const t of ['mousedown', 'mouseup', 'touchstart', 'touchend'] as const) el.addEventListener(t, (e) => e.stopPropagation());
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const switchBase = (b: Base) => { setBase(b); try { localStorage.setItem(baseKey, b); } catch { /* private mode */ } map.current?.setStyle(b === 'sat' ? SAT : DARK); setMapErr(''); };

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
  // fly to the selected country so the map is always over it
  const first = useRef(true);
  useEffect(() => {
    const m = map.current;
    selRef.current = sel;
    // outline the selected country
    const src = m?.getSource('sel-border') as maplibregl.GeoJSONSource | undefined;
    const f = sel ? shapesRef.current?.get(sel.iso3) : undefined;
    src?.setData(f ? { type: 'FeatureCollection', features: [f] } : EMPTY);
    if (!m) return;
    if (!sel) { m.flyTo({ center: [20, 25], zoom: 1.15, padding: { top: 0, bottom: 0, left: 0, right: 0 }, essential: true }); return; } // card closed: back to the world
    if (first.current) { first.current = false; return; } // initial view is set on load
    frame(m, sel, shapesRef.current?.get(sel.iso3), true);
  }, [sel]);
  useEffect(() => { cpMarkers.current.forEach((mk) => { mk.getElement().style.display = showCp ? '' : 'none'; }); }, [showCp]);

  const iq = sel?.index ? q.data?.[sel.index[0]] : undefined;
  const fq = sel?.fx ? q.data?.[sel.fx[0]] : undefined;
  const fund = sel ? wb.data?.[sel.iso3] : undefined;
  const bs = sel && bondId(sel) ? fred.data?.[bondId(sel)!] : undefined;
  const bond = bs?.length ? bs[bs.length - 1] : undefined;
  const pr = sel ? pol.data?.[policyArea(sel) ?? ''] : undefined;
  const bondPrev = bs && bs.length > 12 ? bs[bs.length - 13] : undefined;
  return (
    <Panel id="p-map" title="Global markets map" src={[q, wb, fred, pol, imf]} span="c8 mappanel" hasData>
      <div className="mapwrap">
        <div ref={box} className="mapcanvas" />
        {mapErr && <div className="maperr" role="status">{mapErr}</div>}
        <div className="maplayers">
          <button className="btn" onClick={() => switchBase('sat')} aria-pressed={base === 'sat'}>Satellite</button>
          <button className="btn" onClick={() => switchBase('dark')} aria-pressed={base === 'dark'}>Streets</button>
          <button className="btn" onClick={() => setShowCp((v) => !v)} aria-pressed={showCp}>Chokepoints</button>
        </div>
        <div className="maplegend"><span>Index today</span><span style={{ width: 90, height: 6, borderRadius: 3, background: 'linear-gradient(90deg,#cd3a34,#2a2a2a,#349652)', display: 'inline-block' }} /><span>−2% … +2%</span></div>
        {sel && (
          <aside className="mapside" aria-live="polite">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <h3>{sel.name}</h3>
              <button className="link" style={{ color: 'var(--faint)', textDecoration: 'none' }} onClick={() => setSel(null)} aria-label="Close">×</button>
            </div>
            <table className="t" style={{ marginTop: 6 }}>
              <tbody>
                {sel.index && <tr><td>{sel.index[1]}</td><td>{iq ? price(iq.price) : '—'}</td><td>{iq && isStaleQuote(iq) ? <small className="faint">as of {new Date(iq.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small> : <Chg v={iq?.changePct} />}</td></tr>}
                {sel.fx && <tr><td>{sel.fx[1]}</td><td>{fq ? price(fq.price) : '—'}</td><td><Chg v={fq?.changePct} /></td></tr>}
                {pr && <tr title="Central bank policy rate (BIS). Change is versus a year earlier."><td>Policy rate<br /><small className="faint">{pr.area === 'XM' ? 'ECB' : 'central bank'}{pr.changed ? ' · moved ' + new Date(pr.changed + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''}</small></td><td>{pr.v.toFixed(2)}%</td><td>{pr.y1 != null ? <Chg v={(pr.v - pr.y1) * 100} dp={0} suffix="bp" invert /> : ''}</td></tr>}
                {sel.bond && <tr title="Monthly average long-term (10-year) government bond yield, OECD via FRED. Change is versus a year earlier."><td>10Y gov't yield<br /><small className="faint">{bond ? new Date(bond.d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'OECD'}</small></td><td>{bond ? bond.v.toFixed(2) + '%' : '—'}</td><td>{bond && bondPrev ? <Chg v={(bond.v - bondPrev.v) * 100} dp={0} suffix="bp" invert /> : ''}</td></tr>}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 4px' }}>
              <span className="faint" style={{ fontSize: 12 }}>Fundamentals</span>
              <Tabs small value={fundTab} onChange={setFundTab} options={[['imf', 'IMF outlook'], ['wb', 'World Bank']]} />
            </div>
            {fundTab === 'imf' ? <ImfCard d={imf.data} iso3={sel.iso3} err={imf.status === 'error' ? imf.error ?? 'unavailable' : undefined} /> : sel.iso3 === 'TWN' ? <p className="dim" style={{ fontSize: 11 }}>The World Bank doesn't publish data for Taiwan.</p> : (<>
              <table className="t"><tbody>
                {WB_INDICATORS.map((ind) => {
                  const v = fund?.[ind.id];
                  return <tr key={ind.id}><td>{ind.label}</td><td>{v ? (ind.unit === 'USD' ? '$' + big(v.v) : num(v.v, 1) + (ind.unit.startsWith('%') ? '%' : '')) : '—'}</td><td className="faint">{v?.year ?? ''}</td></tr>;
                })}
              </tbody></table>
              <p className="faint" style={{ fontSize: 10.5, marginTop: 6 }}>Annual figures; the year shown is the latest available.</p>
            </>)}
          </aside>
        )}
      </div>
    </Panel>
  );
}

/** IMF World Economic Outlook for one country: last year, this year and next (IMF estimates/projections). */
function ImfCard({ d, iso3, err }: { d?: ImfData; iso3: string; err?: string }) {
  if (!d) return <p className="dim" style={{ fontSize: 11 }}>{err ? `IMF outlook unavailable right now (${err}).` : 'Loading the IMF outlook…'}</p>;
  const c = d.data[iso3];
  if (!c) return <p className="dim" style={{ fontSize: 11 }}>The IMF doesn't publish an outlook for this economy.</p>;
  const now = new Date().getFullYear(), ys = [now - 1, now, now + 1].map(String);
  const fmt = (v: number | undefined, unit: string) => v == null ? '—' : unit === 'USD bn' ? '$' + big(v * 1e9) : unit === 'USD' ? '$' + big(v) : num(v, 1) + '%';
  return <>
    <table className="t">
      <thead><tr><th></th>{ys.map((y) => <th key={y}>{y}{Number(y) >= now ? 'f' : ''}</th>)}</tr></thead>
      <tbody>{IMF_INDICATORS.filter((i) => i.id !== 'NGDPDPC').map((ind) => c[ind.id] && (
        <tr key={ind.id}><td>{ind.label}</td>{ys.map((y) => <td key={y}>{fmt(c[ind.id]?.[y], ind.unit)}</td>)}</tr>
      ))}</tbody>
    </table>
    <p className="faint" style={{ fontSize: 10.5, marginTop: 6 }}>{d.edition}{d.saved ? ` (copy saved from imf.org ${d.saved})` : ''}. f = IMF forecast; earlier years can still be estimates.</p>
  </>;
}
