'use client';

import { useRef, useState } from 'react';
import MCorporateIntro, { type MCorporateIntroHandle } from '@/components/m-corporate-intro/MCorporateIntro';
import { TIMELINE } from '@/components/m-corporate-intro/engine';

const SPEEDS = [1, 0.5, 0.25] as const;

export function IntroPlayground() {
  const intro = useRef<MCorporateIntroHandle>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);

  function play() {
    const from = intro.current?.getTime() ?? 0;
    if (from >= TIMELINE.total) intro.current?.seek(0);
    intro.current?.playTo(TIMELINE.total);
    setPlaying(true);
  }
  function pause() {
    intro.current?.seek(intro.current.getTime());
    setPlaying(false);
  }
  function onTime(t: number) {
    setTime(t);
    if (playing && t >= TIMELINE.total) setPlaying(false);
  }

  const activeMark = TIMELINE.marks.reduce((acc, m, i) => (time >= m.t ? i : acc), 0);
  const pct = (time / TIMELINE.total) * 100;

  return (
    <div className="relative isolate h-dvh overflow-hidden bg-stage">
      <div className="absolute inset-0 -z-10">
        <MCorporateIntro ref={intro} speed={speed} onTimeUpdate={onTime} />
      </div>

      <div className="absolute inset-x-0 bottom-0 px-[max(16px,env(safe-area-inset-left))] pb-[calc(env(safe-area-inset-bottom)+14px)]">
        <div className="mx-auto grid max-w-4xl grid-cols-[auto_auto_1fr_auto] items-center gap-3 rounded-2xl border border-line bg-surface/85 px-4 py-3 backdrop-blur-md max-sm:grid-cols-[auto_auto_1fr]">
          <button
            type="button"
            onClick={playing ? pause : play}
            aria-label={playing ? 'Түр зогсоох' : 'Тоглуулах'}
            className="grid size-9 place-items-center rounded-lg border border-line hover:border-muted focus-visible:outline-2 focus-visible:outline-brand"
          >
            {playing ? (
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
                <rect x="3.5" y="2.8" width="3" height="10.4" rx="1" fill="currentColor" />
                <rect x="9.5" y="2.8" width="3" height="10.4" rx="1" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
                <path d="M4.5 2.8v10.4L13 8z" fill="currentColor" />
              </svg>
            )}
          </button>
          <span className="text-xs whitespace-nowrap text-muted tabular-nums">
            <b className="font-medium text-ink">{time.toFixed(2)}</b> / {TIMELINE.total.toFixed(2)} с
          </span>

          <div className="relative min-w-0 pb-5 max-sm:col-span-3 max-sm:row-start-2">
            <label htmlFor="scrub" className="sr-only">
              Анимацийн хугацаа
            </label>
            <input
              id="scrub"
              type="range"
              min={0}
              max={TIMELINE.total * 1000}
              step={10}
              value={Math.round(time * 1000)}
              onChange={(e) => {
                setPlaying(false);
                intro.current?.seek(Number(e.target.value) / 1000);
              }}
              style={{ background: `linear-gradient(90deg, var(--color-brand) ${pct}%, var(--color-line) ${pct}%)` }}
              className="h-[3px] w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-stage [&::-webkit-slider-thumb]:bg-ink"
            />
            <div className="absolute inset-x-0 bottom-0 h-4">
              {TIMELINE.marks.map((m, i) => (
                <span
                  key={m.label}
                  style={{ left: `${(m.t / TIMELINE.total) * 100}%` }}
                  className={`absolute top-0 border-l pl-1.5 text-[11px] leading-4 whitespace-nowrap ${
                    i === activeMark && time > 0 ? 'border-brand text-brand' : 'border-line text-muted'
                  }`}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-muted max-sm:col-start-3 max-sm:row-start-1 max-sm:justify-self-end">
            Хурд
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="rounded-lg border border-line bg-surface px-2 py-1.5 text-ink"
            >
              {SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s}×
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
