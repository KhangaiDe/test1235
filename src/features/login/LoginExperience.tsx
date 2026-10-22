'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Phone, SkipForward } from 'lucide-react';
import { LazyMCorporateIntro } from '@/components/m-corporate-intro/LazyMCorporateIntro';
import { MCorporateMark } from '@/components/m-corporate-intro/MCorporateMark';
import type { IntroCaption, IntroPhase } from '@/components/m-corporate-intro/engine';
import { StatusPill } from '@/components/ui/StatusPill';
import { useMediaQuery } from '@/components/ui/useMediaQuery';
import { AuthError, prepareWorkspace, signIn } from '@/features/auth/api';
import { markActivated, writeRememberedUser, writeSession, type Session } from '@/features/auth/session';
import { LoginForm } from './LoginForm';
import type { LoginValues } from './schema';

/**
 * form      → signing in as usual
 * takeover  → first login with temporary credentials: the brand panel opens to
 *             full screen and the particles gather while the workspace loads
 * building  → workspace ready: the M mark assembles, ending on a welcome
 * done      → lockup on screen; hand off to /home
 */
type Stage = 'form' | 'takeover' | 'building' | 'done';

const PHASE: Record<Stage, IntroPhase> = { form: 'idle', takeover: 'gather', building: 'build', done: 'build' };
const STATUS: Record<Stage, string | null> = {
  form: null,
  takeover: 'Таны ажлын орчинг бэлтгэж байна',
  building: 'Таны M corporate нээгдэж байна',
  done: 'Бэлэн боллоо',
};
const HANDOFF_DELAY_MS = 1300;
const GENERIC_ERROR = 'Нэвтрэх үед алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.';

export function LoginExperience() {
  const router = useRouter();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [stage, setStage] = useState<Stage>('form');
  const [caption, setCaption] = useState<IntroCaption | undefined>();
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);
  const sessionRef = useRef<Session | null>(null);

  const takeover = stage !== 'form';

  // After the lockup has been on screen for a moment, enter the internet bank.
  useEffect(() => {
    if (stage !== 'done') return;
    const id = window.setTimeout(() => router.push('/home'), HANDOFF_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [stage, router]);

  async function handleSubmit(values: LoginValues): Promise<string | null> {
    let result;
    try {
      result = await signIn(values.username, values.password);
    } catch (err) {
      return err instanceof AuthError ? err.message : GENERIC_ERROR;
    }
    writeRememberedUser(values.remember ? result.session.username : null);

    if (!result.firstLogin) {
      writeSession(result.session);
      setLeaving(true);
      router.push('/home');
      return null;
    }

    // First login with temporary credentials: play the intro while the workspace loads.
    const session: Session = { ...result.session, justActivated: true };
    sessionRef.current = session;
    writeSession(session);
    const rect = submitRef.current?.getBoundingClientRect();
    setOrigin(rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null);
    setCaption({ lead: 'Тавтай морил, ', accent: session.org.name });
    setLeaving(true);
    setStage('takeover');

    await prepareWorkspace();
    setStage('building');
    return null;
  }

  function handleSettle(phase: IntroPhase) {
    if (phase !== 'build' || !sessionRef.current) return;
    markActivated(sessionRef.current.username);
    setStage('done');
  }

  function skip() {
    if (sessionRef.current) markActivated(sessionRef.current.username);
    router.push('/home');
  }

  const layerStyle = origin ? ({ '--ox': `${origin.x}px`, '--oy': `${origin.y}px` } as CSSProperties) : undefined;
  const mountIntro = isDesktop || takeover;

  return (
    <div className="relative min-h-dvh bg-page">
      {/* Intro layer: clipped to the brand panel on desktop, opens to full screen on a first login */}
      <div className="intro-layer" data-takeover={takeover} style={layerStyle} aria-hidden={!takeover}>
        {mountIntro ? <LazyMCorporateIntro phase={PHASE[stage]} caption={caption} onSettle={handleSettle} /> : null}

        <BrandPanelContent hidden={takeover} />

        {takeover ? (
          <>
            <div className="absolute top-[calc(env(safe-area-inset-top)+20px)] right-[max(20px,env(safe-area-inset-right))]">
              <StatusPill message={STATUS[stage]} done={stage === 'done'} />
            </div>
            <button
              type="button"
              onClick={skip}
              className="absolute right-[max(20px,env(safe-area-inset-right))] bottom-[calc(env(safe-area-inset-bottom)+20px)] inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-4 py-2.5 text-sm text-ink backdrop-blur-md hover:border-muted focus-visible:outline-2 focus-visible:outline-brand"
            >
              Алгасах
              <SkipForward aria-hidden className="size-4" />
            </button>
          </>
        ) : null}
      </div>

      {/* Form column */}
      <div
        inert={takeover}
        className="relative z-10 ml-auto flex min-h-dvh w-full flex-col px-[max(20px,env(safe-area-inset-left))] pt-[calc(env(safe-area-inset-top)+20px)] pb-[calc(env(safe-area-inset-bottom)+20px)] lg:w-(--login-form-w) lg:px-12"
      >
        <header className="flex items-center justify-between gap-3 lg:hidden">
          <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <MCorporateMark tone="light" className="size-[30px]" />
            corporate
          </div>
          <a href="tel:18002929" className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-fg-muted hover:text-fg">
            <Phone aria-hidden className="size-4 text-brand-deep" />
            1800-2929
          </a>
        </header>

        <main className="mx-auto my-auto w-full max-w-[408px] py-10">
          <LoginForm onSubmit={handleSubmit} submitRef={submitRef} busy={leaving} />
        </main>

        <footer className="text-center text-xs text-fg-faint">© 2026 М банк</footer>
      </div>
    </div>
  );
}

/** Copy on the dark brand panel (desktop). Sits inside the intro layer so it shares its clip. */
function BrandPanelContent({ hidden }: { hidden: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute top-(--login-gap) bottom-(--login-gap) left-(--login-gap) right-[calc(var(--login-form-w)+2*var(--login-gap))] hidden flex-col justify-between p-12 text-ink transition-opacity duration-500 lg:flex ${
        hidden ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-[28px] font-semibold tracking-tight">
          <MCorporateMark className="size-11" />
          corporate
        </div>
        <span className="inline-flex items-center gap-2 text-lg">
          <Phone aria-hidden className="size-5 text-brand" />
          1800-2929
        </span>
      </div>

      <div className="grid max-w-xl gap-5">
        <p className="text-xs font-medium tracking-[0.08em] text-muted uppercase">Байгууллагын интернэт банк</p>
        <p className="text-[clamp(2.5rem,4.4vw,4.5rem)] leading-[1.02] font-semibold tracking-[-0.025em] text-balance">
          Үргэлжлүүл, <span className="text-brand">өргөжүүл</span>
        </p>
        <p className="max-w-[40ch] text-[17px] leading-relaxed text-muted">
          Төлбөр, цалин, гадаад гүйлгээ, зээлээ нэг дороос удирдаарай.
        </p>
        <p className="mt-3 inline-flex max-w-[46ch] items-start gap-3 rounded-2xl border border-line bg-surface/70 px-4 py-3 text-sm leading-relaxed text-ink backdrop-blur-md">
          <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
          Цахимаар бүртгүүлсэн бол үүсгэсэн нэвтрэх нэр, нууц үгээрээ 30 хоногийн дотор нэвтэрч бүртгэлээ баталгаажуулна уу.
        </p>
      </div>
    </div>
  );
}
