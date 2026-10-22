'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { LazyMCorporateIntro } from '@/components/m-corporate-intro/LazyMCorporateIntro';
import { MCorporateMark } from '@/components/m-corporate-intro/MCorporateMark';
import type { IntroPhase } from '@/components/m-corporate-intro/engine';
import { OnboardingForm } from './OnboardingForm';
import { StatusPill } from './StatusPill';
import { OnboardingError, connectOrganization } from './api';
import type { OnboardingValues } from './schema';

type Stage = 'form' | 'connecting' | 'building' | 'done' | 'rewinding';

const PHASE_FOR_STAGE: Record<Stage, IntroPhase> = {
  form: 'idle',
  rewinding: 'idle',
  connecting: 'gather',
  building: 'build',
  done: 'build',
};

const CONNECTING_STEPS = ['Байгууллагын мэдээллийг татаж байна', 'Данснуудыг холбож байна'] as const;
const GENERIC_ERROR = 'Холболт амжилтгүй боллоо. Түр хүлээгээд дахин оролдоно уу.';

export function OnboardingExperience() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('form');
  const [connectStep, setConnectStep] = useState(0);
  const registerRef = useRef('');

  // Second status line while the request is still running.
  useEffect(() => {
    if (stage !== 'connecting') return;
    const id = window.setTimeout(() => setConnectStep(1), 2400);
    return () => window.clearTimeout(id);
  }, [stage]);

  // After the lockup has been on screen for a moment, open the dashboard.
  useEffect(() => {
    if (stage !== 'done') return;
    const id = window.setTimeout(() => {
      router.push(`/dashboard?org=${encodeURIComponent(registerRef.current)}`);
    }, 1400);
    return () => window.clearTimeout(id);
  }, [stage, router]);

  async function handleSubmit(values: OnboardingValues): Promise<string | null> {
    registerRef.current = values.registerNumber;
    setConnectStep(0);
    setStage('connecting');
    try {
      await connectOrganization(values);
      setStage('building');
      return null;
    } catch (err) {
      setStage('rewinding');
      return err instanceof OnboardingError ? err.message : GENERIC_ERROR;
    }
  }

  function handleSettle(phase: IntroPhase) {
    if (phase === 'build') setStage('done');
    if (phase === 'idle') setStage((s) => (s === 'rewinding' ? 'form' : s));
  }

  const status =
    stage === 'connecting'
      ? CONNECTING_STEPS[connectStep]
      : stage === 'building'
        ? 'M corporate-ийг бэлтгэж байна'
        : stage === 'done'
          ? 'Бэлэн боллоо'
          : null;

  const formVisible = stage === 'form';

  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-stage">
      <div className="absolute inset-0 -z-10">
        <LazyMCorporateIntro phase={PHASE_FOR_STAGE[stage]} onSettle={handleSettle} />
      </div>

      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-[max(16px,env(safe-area-inset-left))] pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+24px)] sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <MCorporateMark className="size-[30px]" />
            corporate
          </div>
          <StatusPill message={status} done={stage === 'done'} />
        </header>

        <motion.main
          className="my-auto grid w-full max-w-xl gap-7 py-10"
          initial={false}
          animate={formVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: -14 }}
          transition={{ duration: formVisible ? 0.5 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          inert={!formVisible}
          aria-hidden={!formVisible}
        >
          <div className="grid gap-4">
            <p className="text-xs font-medium tracking-[0.08em] text-muted uppercase">Байгууллагын интернэт банк</p>
            <h1 className="text-[clamp(2.25rem,6vw,4rem)] leading-[1.02] font-semibold tracking-[-0.025em] text-balance">
              Үргэлжлүүл, <span className="text-brand">өргөжүүл</span>
            </h1>
            <p className="max-w-[34ch] text-[17px] leading-relaxed text-muted">
              Байгууллагынхаа данс, төлбөр, цалин, зээлийг нэг дороос удирдаарай.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface/80 p-5 backdrop-blur-md sm:p-6">
            <OnboardingForm onSubmit={handleSubmit} />
          </div>
        </motion.main>
      </div>
    </div>
  );
}
