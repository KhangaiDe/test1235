'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { ArrowLeft, BadgeCheck, ChevronRight, ExternalLink, Lock, RefreshCw } from 'lucide-react';
import { CoalArt, FxArt } from './HubArt';
import { hideSources } from './hideSources';
import { fmtRunDate, loadRuns, type Band, type RunScore, type RunSummary } from './reportData';
import { HUB_REPORTS, type HubReport } from './reports';
import { ModeToggle, applyMode, readMode, type ReportMode } from './shortView';
import { PLAN, cancelSubscription, formatDate, formatMnt, isActive, readSubscription, type Subscription } from './subscription';

const ART: Record<HubReport['id'], ComponentType<{ className?: string }>> = { coal: CoalArt, fx: FxArt };

const fmtTime = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

type View = { kind: 'cards' } | { kind: 'history'; id: HubReport['id'] } | { kind: 'run'; id: HubReport['id']; date: string };
/** Runs per report, newest first; undefined while loading. */
type Runs = Partial<Record<HubReport['id'], RunSummary[] | 'error'>>;

export interface BusinessHubProps {
  /** Login name; the (demo) subscription is stored per user. */
  username: string;
}

/**
 * Business hub has three levels: a card per report, that report's runs by date,
 * and one run (short view by default, long with the toggle). The parent mounts
 * this with a new `key` on every "Business hub" menu click, so each click starts
 * at the cards with fresh data; "Шинэчлэх" reloads in place. Without an active
 * subscription a run shows only its top, Substack-style.
 */
export function BusinessHub({ username }: BusinessHubProps) {
  const [sub, setSub] = useState<Subscription | null>(() => readSubscription(username));
  const locked = !isActive(sub);
  const [view, setView] = useState<View>({ kind: 'cards' });
  const [stamp, setStamp] = useState(() => Date.now());
  const [runs, setRuns] = useState<Runs>({});
  const [mode, setMode] = useState<ReportMode>(readMode);

  useEffect(() => {
    let alive = true;
    for (const r of HUB_REPORTS) {
      loadRuns(r, stamp)
        .then((list) => alive && setRuns((s) => ({ ...s, [r.id]: list })))
        .catch(() => alive && setRuns((s) => ({ ...s, [r.id]: 'error' })));
    }
    return () => {
      alive = false;
    };
  }, [stamp]);

  const refresh = () => {
    setRuns({});
    setStamp(Date.now());
  };
  const loading = HUB_REPORTS.some((r) => runs[r.id] === undefined);
  const report = view.kind === 'cards' ? null : (HUB_REPORTS.find((r) => r.id === view.id) ?? HUB_REPORTS[0]);

  return (
    <section aria-labelledby="hub-title" className="grid min-w-0 gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 id="hub-title" className="text-xl font-semibold tracking-tight">
            Business hub
          </h1>
          <p className="text-sm text-fg-muted">Зах зээлийн хяналт · сүүлд татсан {fmtTime(new Date(stamp))}</p>
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
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-action px-4 text-sm font-medium text-on-action transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg disabled:opacity-60"
        >
          <RefreshCw aria-hidden className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          Шинэчлэх
        </button>
      </div>

      {view.kind === 'cards' ? (
        <div className="grid gap-4 md:grid-cols-2">
          {HUB_REPORTS.map((r) => (
            <ReportCard key={r.id} report={r} runs={runs[r.id]} onOpen={() => setView({ kind: 'history', id: r.id })} />
          ))}
        </div>
      ) : null}

      {view.kind === 'history' && report ? (
        <RunHistory
          report={report}
          runs={runs[report.id]}
          locked={locked}
          onBack={() => setView({ kind: 'cards' })}
          onOpen={(date) => setView({ kind: 'run', id: report.id, date })}
        />
      ) : null}

      {view.kind === 'run' && report ? (
        <RunReader
          key={`${report.id}-${view.date}-${stamp}`}
          report={report}
          date={view.date}
          latest={Array.isArray(runs[report.id]) && (runs[report.id] as RunSummary[])[0]?.date === view.date}
          stamp={stamp}
          locked={locked}
          mode={mode}
          onModeChange={setMode}
          onBack={() => setView({ kind: 'history', id: report.id })}
        />
      ) : null}
    </section>
  );
}

