'use client';

import { useEffect, useState } from 'react';
import { AlarmClock, RefreshCw } from 'lucide-react';

const SESSION_SECONDS = 15 * 60;

/** Idle-session countdown from the Figma top bar. Calls `onExpire` at 0; the refresh button extends it. */
export function SessionTimer({ onExpire }: { onExpire: () => void }) {
  const [deadline, setDeadline] = useState(() => Date.now() + SESSION_SECONDS * 1000);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const left = Math.max(0, Math.round((deadline - now) / 1000));
  useEffect(() => {
    if (left === 0) onExpire();
  }, [left, onExpire]);

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const low = left <= 60;

  return (
    <div className="flex h-10 items-center gap-1 rounded-xl border border-hairline bg-page pr-1 pl-3">
      <AlarmClock aria-hidden className={`size-[18px] ${low ? 'text-error' : 'text-fg'}`} />
      <span className={`w-11 text-sm font-medium tabular-nums ${low ? 'text-error' : ''}`} role="timer" aria-label={`Сесс дуусахад ${mm}:${ss}`}>
        {mm}:{ss}
      </span>
      <button
        type="button"
        onClick={() => setDeadline(Date.now() + SESSION_SECONDS * 1000)}
        aria-label="Сессийг сунгах"
        title="Сессийг сунгах"
        className="grid size-8 place-items-center rounded-lg text-fg-muted hover:bg-field hover:text-fg focus-visible:outline-2 focus-visible:outline-fg"
      >
        <RefreshCw aria-hidden className="size-4" />
      </button>
    </div>
  );
}
