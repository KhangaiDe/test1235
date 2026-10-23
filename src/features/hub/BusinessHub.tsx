'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, ExternalLink, Lock, RefreshCw } from 'lucide-react';
import { hideSources } from './hideSources';
import { HUB_REPORTS, type HubReport } from './reports';
import { ModeToggle, applyMode, readMode, type ReportMode } from './shortView';
import { PLAN, cancelSubscription, formatDate, formatMnt, isActive, readSubscription, type Subscription } from './subscription';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MON[m - 1]} ${y}`;
};
const fmtTime = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

/**
 * Reads the run date from the monitor's embedded state (the pages keep every run
 * in a <script type="application/json">). Same origin, so the iframe is readable.
 */
function readRunDate(frame: HTMLIFrameElement | null, stateId: string): string | null {
  try {
    const el = frame?.contentDocument?.getElementById(stateId);
    if (!el?.textContent) return null;
    const state = JSON.parse(el.textContent) as { runs?: { run_date?: string }[] };
    const last = state.runs?.[state.runs.length - 1]?.run_date;
    return last ? fmtDay(last) : null;
  } catch {
    return null;
  }
}

export interface BusinessHubProps {
  /** Login name; the (demo) subscription is stored per user. */
  username: string;
}

/**
 * The parent mounts this with a new `key` on every "Business hub" menu click,
 * so each click loads both reports fresh; "Шинэчлэх" does the same in place.
 * Without an active subscription only the top of each report is shown, Substack-style.
 */
export function BusinessHub({ username }: BusinessHubProps) {
  const [sub, setSub] = useState<Subscription | null>(() => readSubscription(username));
  const locked = !isActive(sub);
  const [active, setActive] = useState<HubReport['id']>(HUB_REPORTS[0].id);
  const [stamp, setStamp] = useState(() => Date.now());
  const [loading, setLoading] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(HUB_REPORTS.map((r) => [r.id, true])),
  );
  const [runDates, setRunDates] = useState<Record<string, string | null>>({});
  const frames = useRef<Record<string, HTMLIFrameElement | null>>({});
  const [mode, setMode] = useState<ReportMode>(readMode);

  useEffect(() => {
    Object.values(frames.current).forEach((f) => applyMode(f, mode));
  }, [mode]);

  const refresh = useCallback(() => {
    setStamp(Date.now());
    setLoading(Object.fromEntries(HUB_REPORTS.map((r) => [r.id, true])));
  }, []);

  const current = HUB_REPORTS.find((r) => r.id === active) ?? HUB_REPORTS[0];
  const anyLoading = Object.values(loading).some(Boolean);

  return (
    <section aria-labelledby="hub-title" className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 id="hub-title" className="text-xl font-semibold tracking-tight">
            Business hub
          </h1>
          <p className="text-sm text-fg-muted">
            Зах зээлийн хяналт · сүүлд татсан {fmtTime(new Date(stamp))}
          </p>
          {!locked ? (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-2.5 py-0.5 text-xs font-medium text-ok">
                <BadgeCheck aria-hidden className="size-3.5" />
                Захиалга идэвхтэй
              </span>
              <span className="text-fg-muted">{formatDate(sub.validUntil)} хүртэл</span>
              <button
                type="button"
                onClick={() => {
                  cancelSubscription(username);
                  setSub(null);
                }}
                className="text-xs text-fg-muted underline underline-offset-2 hover:text-fg"
              >
                Цуцлах (туршилт)
              </button>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {locked ? null : <ModeToggle mode={mode} onChange={setMode} />}
          {locked ? null : (
          <a
            href={`/report/?id=${current.id}&mode=${mode}`}
            target="_blank"
            rel="noopener"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-hairline bg-page px-3 text-sm hover:bg-field focus-visible:outline-2 focus-visible:outline-fg"
          >
            <ExternalLink aria-hidden className="size-4" />
            <span className="max-sm:sr-only">Шинэ цонхонд</span>
          </a>
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={anyLoading}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-action px-4 text-sm font-medium text-on-action transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg disabled:opacity-60"
          >
            <RefreshCw aria-hidden className={`size-4 ${anyLoading ? 'animate-spin' : ''}`} />
            Шинэчлэх
          </button>
        </div>
      </div>

      <div role="tablist" aria-label="Тайлан" className="flex gap-1 rounded-xl border border-hairline bg-page p-1">
        {HUB_REPORTS.map((r) => {
          const selected = r.id === active;
          return (
            <button
              key={r.id}
              type="button"
              role="tab"
              id={`hub-tab-${r.id}`}
              aria-selected={selected}
              aria-controls={`hub-panel-${r.id}`}
              onClick={() => setActive(r.id)}
              className={`flex min-w-0 flex-1 flex-col items-start rounded-lg px-3 py-2 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-fg ${
                selected ? 'bg-field font-semibold' : 'text-fg-muted hover:bg-field'
              }`}
            >
              <span className="truncate">{r.label}</span>
              <span className="truncate text-xs font-normal text-fg-muted">
                {loading[r.id] ? 'Ачаалж байна…' : runDates[r.id] ? `Run of ${runDates[r.id]}` : r.hint}
              </span>
            </button>
          );
        })}
      </div>

      {/* Both frames stay mounted so switching tabs is instant; only the active one is shown. */}
      {HUB_REPORTS.map((r) => (
        <div
          key={r.id}
          role="tabpanel"
          id={`hub-panel-${r.id}`}
          aria-labelledby={`hub-tab-${r.id}`}
          hidden={r.id !== active}
          className="relative overflow-hidden rounded-2xl border border-hairline bg-page"
        >
          <div className={locked ? 'pointer-events-none relative overflow-hidden' : undefined} style={locked ? { height: r.previewHeight } : undefined}>
          <iframe
            ref={(el) => {
              frames.current[r.id] = el;
            }}
            key={`${r.id}-${stamp}`}
            src={`${r.src}?v=${stamp}`}
            title={r.label}
            onLoad={() => {
              hideSources(frames.current[r.id]);
              applyMode(frames.current[r.id], mode);
              setLoading((l) => ({ ...l, [r.id]: false }));
              setRunDates((d) => ({ ...d, [r.id]: readRunDate(frames.current[r.id], r.stateId) }));
            }}
            tabIndex={locked ? -1 : undefined}
            scrolling={locked ? 'no' : undefined}
            className={locked ? 'block h-[1400px] w-full' : 'block h-[calc(100dvh-260px)] min-h-[560px] w-full'}
          />
          {locked ? (
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent via-page/85 to-page" />
          ) : null}
          </div>
          {locked ? <Paywall /> : null}
          {loading[r.id] ? (
            <div aria-hidden className="absolute inset-0 grid place-items-center bg-page/70 backdrop-blur-[1px]">
              <RefreshCw className="size-6 animate-spin text-fg-muted" />
            </div>
          ) : null}
        </div>
      ))}
    </section>
  );
}

/** Substack-style box under the free preview. */
function Paywall() {
  return (
    <div className="grid justify-items-center gap-4 border-t border-hairline px-6 pt-8 pb-10 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-field">
        <Lock aria-hidden className="size-5" />
      </span>
      <div className="grid max-w-md gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Үргэлжлүүлэн уншихын тулд захиална уу</h2>
        <p className="text-sm text-balance text-fg-muted">
          Коксжих нүүрс болон USD/MNT ханшийн тайлангийн бүрэн хувилбар: дүгнэлт, график, дохионы хүснэгт.
          Тайлан тогтмол шинэчлэгдэнэ.
        </p>
      </div>
      <p className="text-2xl font-semibold tracking-tight tabular-nums">
        {formatMnt(PLAN.priceMnt)}
        <span className="text-base font-normal text-fg-muted"> / {PLAN.periodLabel}</span>
      </p>
      <Link
        href="/subscribe/"
        className="inline-flex h-12 min-w-56 items-center justify-center rounded-xl bg-brand px-6 text-[15px] font-semibold text-on-brand transition hover:bg-brand-deep hover:text-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
      >
        Захиалах
      </Link>
      <p className="text-xs text-fg-faint">Сар бүр сунгагдана · Хүссэн үедээ цуцална</p>
    </div>
  );
}
