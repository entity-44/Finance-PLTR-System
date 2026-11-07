import { useState } from 'react';
import { EVENT_CATS, EVENTS, FIPS, type EventCat } from '@/data/events';
import { useSource } from '@/data/store';
import { Panel, Tabs, useNow, Big } from '@/ui/kit';
import { ago } from '@/lib/format';
import { host, tidyActor } from '@/map/WorldMap';

// World events feed: the most-covered conflict, protest and coercion events of the last 24 hours (GDELT).
const ISO_BY_FIPS = Object.fromEntries(Object.entries(FIPS).map(([iso, f]) => [f, iso]));

export function WorldEvents() {
  const s = useSource(EVENTS);
  const now = useNow();
  const [cat, setCat] = useState<'all' | EventCat>('all');
  const d = s.data;
  const rows = (d?.top ?? []).filter((e) => cat === 'all' || e.cat === cat);
  const hot = d ? Object.entries(d.byCountry).filter(([f]) => ISO_BY_FIPS[f]).sort((a, b) => b[1].byCat.conflict - a[1].byCat.conflict).slice(0, 5) : [];
  const name = (() => { let dn: Intl.DisplayNames | undefined; try { dn = new Intl.DisplayNames(['en'], { type: 'region' }); } catch { /* old browser */ } return (iso3: string) => { const c = iso3 ? FIPS[iso3] : ''; return c ? (dn?.of(iso2(iso3)) ?? iso3) : iso3; }; })();
  return (
    <Panel id="p-events" title="World events" src={s} span="c8"
      right={<Tabs small value={cat} onChange={setCat} options={[['all', 'All'], ...EVENT_CATS.map((c) => [c.id, c.label.split(' ')[0]] as [EventCat, string])]} />}
      note="Machine-coded from news worldwide by the GDELT Project (CAMEO event codes), refreshed every 15 minutes. Coding is automated and can misread a story: open the source before relying on an event. Click an event to see it on the map.">
      {d && <div className="kpis">
        {EVENT_CATS.map((c) => <div className="kpi" key={c.id}><span><i className="evdot" style={{ background: c.color }} />{c.label}</span><b><Big>{d.byCat[c.id].toLocaleString('en-US')}</Big></b><small>events · 24h</small></div>)}
        <div className="kpi"><span>Most conflict events</span><b style={{ fontSize: 15, lineHeight: 1.5 }}>{hot.map(([f, v]) => `${name(ISO_BY_FIPS[f])} ${v.byCat.conflict}`).slice(0, 3).join(' · ') || '—'}</b><small>tracked countries</small></div>
      </div>}
      <ul className="feed evfeed">
        {rows.map((e, i) => (
          <li key={i} className="click" onClick={() => dispatchEvent(new CustomEvent('fintel:map-focus', { detail: { lat: e.lat, lng: e.lng, iso3: ISO_BY_FIPS[e.fips] } }))}>
            <span className="meta">{ago(e.t, now)}</span>
            <i className="evdot" style={{ background: EVENT_CATS.find((c) => c.id === e.cat)?.color }} />
            <span className="ttl">{e.label}{e.a1 || e.a2 ? <span className="dim"> · {[e.a1, e.a2].filter(Boolean).map(tidyActor).join(' → ')}</span> : null}
              <small>{e.place} · {e.m} mentions · <a href={e.url} target="_blank" rel="noopener noreferrer" onClick={(x) => x.stopPropagation()}>{host(e.url)} ↗</a></small></span>
          </li>
        ))}
        {d && !rows.length && <li className="dim">No events of this type in the window.</li>}
      </ul>
    </Panel>
  );
}

// ISO3 → ISO2 for display names (only the tracked countries are named here)
const ISO2: Record<string, string> = { USA: 'US', CAN: 'CA', MEX: 'MX', BRA: 'BR', ARG: 'AR', CHL: 'CL', COL: 'CO', PER: 'PE', GBR: 'GB', DEU: 'DE', FRA: 'FR', ITA: 'IT', ESP: 'ES', NLD: 'NL', CHE: 'CH', SWE: 'SE', DNK: 'DK', NOR: 'NO', FIN: 'FI', IRL: 'IE', PRT: 'PT', GRC: 'GR', AUT: 'AT', BEL: 'BE', POL: 'PL', CZE: 'CZ', HUN: 'HU', TUR: 'TR', ISR: 'IL', SAU: 'SA', ARE: 'AE', QAT: 'QA', KWT: 'KW', EGY: 'EG', MAR: 'MA', NGA: 'NG', GHA: 'GH', KEN: 'KE', ZAF: 'ZA', RUS: 'RU', IND: 'IN', PAK: 'PK', BGD: 'BD', CHN: 'CN', HKG: 'HK', JPN: 'JP', KOR: 'KR', TWN: 'TW', SGP: 'SG', IDN: 'ID', THA: 'TH', MYS: 'MY', VNM: 'VN', PHL: 'PH', AUS: 'AU', NZL: 'NZ' };
const iso2 = (iso3: string) => ISO2[iso3] ?? iso3;
