import { useEffect, useSyncExternalStore } from 'react';
import { getKey, type KeyName } from '@/lib/keys';

// One shared store for every data source. A source is fetched once no matter how many panels use it,
// refreshes on its own interval while something is using it, pauses while the tab is hidden, and keeps
// the last good data (marked "stale") if a refresh fails. Nothing here ever fabricates data.

export type Status = 'loading' | 'live' | 'stale' | 'error' | 'needs-key';

export interface SourceState<T> {
  data?: T;
  error?: string;
  status: Status;
  updated?: number;
  label: string;
  provider: string;
}

export interface SourceDef<T> {
  id: string;
  label: string;          // what it is, e.g. "Treasury yields"
  provider: string;       // where it comes from, e.g. "FRED"
  every: number;          // refresh interval, ms
  requires?: KeyName;     // optional key this source needs
  asOf?: () => number | undefined; // when the data was produced, if not "now" (website snapshots)
  fetch: () => Promise<T>;
}

const states = new Map<string, SourceState<unknown>>();
const defs = new Map<string, SourceDef<unknown>>();
const refs = new Map<string, number>();
const timers = new Map<string, ReturnType<typeof setInterval>>();
const inflight = new Map<string, Promise<void>>();
const again = new Set<string>(); // a refresh was requested while one was in flight
const subs = new Set<() => void>();
let version = 0;

function emit() { version++; subs.forEach((f) => f()); }
function put(id: string, s: SourceState<unknown>) { states.set(id, s); emit(); }

export function run(id: string): Promise<void> {
  const def = defs.get(id);
  if (!def) return Promise.resolve();
  const existing = inflight.get(id);
  if (existing) { again.add(id); return existing; }
  const prev = states.get(id);
  const base = { label: def.label, provider: def.provider };
  if (def.requires && !getKey(def.requires)) {
    put(id, { ...base, status: 'needs-key' });
    return Promise.resolve();
  }
  if (!prev?.data) put(id, { ...base, status: 'loading' });
  const p = def.fetch()
    .then((data) => put(id, { ...base, data, status: 'live', updated: def.asOf?.() ?? Date.now() }))
    .catch((e: unknown) => {
      const error = e instanceof Error ? e.message : String(e);
      put(id, { ...base, data: prev?.data, updated: prev?.updated, error, status: prev?.data ? 'stale' : 'error' });
    })
    .finally(() => {
      inflight.delete(id);
      if (again.delete(id)) void run(id);
    });
  inflight.set(id, p);
  return p;
}

function start(id: string) {
  const def = defs.get(id)!;
  void run(id);
  timers.set(id, setInterval(() => { if (!document.hidden) void run(id); }, def.every));
}
function stop(id: string) {
  clearInterval(timers.get(id));
  timers.delete(id);
}

if (typeof window !== 'undefined') {
  // Catch up when the tab comes back, and re-try key-gated sources when keys change.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    for (const [id, s] of states) {
      const def = defs.get(id);
      if (def && refs.get(id) && (!s.updated || Date.now() - s.updated > def.every)) void run(id);
    }
  });
  window.addEventListener('fintel:keys', () => {
    for (const [id, def] of defs) if (def.requires && refs.get(id)) void run(id);
  });
}

const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f); };
const snapshot = () => version;

/** Make a source known to the store (useSource does this; exported for tests). */
export function register<T>(def: SourceDef<T>): void { defs.set(def.id, def as SourceDef<unknown>); }
export function stateOf<T>(id: string): SourceState<T> | undefined { return states.get(id) as SourceState<T> | undefined; }

export function useSource<T>(def: SourceDef<T>): SourceState<T> {
  useSyncExternalStore(subscribe, snapshot);
  useEffect(() => {
    register(def);
    const n = (refs.get(def.id) || 0) + 1;
    refs.set(def.id, n);
    if (n === 1) start(def.id);
    return () => {
      const m = (refs.get(def.id) || 1) - 1;
      refs.set(def.id, m);
      if (m === 0) stop(def.id);
    };
  }, [def.id]);
  return (states.get(def.id) as SourceState<T>) ?? { status: 'loading', label: def.label, provider: def.provider };
}

/** Read a source's current state without subscribing it (for snapshots like the AI brief). */
export function peek<T>(id: string): T | undefined {
  return states.get(id)?.data as T | undefined;
}

export function useAllSources(): (SourceState<unknown> & { id: string })[] {
  useSyncExternalStore(subscribe, snapshot);
  return [...states.entries()].filter(([id]) => refs.get(id)).map(([id, s]) => ({ id, ...s }));
}

export function refreshAll(): void {
  for (const id of defs.keys()) if (refs.get(id)) void run(id);
}

/** Cache parameterised source definitions so the same id always maps to the same object. */
const factories = new Map<string, SourceDef<unknown>>();
export function sourceFor<T>(id: string, make: () => SourceDef<T>): SourceDef<T> {
  let d = factories.get(id);
  if (!d) { d = make() as SourceDef<unknown>; factories.set(id, d); }
  return d as SourceDef<T>;
}
