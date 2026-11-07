import { useState, type ReactNode } from 'react';
import { BRIEF, groqBrief } from '@/data/sources';
import { peek, useSource } from '@/data/store';
import type { Series } from '@/data/fred';
import { QUOTES, type Quote } from '@/data/yahoo';
import { briefPrompt } from '@/data/brief';
import { getKey } from '@/lib/keys';
import { STATIC } from '@/lib/env';
import { ago } from '@/lib/format';
import { Panel, useNow } from '@/ui/kit';
import type { SourceState } from '@/data/store';

/** The prompt from what's currently loaded on screen. */
export function snapshot(): string {
  return briefPrompt(peek<Record<string, Quote>>(QUOTES.id) ?? {}, peek<Record<string, Series>>('fred:daily') ?? {}, peek<Record<string, Series>>('fred:macro') ?? {});
}

/** The model writes light Markdown (**bold**, *italics*, "- " bullets, "#" headings). Render just that, as
 *  React elements (never as HTML), so stray asterisks don't show and nothing from the model is injected. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|__(.+?)__|(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?!\w)/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(m[3] != null ? <em key={k++}>{m[3]}</em> : <strong key={k++}>{m[1] ?? m[2]}</strong>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) { blocks.push(<ul key={blocks.length}>{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>); list = []; } };
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    const b = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (b) { list.push(b[1]); continue; }
    flush();
    if (!line) continue;
    const h = line.match(/^#{1,6}\s+(.*)$/);
    blocks.push(h ? <h4 key={blocks.length}>{inline(h[1].replace(/\*\*/g, ''))}</h4> : <p key={blocks.length}>{inline(line)}</p>);
  }
  flush();
  return <>{blocks}</>;
}

export function Brief() {
  // Published by the site's data job; only exists on the website. STATIC is fixed at build time, so the hook order is stable.
  const pub = STATIC ? useSource(BRIEF) : ({ status: 'live', label: 'brief', provider: 'Groq' } as SourceState<{ text: string; at: number }>); // eslint-disable-line react-hooks/rules-of-hooks
  const now = useNow();
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');
  const [err, setErr] = useState('');
  const [at, setAt] = useState<number>();
  const hasKey = !!getKey('groq');
  const own = text ? { text, at } : null;
  const shown = own ?? (STATIC && pub.data ? { text: pub.data.text, at: pub.data.at } : null);
  const src: SourceState<unknown> = own || !STATIC
    ? { label: 'AI brief', provider: 'Groq · gpt-oss-120b, from on-screen data', status: !hasKey ? 'needs-key' : state === 'error' ? 'error' : 'live', updated: at, data: text || (hasKey ? '' : undefined), error: err }
    : pub;
  const go = async () => {
    setState('busy'); setErr('');
    try { setText(await groqBrief(snapshot())); setAt(Date.now()); setState('idle'); } catch (e) { setErr((e as Error).message); setState('error'); }
  };
  return (
    <Panel id="p-brief" title="Morning brief" src={src} span="c4" hasData={!!shown || hasKey}
      right={hasKey ? <button className="btn pri" onClick={go} disabled={state === 'busy'}>{state === 'busy' ? 'Writing…' : shown ? 'Rewrite now' : 'Write brief'}</button> : null}
      note={STATIC && !own ? 'Written hourly by an AI model from this site’s data only. Check anything important against the panels.' : 'Written by an AI model from the numbers currently on screen only. Check anything important against the panels.'}>
      {shown ? <><div className="brief md"><Markdown text={shown.text} /></div>{shown.at && <p className="faint mono" style={{ fontSize: 10.5, marginTop: 8 }}>written {ago(shown.at, now)}</p>}</>
        : <p className="brief-empty">{state === 'error' ? `Couldn't write the brief: ${err}` : 'Generates a short summary of today’s market from the live data in this terminal.'}</p>}
    </Panel>
  );
}
