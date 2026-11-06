import { useState } from 'react';
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
    ? { label: 'AI brief', provider: 'Groq · Llama 3.3 70B, from on-screen data', status: !hasKey ? 'needs-key' : state === 'error' ? 'error' : 'live', updated: at, data: text || (hasKey ? '' : undefined), error: err }
    : pub;
  const go = async () => {
    setState('busy'); setErr('');
    try { setText(await groqBrief(snapshot())); setAt(Date.now()); setState('idle'); } catch (e) { setErr((e as Error).message); setState('error'); }
  };
  return (
    <Panel id="p-brief" title="Morning brief" src={src} span="c4" hasData={!!shown || hasKey}
      right={hasKey ? <button className="btn pri" onClick={go} disabled={state === 'busy'}>{state === 'busy' ? 'Writing…' : shown ? 'Rewrite now' : 'Write brief'}</button> : null}
      note={STATIC && !own ? 'Written hourly by an AI model from this site’s data only. Check anything important against the panels.' : 'Written by an AI model from the numbers currently on screen only. Check anything important against the panels.'}>
      {shown ? <><div className="brief">{shown.text}</div>{shown.at && <p className="faint mono" style={{ fontSize: 10.5, marginTop: 8 }}>written {ago(shown.at, now)}</p>}</>
        : <p className="brief-empty">{state === 'error' ? `Couldn't write the brief: ${err}` : 'Generates a short summary of today’s market from the live data in this terminal.'}</p>}
    </Panel>
  );
}
