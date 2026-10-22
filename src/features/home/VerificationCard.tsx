'use client';

import { motion } from 'motion/react';
import { CircleCheck, Info } from 'lucide-react';
import { daysLeft, formatDate, type Session } from '@/features/auth/session';
import { REGISTRATION_SECTIONS } from './data';

export interface VerificationCardProps {
  session: Session;
  /** Sections filled so far. */
  filled: ReadonlySet<string>;
  onFill: () => void;
}

export function VerificationCard({ session, filled, onFill }: VerificationCardProps) {
  const total = REGISTRATION_SECTIONS.length;
  const done = REGISTRATION_SECTIONS.filter((s) => filled.has(s.id)).length;
  const pct = Math.round((done / total) * 100);
  const complete = done === total;
  const verified = session.credentials === 'permanent';
  const temporary = session.credentials === 'temporary' && session.tempValidUntil;
  const title = verified ? 'Бүртгэл баталгаажсан' : complete ? 'Бүх мэдээлэл бөглөгдлөө' : 'Бүртгэл баталгаажуулах';
  const body = verified
    ? 'Байгууллагын бүртгэл баталгаажсан тул бүх үйлчилгээ нээлттэй.'
    : complete
      ? 'Банк мэдээллийг тань хянасны дараа байнгын эрх нээгдэж, бүх цэс идэвхжинэ.'
      : 'Банкны бүтээгдэхүүн, үйлчилгээг бүрэн авахын тулд шаардлагатай мэдээллүүдийг бөглөж өгнө үү.';

  return (
    <section aria-labelledby="verify-title" className="grid gap-6 rounded-2xl border border-hairline bg-page p-6 sm:p-7">
      <div className="grid gap-2">
        <h1 id="verify-title" className="flex items-center gap-3 text-xl font-semibold tracking-tight">
          <span aria-hidden className="h-6 w-1 rounded-full bg-brand" />
          {title}
        </h1>
        <p className="max-w-[62ch] text-sm leading-relaxed text-fg-muted">{body}</p>
      </div>

      <div className="grid gap-2.5">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">Бүртгэлийн явц</span>
          <span className="font-semibold tabular-nums">{pct}%</span>
        </div>
        <div
          role="progressbar"
          aria-label="Бүртгэлийн явц"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="h-2 overflow-hidden rounded-full bg-field"
        >
          <motion.div
            className="h-full rounded-full bg-brand"
            initial={false}
            animate={{ width: `${Math.max(pct, 2)}%` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      {temporary ? (
        <p className="flex items-start gap-2.5 rounded-xl bg-info-bg px-4 py-3 text-sm leading-relaxed">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-info" />
          <span>
            Таны түр нэвтрэх эрх <b className="font-semibold tabular-nums">{formatDate(session.tempValidUntil!)}</b> хүртэл хүчинтэй
            (<span className="tabular-nums">{daysLeft(session.tempValidUntil!)}</span> хоног үлдсэн). Бүртгэлээ баталгаажуулснаар байнгын эрх нээгдэнэ.
          </span>
        </p>
      ) : null}

      <ul className="grid gap-3 md:grid-cols-2">
        {REGISTRATION_SECTIONS.map((s) => {
          const ok = filled.has(s.id);
          const Icon = s.icon;
          return (
            <li key={s.id} className="flex min-h-14 items-center gap-3 rounded-xl border border-hairline px-4 py-3">
              <Icon aria-hidden className="size-[18px] shrink-0 text-fg-muted" />
              <span className="min-w-0 flex-1 text-sm leading-snug">{s.label}</span>
              {ok ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ok-bg px-2.5 py-1 text-xs font-medium text-ok">
                  <CircleCheck aria-hidden className="size-3.5" />
                  Бөглөсөн
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-warn-bg px-2.5 py-1 text-xs font-medium text-warn">Дутуу</span>
                  <button
                    type="button"
                    onClick={onFill}
                    className="rounded-lg bg-field px-3 py-1.5 text-xs font-medium hover:bg-hairline focus-visible:outline-2 focus-visible:outline-fg"
                  >
                    Бөглөх
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
