'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowLeft } from 'lucide-react';
import { hideSources } from './hideSources';
import { HUB_REPORTS } from './reports';
import { ModeToggle, applyMode, readMode, type ReportMode } from './shortView';

const noopSubscribe = () => () => {};
const readId = () => new URLSearchParams(window.location.search).get('id');
// The hub passes its current mode; otherwise fall back to the remembered one.
const readStartMode = (): ReportMode => {
  const m = new URLSearchParams(window.location.search).get('mode');
  return m === 'short' || m === 'long' ? m : readMode();
};

/**
 * Full-window view of one report (`/report/?id=coal&mode=short`), opened by "Шинэ цонхонд".
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
  const [mode, setMode] = useState<ReportMode>(readStartMode);
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
        <span className="truncate text-sm font-medium">{report.label}</span>
        <div className="ml-auto">
          <ModeToggle mode={mode} onChange={setMode} />
        </div>
      </header>
      <iframe
        ref={frame}
        src={`${report.src}?v=${stamp}`}
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
