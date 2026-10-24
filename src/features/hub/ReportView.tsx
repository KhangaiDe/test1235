'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowLeft } from 'lucide-react';
import { hideSources } from './hideSources';
import { fmtRunDate } from './reportData';
import { HUB_REPORTS } from './reports';
import { LangToggle, ModeToggle, applyMode, readLang, readMode, type ReportLang, type ReportMode } from './shortView';

const noopSubscribe = () => () => {};
const readId = () => new URLSearchParams(window.location.search).get('id');
const readRun = () => new URLSearchParams(window.location.search).get('run');
const readStartLang = (): ReportLang => {
  const l = new URLSearchParams(window.location.search).get('lang');
  return l === 'mn' || l === 'en' ? l : readLang();
};
// The hub passes its current mode; otherwise fall back to the remembered one.
const readStartMode = (): ReportMode => {
  const m = new URLSearchParams(window.location.search).get('mode');
  return m === 'short' || m === 'long' ? m : readMode();
};

/**
 * Full-window view of one report run (`/report/?id=coal&run=2026-10-24&mode=short`; no run = newest), opened by "Шинэ цонхонд".
 * It goes through the hub's iframe instead of linking /hub/*.html directly, so
 * sources stay hidden here too.
 */
export function ReportView() {
  // undefined while prerendering: the static export has no URL to read.
  const id = useSyncExternalStore(noopSubscribe, readId, () => undefined);
  if (id === undefined) return <div className="min-h-dvh bg-app" />;
  return <ReportFrame id={id} />;
}

function ReportFrame({ id }: { id: string | null }) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const [stamp] = useState(() => Date.now());
  const [run] = useState(readRun);
  const [mode, setMode] = useState<ReportMode>(readStartMode);
  const [lang, setLang] = useState<ReportLang>(readStartLang);
  useEffect(() => applyMode(frame.current, mode), [mode]);
  const report = HUB_REPORTS.find((r) => r.id === id) ?? HUB_REPORTS[0];

  return (
    <div className="flex h-dvh flex-col bg-app">
      <header className="flex items-center gap-3 border-b border-hairline bg-page px-4 py-2">
        <a
          href="/home/?view=hub"
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-hairline px-3 text-sm hover:bg-field focus-visible:outline-2 focus-visible:outline-fg"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Business hub
        </a>
        <span className="truncate text-sm font-medium">
          {report.label}
          {run ? ` · ${fmtRunDate(run)}` : ''}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <LangToggle lang={lang} onChange={setLang} />
          <ModeToggle mode={mode} onChange={setMode} />
        </div>
      </header>
      <iframe
        ref={frame}
        key={lang}
        src={`${report.src}?${run ? `run=${run}&` : ''}lang=${lang}&v=${stamp}`}
        title={report.label}
        onLoad={() => {
          hideSources(frame.current);
          applyMode(frame.current, mode);
        }}
        className="block w-full flex-1"
      />
    </div>
  );
}
