'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, CreditCard, Landmark, LoaderCircle, QrCode, ShieldCheck } from 'lucide-react';
import { MCorporateMark } from '@/components/m-corporate-intro/MCorporateMark';
import type { Session } from '@/features/auth/session';
import {
  PLAN,
  formatDate,
  formatMnt,
  isActive,
  readSubscription,
  recordPayment,
  type PaymentMethod,
  type Subscription,
} from './subscription';

const SESSION_KEY = 'mcorp.session';
const noopSubscribe = () => () => {};
function readRaw() {
  try {
    return window.sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

/** Demo-only payment sources shown on the checkout page. */
const ACCOUNTS = [
  { id: 'cur-mnt', label: 'Харилцах данс · MNT', masked: '•••• 3478', balance: 48_250_000 },
  { id: 'cur-usd', label: 'Харилцах данс · USD → MNT', masked: '•••• 9120', balance: 12_400_000 },
];

const METHODS: { id: PaymentMethod; label: string; hint: string; icon: typeof Landmark }[] = [
  { id: 'account', label: 'Байгууллагын данс', hint: 'Дансаас шууд хасагдана', icon: Landmark },
  { id: 'card', label: 'Байгууллагын карт', hint: 'M corporate Credit Card', icon: CreditCard },
  { id: 'qpay', label: 'QPay', hint: 'Банкны аппаар QR уншуулна', icon: QrCode },
];

const METHOD_LABEL: Record<PaymentMethod, string> = {
  account: 'Байгууллагын данс',
  card: 'Байгууллагын карт',
  qpay: 'QPay',
};

/**
 * Links back to the hub are plain <a> (full load) so /home/ reads ?view=hub from the real URL.
 */
export function Checkout() {
  const router = useRouter();
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

  if (!session) return <div className="min-h-dvh bg-app" />;
  return <CheckoutForm session={session} />;
}

type Step = 'form' | 'paying' | 'done';

function CheckoutForm({ session }: { session: Session }) {
  const [current] = useState<Subscription | null>(() => readSubscription(session.username));
  const active = isActive(current) ? current : null;
  const renewing = active !== null;
  const [method, setMethod] = useState<PaymentMethod>('account');
  const [account, setAccount] = useState(ACCOUNTS[0].id);
  const [agree, setAgree] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [receipt, setReceipt] = useState<Subscription | null>(null);

  const nextEnd = useMemo(() => {
    const start = active ? new Date(active.validUntil) : new Date();
    start.setMonth(start.getMonth() + 1);
    return start.toISOString();
  }, [active]);

  async function pay() {
    setStep('paying');
    await new Promise((r) => setTimeout(r, 1600));
    setReceipt(recordPayment(session.username, method));
    setStep('done');
  }

  return (
    <div className="min-h-dvh bg-app">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-hairline bg-app/90 px-[max(16px,env(safe-area-inset-left))] pt-[calc(env(safe-area-inset-top)+12px)] pb-3 backdrop-blur-md sm:px-6">
        <a
          href="/home/?view=hub"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-hairline bg-page px-3 text-sm hover:bg-field focus-visible:outline-2 focus-visible:outline-fg"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Business hub
        </a>
        <div className="ml-auto flex items-center gap-2 text-base font-semibold tracking-tight">
          <MCorporateMark tone="light" className="size-7" />
          corporate
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-[max(16px,env(safe-area-inset-left))] py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {step === 'done' && receipt ? (
          <Success receipt={receipt} />
        ) : (
          <section aria-labelledby="pay-title" className="grid min-w-0 gap-6 rounded-2xl border border-hairline bg-page p-6">
            <div className="grid gap-1">
              <h1 id="pay-title" className="text-xl font-semibold tracking-tight">
                {renewing ? 'Захиалга сунгах' : 'Захиалгын төлбөр'}
              </h1>
              <p className="text-sm text-fg-muted">
                {active
                  ? `Таны захиалга ${formatDate(active.validUntil)} хүртэл идэвхтэй. Төлбөл нэг сараар сунгагдана.`
                  : 'Төлбөр хийгдмэгц Business hub-ийн тайлангууд бүтнээрээ нээгдэнэ.'}
              </p>
            </div>

            <fieldset className="grid gap-2" disabled={step === 'paying'}>
              <legend className="mb-2 text-sm font-medium">Төлбөрийн хэрэгсэл</legend>
              {METHODS.map((m) => {
                const Icon = m.icon;
                const selected = method === m.id;
                return (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition ${
                      selected ? 'border-fg bg-field' : 'border-hairline hover:bg-field'
                    }`}
                  >
                    <input
                      type="radio"
                      name="method"
                      value={m.id}
                      checked={selected}
                      onChange={() => setMethod(m.id)}
                      className="size-4 accent-[var(--color-fg)]"
                    />
                    <Icon aria-hidden className="size-5 shrink-0 text-fg-muted" />
                    <span className="grid min-w-0">
                      <span className="text-sm font-medium">{m.label}</span>
                      <span className="text-xs text-fg-muted">{m.hint}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>

            {method === 'account' ? (
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Хасагдах данс</span>
                <select
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  disabled={step === 'paying'}
                  className="h-12 rounded-xl border border-hairline bg-page px-3 text-sm outline-none focus:border-fg"
                >
                  {ACCOUNTS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} {a.masked} · үлдэгдэл {formatMnt(a.balance)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {method === 'card' ? (
              <div className="flex items-center gap-3 rounded-xl border border-hairline p-3.5">
                <span className="grid h-9 w-14 place-items-center rounded-md bg-stage text-[10px] font-semibold tracking-wider text-ink">M CORP</span>
                <span className="grid text-sm">
                  <span className="font-medium">M corporate Credit Card •••• 4417</span>
                  <span className="text-xs text-fg-muted">{session.org.name}</span>
                </span>
              </div>
            ) : null}

            {method === 'qpay' ? (
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-hairline p-4">
                <FakeQr />
                <p className="max-w-56 text-sm text-fg-muted">
                  Банкны аппаараа QR кодыг уншуулж, {formatMnt(PLAN.priceMnt)} төлнө үү. Дараа нь доорх товчийг дарна.
                </p>
              </div>
            ) : null}

            <label className="flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                disabled={step === 'paying'}
                className="mt-0.5 size-4 accent-[var(--color-fg)]"
              />
              <span className="text-fg-muted">
                Сар бүр {formatMnt(PLAN.priceMnt)} автоматаар төлөгдөхийг зөвшөөрч байна. Хүссэн үедээ цуцлах боломжтой.
              </span>
            </label>

            <button
              type="button"
              onClick={pay}
              disabled={!agree || step === 'paying'}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-action px-6 text-[15px] font-semibold text-on-action transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg disabled:opacity-50"
            >
              {step === 'paying' ? (
                <>
                  <LoaderCircle aria-hidden className="size-5 animate-spin" />
                  Гүйлгээ хийгдэж байна…
                </>
              ) : method === 'qpay' ? (
                'Төлбөр төлсөн'
              ) : (
                `Төлөх ${formatMnt(PLAN.priceMnt)}`
              )}
            </button>
            <DemoNote />
          </section>
        )}

        <aside aria-label="Захиалгын мэдээлэл" className="grid gap-4 rounded-2xl border border-hairline bg-page p-6">
          <p className="text-sm font-medium text-fg-muted">Таны захиалга</p>
          <div className="grid gap-1">
            <p className="text-lg font-semibold tracking-tight">{PLAN.name}</p>
            <p className="text-sm text-fg-muted">Коксжих нүүрс · USD/MNT ханшийн тайлан</p>
          </div>
          <ul className="grid gap-2 text-sm">
            {['Тайлангийн бүрэн хувилбар', 'График, дохионы хүснэгт, эх сурвалж', 'Шинэ тайлан гарах бүрд шууд нээгдэнэ'].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />
                {t}
              </li>
            ))}
          </ul>
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-t border-hairline pt-4 text-sm">
            <dt className="text-fg-muted">Сарын төлбөр</dt>
            <dd className="text-right tabular-nums">{formatMnt(PLAN.priceMnt)}</dd>
            <dt className="text-fg-muted">Хүчинтэй</dt>
            <dd className="text-right tabular-nums">{formatDate(nextEnd)} хүртэл</dd>
            <dt className="font-semibold">Нийт</dt>
            <dd className="text-right font-semibold tabular-nums">{formatMnt(PLAN.priceMnt)}</dd>
          </dl>
          <p className="flex items-center gap-1.5 text-xs text-fg-muted">
            <ShieldCheck aria-hidden className="size-3.5" />
            {session.org.name} · {session.personName}
          </p>
        </aside>
      </main>
    </div>
  );
}

function Success({ receipt }: { receipt: Subscription }) {
  return (
    <section aria-labelledby="done-title" className="grid min-w-0 justify-items-start gap-6 rounded-2xl border border-hairline bg-page p-6">
      <span className="grid size-12 place-items-center rounded-full bg-ok-bg text-ok">
        <Check aria-hidden className="size-6" />
      </span>
      <div className="grid gap-1">
        <h1 id="done-title" className="text-xl font-semibold tracking-tight">
          Төлбөр амжилттай
        </h1>
        <p className="text-sm text-fg-muted">Business hub-ийн тайлангууд {formatDate(receipt.validUntil)} хүртэл бүтнээрээ нээлттэй.</p>
      </div>
      <dl className="grid w-full grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-xl bg-field p-4 text-sm">
        <dt className="text-fg-muted">Гүйлгээний дугаар</dt>
        <dd className="text-right font-mono text-[13px]">{receipt.reference}</dd>
        <dt className="text-fg-muted">Огноо</dt>
        <dd className="text-right tabular-nums">{formatDate(receipt.paidAt)}</dd>
        <dt className="text-fg-muted">Дүн</dt>
        <dd className="text-right tabular-nums">{formatMnt(receipt.priceMnt)}</dd>
        <dt className="text-fg-muted">Төлбөрийн хэрэгсэл</dt>
        <dd className="text-right">{METHOD_LABEL[receipt.method]}</dd>
        <dt className="text-fg-muted">Дараагийн төлбөр</dt>
        <dd className="text-right tabular-nums">{formatDate(receipt.validUntil)}</dd>
      </dl>
      <a
        href="/home/?view=hub"
        className="inline-flex h-12 items-center justify-center rounded-xl bg-brand px-6 text-[15px] font-semibold text-on-brand transition hover:bg-brand-deep hover:text-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
      >
        Тайлан унших
      </a>
      <DemoNote />
    </section>
  );
}

function DemoNote() {
  return <p className="text-xs text-fg-faint">Туршилтын хувилбар: бодит гүйлгээ хийгдэхгүй, мөнгө хасагдахгүй.</p>;
}

/** Decorative QR-like pattern for the demo; it encodes nothing. */
function FakeQr() {
  const cells = useMemo(() => {
    const out: boolean[] = [];
    let seed = 7;
    for (let i = 0; i < 21 * 21; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      out.push(seed % 3 === 0);
    }
    return out;
  }, []);
  const finder = (x: number, y: number) =>
    [
      [0, 0],
      [14, 0],
      [0, 14],
    ].some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
  const finderOn = (x: number, y: number) => {
    const fx = x >= 14 ? 14 : 0;
    const fy = y >= 14 ? 14 : 0;
    const dx = x - fx;
    const dy = y - fy;
    return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
  };
  return (
    <svg viewBox="0 0 21 21" className="size-32 shrink-0 rounded-lg bg-page p-1.5 ring-1 ring-hairline" role="img" aria-label="QPay QR код (туршилт)">
      {cells.map((on, i) => {
        const x = i % 21;
        const y = Math.floor(i / 21);
        const fill = finder(x, y) ? finderOn(x, y) : on;
        return fill ? <rect key={i} x={x} y={y} width="1" height="1" fill="var(--color-fg)" /> : null;
      })}
    </svg>
  );
}
