'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { LogOut, Menu, Search, X } from 'lucide-react';
import { LazyMCorporateIntro } from '@/components/m-corporate-intro/LazyMCorporateIntro';
import { TIMELINE } from '@/components/m-corporate-intro/engine';
import { clearSession, writeSession, type Session } from '@/features/auth/session';
import { REGISTRATION_SECTIONS, type MenuItem } from './data';
import { Sidebar } from './Sidebar';
import { SessionTimer } from './SessionTimer';
import { VerificationCard } from './VerificationCard';
import { PromoCard } from './PromoCard';
import { DanWelcomeModal } from './DanWelcomeModal';
import { BusinessHub } from '@/features/hub/BusinessHub';

const SESSION_KEY = 'mcorp.session';
const noopSubscribe = () => () => {};
function readRaw() {
  try {
    return window.sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function InternetBankHome() {
  const router = useRouter();
  // `undefined` while hydrating, `null` when signed out.
  const raw = useSyncExternalStore(noopSubscribe, readRaw, () => undefined);
  const session = useMemo<Session | null | undefined>(() => {
    if (raw === undefined) return undefined;
    try {
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  }, [raw]);

  useEffect(() => {
    if (session === null) router.replace('/');
  }, [session, router]);

  if (!session) return <div className="min-h-dvh bg-stage" />;
  return <Home session={session} />;
}

function Home({ session }: { session: Session }) {
  const router = useRouter();
  const [welcomeDone, setWelcomeDone] = useState(!session.justActivated);
  const [danOpen, setDanOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<'home' | 'hub'>('home');
  // Bumped on every "Business hub" click; used as the hub's key so each click reloads the reports.
  const [hubLoads, setHubLoads] = useState(0);
  const [filled, setFilled] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        REGISTRATION_SECTIONS.filter((s) => session.credentials === 'permanent' || s.filledAtOnboarding).map((s) => s.id),
      ),
  );

  // Temporary credentials keep the menu locked until the bank verifies the registration.
  const locked = session.credentials === 'temporary';

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const logout = useCallback(() => {
    clearSession();
    router.replace('/');
  }, [router]);

  function finishWelcome() {
    writeSession({ ...session, justActivated: false });
    setWelcomeDone(true);
    window.setTimeout(() => setDanOpen(true), 450);
  }

  async function connectDan() {
    await new Promise((r) => setTimeout(r, 1600));
    setFilled(new Set(REGISTRATION_SECTIONS.map((s) => s.id)));
    setDanOpen(false);
    setToast('ДАН-аас мэдээллийг амжилттай татлаа');
  }

  function navigate(item: MenuItem) {
    setDrawer(false);
    if (item.id === 'home') setView('home');
    else if (item.id === 'hub') {
      setView('hub');
      setHubLoads((n) => n + 1);
    } else setToast(`«${item.label}» туршилтын хувилбарт ороогүй`);
  }

  const sidebar = <Sidebar org={session.org} locked={locked} query={query} activeId={view} onNavigate={navigate} />;

  return (
    <div className="min-h-dvh bg-app lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="hidden border-r border-hairline bg-app lg:sticky lg:top-0 lg:block lg:h-dvh">{sidebar}</aside>

      <AnimatePresence>
        {drawer ? (
          <motion.div className="fixed inset-0 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="Цэс хаах" onClick={() => setDrawer(false)} className="absolute inset-0 bg-fg/40" />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="absolute inset-y-0 left-0 w-[280px] bg-app pl-[env(safe-area-inset-left)] shadow-xl"
            >
              <button
                type="button"
                onClick={() => setDrawer(false)}
                aria-label="Цэс хаах"
                className="absolute top-[calc(env(safe-area-inset-top)+16px)] right-3 grid size-9 place-items-center rounded-lg hover:bg-field"
              >
                <X className="size-5" />
              </button>
              {sidebar}
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-hairline bg-app/90 px-[max(16px,env(safe-area-inset-left))] pt-[calc(env(safe-area-inset-top)+12px)] pb-3 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label="Цэс нээх"
            className="grid size-10 place-items-center rounded-xl border border-hairline bg-page lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <label className="relative min-w-0 flex-1 sm:max-w-[440px] lg:mx-auto">
            <span className="sr-only">Цэснээс хайх</span>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-fg-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Хайх утгаа оруулна уу"
              className="h-10 w-full rounded-xl border border-hairline bg-page pr-3 pl-10 text-sm outline-none placeholder:text-fg-faint focus:border-fg"
            />
          </label>
          <SessionTimer onExpire={logout} />
          <button
            type="button"
            onClick={logout}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-hairline bg-page px-3 text-sm hover:bg-field focus-visible:outline-2 focus-visible:outline-fg"
          >
            <LogOut aria-hidden className="size-4" />
            <span className="max-sm:sr-only">Гарах</span>
          </button>
        </header>

        {view === 'hub' ? (
          <main className="px-[max(16px,env(safe-area-inset-left))] py-6 sm:px-6">
            <BusinessHub key={hubLoads} />
          </main>
        ) : (
        <main className="grid gap-6 px-[max(16px,env(safe-area-inset-left))] py-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_330px] xl:items-start">
          <div className="grid min-w-0 animate-[fade-in_.6s_ease-out_both] gap-6 [animation-delay:150ms]">
            <p className="text-sm text-fg-muted">
              Сайн байна уу, <span className="font-medium text-fg">{session.personName}</span>
            </p>
            <VerificationCard session={session} filled={filled} onFill={() => setDanOpen(true)} />
          </div>
          <div className="animate-[fade-in_.6s_ease-out_both] [animation-delay:300ms]">
            <PromoCard />
          </div>
        </main>
        )}
      </div>

      <DanWelcomeModal open={danOpen} onClose={() => setDanOpen(false)} onConnectDan={connectDan} />

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+20px)] z-50 flex justify-center px-4">
        <AnimatePresence>
          {toast ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="rounded-xl bg-fg px-4 py-3 text-sm text-page shadow-lg"
            >
              {toast}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      {!welcomeDone ? <WelcomeHandoff orgName={session.org.name} onDone={finishWelcome} /> : null}
    </div>
  );
}

/**
 * Continues the login intro on this page: opens on the same final frame
 * (lockup + welcome) and fades out to reveal the internet bank.
 */
function WelcomeHandoff({ orgName, onDone }: { orgName: string; onDone: () => void }) {
  const [ready, setReady] = useState(false);
  const caption = useMemo(() => ({ lead: 'Тавтай морил, ', accent: orgName }), [orgName]);
  return (
    <motion.div
      aria-hidden
      className="fixed inset-0 z-[60] bg-stage"
      initial={{ opacity: 1 }}
      animate={{ opacity: ready ? 0 : 1 }}
      transition={{ duration: 0.8, delay: 0.35, ease: 'easeInOut' }}
      onAnimationComplete={() => {
        if (ready) onDone();
      }}
    >
      <LazyMCorporateIntro
        initialTime={TIMELINE.total}
        caption={caption}
        onTimeUpdate={() => {
          if (!ready) setReady(true);
        }}
      />
    </motion.div>
  );
}