const BAND_TONE: Record<Band, string> = {
  GREEN: 'bg-ok-bg text-ok',
  AMBER: 'bg-warn-bg text-warn',
  RED: 'bg-error-bg text-error',
};

function ScoreChip({ score }: { score: RunScore }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${BAND_TONE[score.band]}`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {score.label} <span className="tabular-nums">{score.value}</span>
    </span>
  );
}

function ReportCard({ report, runs, onOpen }: { report: HubReport; runs: RunSummary[] | 'error' | undefined; onOpen: () => void }) {
  const Art = ART[report.id];
  const latest = Array.isArray(runs) ? runs[0] : null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-hairline bg-page text-left transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
    >
      <div className="aspect-[2/1] overflow-hidden bg-field">
        <Art className="block size-full transition duration-500 group-hover:scale-[1.03]" />
      </div>
      <div className="grid flex-1 content-start gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-0.5">
            <h2 className="text-lg font-semibold tracking-tight">{report.label}</h2>
            <p className="text-sm text-fg-muted">{report.hint}</p>
          </div>
          {Array.isArray(runs) ? <span className="shrink-0 rounded-full bg-field px-2.5 py-1 text-xs text-fg-muted">{runs.length} тайлан</span> : null}
        </div>
        <p className="text-sm text-pretty text-fg-muted">{report.description}</p>
        <div className="flex min-h-7 flex-wrap gap-2">
          {latest ? latest.scores.map((s) => <ScoreChip key={s.label} score={s} />) : null}
          {runs === undefined ? <span className="h-7 w-40 animate-pulse rounded-full bg-field" /> : null}
          {runs === 'error' ? <span className="text-xs text-error">Тайлан ачаалж чадсангүй</span> : null}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-hairline px-5 py-3 text-sm">
        <span className="text-fg-muted">{latest ? `Сүүлийн тайлан: ${fmtRunDate(latest.date)}` : ' '}</span>
        <span className="inline-flex items-center gap-1 font-medium">
          Тайлангууд
          <ChevronRight aria-hidden className="size-4 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-hairline bg-page px-3 text-sm hover:bg-field focus-visible:outline-2 focus-visible:outline-fg"
    >
      <ArrowLeft aria-hidden className="size-4" />
      {label}
    </button>
  );
}

function RunHistory({
  report,
  runs,
  locked,
  onBack,
  onOpen,
}: {
  report: HubReport;
  runs: RunSummary[] | 'error' | undefined;
  locked: boolean;
  onBack: () => void;
  onOpen: (date: string) => void;
}) {
  const Art = ART[report.id];
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <BackButton label="Business hub" onClick={onBack} />
      </div>
      <div className="flex items-center gap-4 overflow-hidden rounded-2xl border border-hairline bg-page">
        <Art className="block h-24 w-40 shrink-0 max-sm:hidden" />
        <div className="grid gap-1 p-4 sm:pl-0">
          <h2 className="text-lg font-semibold tracking-tight">{report.label}</h2>
          <p className="text-sm text-fg-muted">
            {Array.isArray(runs) ? `${runs.length} тайлан, шинэ нь эхэндээ.` : report.hint}
            {locked ? ' Захиалгагүй үед тайлан бүрийн эхний хэсэг харагдана.' : ''}
          </p>
        </div>
      </div>
      {runs === undefined ? (
        <ul className="grid gap-2" aria-busy>
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-20 animate-pulse rounded-xl bg-page" />
          ))}
        </ul>
      ) : runs === 'error' ? (
        <p className="rounded-xl bg-error-bg px-4 py-3 text-sm text-error">Тайлангийн жагсаалт ачаалж чадсангүй. Шинэчлэх товчийг дарна уу.</p>
      ) : (
        <ul className="grid gap-2">
          {runs.map((run, i) => {
            const [y, m, d] = run.date.split('-');
            return (
              <li key={run.date}>
                <button
                  type="button"
                  onClick={() => onOpen(run.date)}
                  className="group flex w-full items-center gap-4 rounded-xl border border-hairline bg-page p-4 text-left transition hover:bg-field focus-visible:outline-2 focus-visible:outline-fg"
                >
                  <span className="grid w-14 shrink-0 justify-items-center rounded-lg bg-field py-1.5 group-hover:bg-page">
                    <span className="text-xl leading-tight font-semibold tabular-nums">{+d}</span>
                    <span className="text-[11px] text-fg-muted tabular-nums">
                      {y}.{m}
                    </span>
                  </span>
                  <span className="grid min-w-0 flex-1 gap-1.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{fmtRunDate(run.date)}</span>
                      {i === 0 ? <span className="rounded-full bg-action px-2 py-0.5 text-[11px] font-medium text-on-action">Сүүлийн</span> : null}
                      {run.scores.map((s) => (
                        <ScoreChip key={s.label} score={s} />
                      ))}
                    </span>
                    <span className="line-clamp-2 text-sm text-fg-muted">{run.lead}</span>
                  </span>
                  <ChevronRight aria-hidden className="size-5 shrink-0 text-fg-muted transition group-hover:translate-x-0.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RunReader({
  report,
  date,
  latest,
  stamp,
  locked,
  mode,
  onModeChange,
  onBack,
}: {
  report: HubReport;
  date: string;
  latest: boolean;
  stamp: number;
  locked: boolean;
  mode: ReportMode;
  onModeChange: (mode: ReportMode) => void;
  onBack: () => void;
}) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applyMode(frame.current, mode);
  }, [mode]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <BackButton label={report.label} onClick={onBack} />
          <h2 className="text-base font-semibold tracking-tight">
            {fmtRunDate(date)}
            {latest ? <span className="ml-2 align-middle text-xs font-normal text-fg-muted">сүүлийн тайлан</span> : null}
          </h2>
        </div>
        {locked ? null : (
          <div className="flex flex-wrap items-center gap-2">
            <ModeToggle mode={mode} onChange={onModeChange} />
            <a
              href={`/report/?id=${report.id}&run=${date}&mode=${mode}`}
              target="_blank"
              rel="noopener"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-hairline bg-page px-3 text-sm hover:bg-field focus-visible:outline-2 focus-visible:outline-fg"
            >
              <ExternalLink aria-hidden className="size-4" />
              <span className="max-sm:sr-only">Шинэ цонхонд</span>
            </a>
          </div>
        )}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-hairline bg-page">
        <div className={locked ? 'pointer-events-none relative overflow-hidden' : undefined} style={locked ? { height: report.previewHeight } : undefined}>
          <iframe
            ref={frame}
            src={`${report.src}?run=${date}&v=${stamp}`}
            title={`${report.label}, ${fmtRunDate(date)}`}
            onLoad={() => {
              hideSources(frame.current);
              applyMode(frame.current, mode);
              setLoading(false);
            }}
            tabIndex={locked ? -1 : undefined}
            scrolling={locked ? 'no' : undefined}
            className={locked ? 'block h-[1400px] w-full' : 'block h-[calc(100dvh-240px)] min-h-[560px] w-full'}
          />
          {locked ? <div aria-hidden className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent via-page/85 to-page" /> : null}
        </div>
        {locked ? <Paywall /> : null}
        {loading ? (
          <div aria-hidden className="absolute inset-0 grid place-items-center bg-page/70 backdrop-blur-[1px]">
            <RefreshCw className="size-6 animate-spin text-fg-muted" />
          </div>
        ) : null}
      </div>
    </div>
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
