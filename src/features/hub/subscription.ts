/**
 * Business hub subscription — DEMO ONLY.
 *
 * The subscription lives in this browser's localStorage, keyed by login name,
 * and no money moves. It is enough to show the Substack-style flow (free preview,
 * subscribe, pay, read). A real version needs a payment gateway and must be
 * checked in the Worker (worker/index.ts) before /hub/*.html is served, because
 * anything checked only in the browser can be bypassed.
 */

export const PLAN = {
  name: 'Business hub',
  priceMnt: 99_000,
  periodLabel: 'сар',
} as const;

export type PaymentMethod = 'account' | 'card' | 'qpay';

export interface Subscription {
  username: string;
  priceMnt: number;
  method: PaymentMethod;
  paidAt: string;
  validUntil: string;
  reference: string;
}

const key = (username: string) => `mcorp.hub.subscription.${username}`;

export function readSubscription(username: string): Subscription | null {
  try {
    const raw = window.localStorage.getItem(key(username));
    return raw ? (JSON.parse(raw) as Subscription) : null;
  } catch {
    return null;
  }
}

export function isActive(sub: Subscription | null, now = new Date()): sub is Subscription {
  return !!sub && new Date(sub.validUntil).getTime() > now.getTime();
}

/** Records a paid month. Renewing before expiry extends from the current end date. */
export function recordPayment(username: string, method: PaymentMethod, now = new Date()): Subscription {
  const current = readSubscription(username);
  const start = isActive(current, now) ? new Date(current.validUntil) : now;
  const until = new Date(start);
  until.setMonth(until.getMonth() + 1);
  const sub: Subscription = {
    username,
    priceMnt: PLAN.priceMnt,
    method,
    paidAt: now.toISOString(),
    validUntil: until.toISOString(),
    reference: `BH${now.getTime().toString(36).toUpperCase()}`,
  };
  try {
    window.localStorage.setItem(key(username), JSON.stringify(sub));
  } catch {
    // Private mode or blocked storage: the demo still shows the receipt, it just won't persist.
  }
  return sub;
}

export function cancelSubscription(username: string) {
  try {
    window.localStorage.removeItem(key(username));
  } catch {
    // ignore
  }
}

export const formatMnt = (n: number) => `₮${n.toLocaleString('en-US')}`;

export function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
