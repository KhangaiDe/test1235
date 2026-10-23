'use client';

import { useState, useSyncExternalStore } from 'react';
import { RotateCcw } from 'lucide-react';
import { formatDate, isActive, listSubscriptions, resetAllSubscriptions } from './subscription';

const noopSubscribe = () => () => {};
// A string snapshot, so React sees the same value until storage actually changes.
const readStored = () => JSON.stringify(listSubscriptions());

/**
 * DEMO ONLY (`/subscribe/reset/`): clears every stored subscription in this
 * browser so the paywall shows again, for whoever logs in next.
 */
export function PaywallReset() {
  const raw = useSyncExternalStore(noopSubscribe, readStored, () => undefined);
  const [removed, setRemoved] = useState<number | null>(null);
  if (raw === undefined) return <div className="min-h-dvh bg-app" />;
  const subs = JSON.parse(raw) as ReturnType<typeof listSubscriptions>;

  return (
    <div className="grid min-h-dvh place-items-center bg-app px-4 py-10">
      <section aria-labelledby="reset-title" className="grid w-full max-w-md gap-5 rounded-2xl border border-hairline bg-page p-6">
        <div className="grid gap-1">
          <h1 id="reset-title" className="text-xl font-semibold tracking-tight">
            Paywall сэргээх (туршилт)
          </h1>
          <p className="text-sm text-fg-muted">
            Энэ хөтөч дээр хадгалагдсан Business hub-ийн бүх захиалгыг устгаж, тайлангуудыг дахин түгжинэ.
          </p>
        </div>

        {subs.length ? (
          <ul className="grid gap-2 text-sm">
            {subs.map((s) => (
              <li key={s.username} className="flex items-center justify-between gap-3 rounded-xl bg-field px-3 py-2">
                <span className="truncate font-medium">{s.username}</span>
                <span className="shrink-0 text-fg-muted tabular-nums">
                  {isActive(s) ? `${formatDate(s.validUntil)} хүртэл` : 'Хугацаа дууссан'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p role="status" className="rounded-xl bg-field px-3 py-2 text-sm text-fg-muted">
            {removed ? `${removed} захиалга устгагдлаа. Paywall дахин харагдана.` : 'Хадгалагдсан захиалга алга. Paywall харагдаж байна.'}
          </p>
        )}

        <button
          type="button"
          disabled={!subs.length}
          onClick={() => setRemoved(resetAllSubscriptions())}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-[15px] font-semibold text-on-brand transition hover:bg-brand-deep hover:text-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg disabled:opacity-50 disabled:hover:bg-brand disabled:hover:text-on-brand"
        >
          <RotateCcw aria-hidden className="size-4" />
          Бүх захиалгыг устгах
        </button>
        <a href="/home/?view=hub" className="justify-self-center text-sm text-fg-muted underline underline-offset-2 hover:text-fg">
          Business hub руу буцах
        </a>
      </section>
    </div>
  );
}
