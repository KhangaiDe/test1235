'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDownUp, LoaderCircle, Sun } from 'lucide-react';
import { MCorporateMark } from '@/components/m-corporate-intro/MCorporateMark';
import { REGISTRATION_SECTIONS, greeting } from './data';

export interface DanWelcomeModalProps {
  open: boolean;
  onClose: () => void;
  /** Real app: redirect to DAN (ДАН) sign-in. Prototype: resolves after a short wait. */
  onConnectDan: () => Promise<void>;
}

/** "Өдрийн мэнд" welcome from the Figma flow, offering to fill registration through DAN. */
export function DanWelcomeModal({ open, onClose, onConnectDan }: DanWelcomeModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  async function connect() {
    setConnecting(true);
    try {
      await onConnectDan();
    } finally {
      setConnecting(false);
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="dan-title"
      className="m-auto w-[min(640px,calc(100vw-32px))] max-w-none overflow-visible rounded-2xl bg-page p-0 text-fg shadow-2xl backdrop:bg-fg/45 backdrop:backdrop-blur-[2px] open:animate-[fade-in_.35s_ease-out_both]"
    >
      <div className="grid max-h-[calc(100dvh-32px)] gap-5 overflow-y-auto p-5 sm:p-7">
        <div className="grid gap-2">
          <h2 id="dan-title" className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            {greeting()}
            <Sun aria-hidden className="size-5 text-[#f2b01e]" />
          </h2>
          <p className="text-sm leading-relaxed text-fg-muted">
            ДАН | Танилт нэвтрэлтийн системээр нэвтэрч байгууллагынхаа мэдээллийг автоматаар бөглөх боломжтой.
          </p>
        </div>

        <div className="grid gap-5 rounded-2xl bg-stage p-5 text-ink sm:grid-cols-[150px_1fr] sm:p-6">
          <div aria-hidden className="flex items-center justify-center gap-3 sm:flex-col">
            <span className="grid size-16 place-items-center rounded-2xl border border-line bg-surface">
              <MCorporateMark className="size-9" />
            </span>
            <ArrowDownUp className="size-4 text-muted max-sm:rotate-90" />
            <span className="grid size-16 place-items-center rounded-2xl border border-line bg-surface text-base font-semibold tracking-[0.08em]">ДАН</span>
          </div>
          <div className="grid gap-3">
            <p className="text-sm font-medium">Автоматаар бөглөгдөх мэдээллүүд</p>
            <ul className="grid gap-1.5">
              {REGISTRATION_SECTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2 text-[13px]">
                    <span className="min-w-0">{s.label}</span>
                    <Icon aria-hidden className="size-4 shrink-0 text-muted" />
                  </li>
                );
              })}
            </ul>
            <div className="grid grid-cols-2 gap-2">
              <Stat value="15 мин" label="Шаардлагатай мэдээлэл бөглөхөд хэмнэх хугацаа" />
              <Stat value="45 мин" label="Гэрээ байгуулахад хэмнэх хугацаа" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-xl bg-field px-5 text-sm font-medium hover:bg-hairline focus-visible:outline-2 focus-visible:outline-fg"
          >
            Хаах
          </button>
          <button
            type="button"
            onClick={connect}
            disabled={connecting}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-action px-5 text-sm font-semibold text-on-action hover:bg-fg/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg disabled:cursor-wait"
          >
            {connecting ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
            {connecting ? 'ДАН-аас мэдээлэл татаж байна' : 'ДАН-р нэвтрэх'}
          </button>
        </div>
      </div>
    </dialog>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="grid gap-1 rounded-xl border border-line bg-surface px-3 py-3 text-center">
      <span className="text-xl font-semibold text-brand tabular-nums">{value}</span>
      <span className="text-[11px] leading-snug text-muted">{label}</span>
    </div>
  );
}
