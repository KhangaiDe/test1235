/**
 * Client-side session for the prototype. In production this comes from the
 * auth service (httpOnly cookie + /me); here it lives in sessionStorage so the
 * static export can run anywhere.
 */
export type CredentialKind = 'temporary' | 'permanent';

export interface Organization {
  name: string;
  registerNumber: string;
  initials: string;
}

export interface Session {
  username: string;
  personName: string;
  org: Organization;
  credentials: CredentialKind;
  /** ISO date the temporary credentials stop working (temporary only). */
  tempValidUntil?: string;
  /** Set right after a first login, so /home can finish the intro hand-off once. */
  justActivated?: boolean;
}

const SESSION_KEY = 'mcorp.session';
const ACTIVATED_KEY = 'mcorp.activated';
const REMEMBER_KEY = 'mcorp.rememberedUser';

function read<T>(storage: () => Storage, key: string): T | null {
  try {
    const raw = storage().getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(storage: () => Storage, key: string, value: unknown) {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, JSON.stringify(value));
  } catch {
    /* storage can be blocked (private mode); the prototype still works without it */
  }
}

const session = () => window.sessionStorage;
const local = () => window.localStorage;

export const readSession = () => read<Session>(session, SESSION_KEY);
export const writeSession = (s: Session) => write(session, SESSION_KEY, s);
export const clearSession = () => write(session, SESSION_KEY, null);

/** Usernames that already completed their first login on this browser. */
export const readActivated = () => read<string[]>(local, ACTIVATED_KEY) ?? [];
export const markActivated = (username: string) =>
  write(local, ACTIVATED_KEY, Array.from(new Set([...readActivated(), username])));
export const resetActivated = () => write(local, ACTIVATED_KEY, null);

export const readRememberedUser = () => read<string>(local, REMEMBER_KEY);
export const writeRememberedUser = (username: string | null) => write(local, REMEMBER_KEY, username);

export function daysLeft(isoDate: string, now = new Date()) {
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - now.getTime()) / 86_400_000));
}

export function formatDate(isoDate: string) {
  const d = new Date(isoDate);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}
