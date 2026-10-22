'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { DEMO_ACCOUNTS } from '@/features/auth/api';
import { resetActivated } from '@/features/auth/session';

/** Test accounts for the prototype. Remove before connecting the real auth service. */
export function DemoAccounts({ onPick }: { onPick: (username: string, password: string) => void }) {
  const [reset, setReset] = useState(false);
  return (
    <section aria-labelledby="demo-title" className="mt-2 grid gap-2 rounded-2xl border border-dashed border-hairline p-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 id="demo-title" className="text-xs font-medium tracking-[0.06em] text-fg-muted uppercase">
          Туршилтын эрхүүд
        </h2>
        <button
          type="button"
          onClick={() => {
            resetActivated();
            setReset(true);
          }}
          className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg"
        >
          <RotateCcw aria-hidden className="size-3" />
          {reset ? 'Анхны нэвтрэлт сэргээгдлээ' : 'Анхны нэвтрэлтийг сэргээх'}
        </button>
      </div>
      <ul className="grid gap-1">
        {DEMO_ACCOUNTS.map((a) => (
          <li key={a.username}>
            <button
              type="button"
              onClick={() => onPick(a.username, a.password)}
              className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-field focus-visible:outline-2 focus-visible:outline-fg"
            >
              <span className="min-w-0 font-mono text-[13px] text-fg">
                {a.username} <span className="text-fg-faint">/</span> {a.password}
              </span>
              <span className="shrink-0 text-xs text-fg-muted">{a.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
