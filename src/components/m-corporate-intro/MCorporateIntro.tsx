'use client';

import { useEffect, useEffectEvent, useImperativeHandle, useRef, type Ref } from 'react';
import { useReducedMotion } from 'motion/react';
import { createIntroEngine, type IntroCaption, type IntroEngine, type IntroPhase } from './engine';

export interface MCorporateIntroHandle {
  /** Jump to a timeline position in seconds (review tools only). */
  seek(t: number): void;
  /** Play toward a timeline position in seconds (review tools only). */
  playTo(t: number): void;
  getTime(): number;
}

export interface MCorporateIntroProps {
  /**
   * Drives the animation. `idle` shows the star field (and rewinds to it),
   * `gather` swirls into a spinning sphere and holds there while you wait,
   * `build` assembles the mark and ends on the M corporate lockup.
   * Leave undefined when controlling the timeline through the ref.
   */
  phase?: IntroPhase;
  /** Line under the final lockup, e.g. a welcome with the organisation's name. */
  caption?: IntroCaption;
  /** Timeline position to open at (read once on mount). Use TIMELINE.total to open on the lockup. */
  initialTime?: number;
  /** Playback speed multiplier. */
  speed?: number;
  /** Fires once each time the current phase finishes. */
  onSettle?: (phase: IntroPhase) => void;
  /** Fires every frame with the timeline position in seconds. */
  onTimeUpdate?: (t: number) => void;
  className?: string;
  ref?: Ref<MCorporateIntroHandle>;
}

export default function MCorporateIntro({
  phase,
  caption,
  initialTime,
  speed = 1,
  onSettle,
  onTimeUpdate,
  className,
  ref,
}: MCorporateIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<IntroEngine | null>(null);
  const reducedMotion = useReducedMotion() ?? false;

  const handleSettle = useEffectEvent((p: IntroPhase) => onSettle?.(p));
  const handleTime = useEffectEvent((t: number) => onTimeUpdate?.(t));
  const initialPhase = useEffectEvent(() => phase);
  const initialOptions = useEffectEvent(() => ({ caption, initialTime }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createIntroEngine(canvas, {
      reducedMotion,
      ...initialOptions(),
      onSettle: (p) => handleSettle(p),
      onTimeUpdate: (t) => handleTime(t),
    });
    engineRef.current = engine;
    const start = initialPhase();
    if (start) engine.setPhase(start);
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (phase) engineRef.current?.setPhase(phase);
  }, [phase]);

  useEffect(() => {
    engineRef.current?.setSpeed(speed);
  }, [speed]);

  useEffect(() => {
    if (caption) engineRef.current?.setCaption(caption);
  }, [caption]);

  useImperativeHandle(
    ref,
    () => ({
      seek: (t) => engineRef.current?.seek(t),
      playTo: (t) => engineRef.current?.playTo(t),
      getTime: () => engineRef.current?.getTime() ?? 0,
    }),
    [],
  );

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="M corporate лого бөөмсөөс угсрагдаж буй анимаци"
      className={className ?? 'block h-full w-full font-sans'}
    />
  );
}
