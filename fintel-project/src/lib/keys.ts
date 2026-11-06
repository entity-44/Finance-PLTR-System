// Optional API keys. Stored only in this browser (localStorage), or read from .env as VITE_* for local dev.
// Never committed: .env is git-ignored.

export type KeyName = 'finnhub' | 'groq';

export const KEY_INFO: Record<KeyName, { label: string; url: string; unlocks: string }> = {
  finnhub: { label: 'Finnhub', url: 'https://finnhub.io/register', unlocks: 'Earnings & IPO calendars, company news (free tier)' },
  groq: { label: 'Groq', url: 'https://console.groq.com/keys', unlocks: 'AI market brief written from the live data on screen' },
};

const STORE = 'fintel.keys';
const ENV: Record<KeyName, string | undefined> = {
  finnhub: import.meta.env.VITE_FINNHUB_KEY as string | undefined,
  groq: import.meta.env.VITE_GROQ_KEY as string | undefined,
};

function read(): Partial<Record<KeyName, string>> {
  try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; }
}

export function getKey(name: KeyName): string {
  return (read()[name] || ENV[name] || '').trim();
}

export function setKey(name: KeyName, value: string): void {
  const all = read();
  if (value.trim()) all[name] = value.trim(); else delete all[name];
  try { localStorage.setItem(STORE, JSON.stringify(all)); } catch { /* storage blocked */ }
  window.dispatchEvent(new CustomEvent('fintel:keys'));
}

export function keySource(name: KeyName): 'browser' | 'env' | 'none' {
  if (read()[name]) return 'browser';
  return ENV[name] ? 'env' : 'none';
}
