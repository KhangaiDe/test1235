'use client';

import { Lock } from 'lucide-react';
import { MCorporateMark } from '@/components/m-corporate-intro/MCorporateMark';
import type { Organization } from '@/features/auth/session';
import { FEEDBACK_ITEM, FOR_YOU_MENU, MAIN_MENU, type MenuItem } from './data';

const LOCKED_HINT = 'Бүртгэлээ баталгаажуулсны дараа нээгдэнэ';

export interface SidebarProps {
  org: Organization;
  locked: boolean;
  query: string;
  onNavigate: (item: MenuItem) => void;
}

export function Sidebar({ org, locked, query, onNavigate }: SidebarProps) {
  const q = query.trim().toLowerCase();
  const match = (i: MenuItem) => !q || i.label.toLowerCase().includes(q);
  const main = MAIN_MENU.filter(match);
  const forYou = FOR_YOU_MENU.filter(match);

  return (
    <nav aria-label="Үндсэн цэс" className="flex h-full flex-col gap-5 overflow-y-auto px-4 pt-[calc(env(safe-area-inset-top)+20px)] pb-5">
      <div className="flex items-center gap-2 px-2 text-lg font-semibold tracking-tight">
        <MCorporateMark tone="light" className="size-[30px]" />
        corporate
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-hairline bg-page p-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand text-sm font-semibold text-on-brand">{org.initials}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{org.name}</span>
          <span className="block text-xs text-fg-muted tabular-nums">Регистр {org.registerNumber}</span>
        </span>
      </div>

      <Group title="Үндсэн цэс" items={main} locked={locked} onNavigate={onNavigate} />
      {forYou.length ? <Group title="Танд" items={forYou} locked={locked} onNavigate={onNavigate} /> : null}
      {!main.length && !forYou.length ? <p className="px-3 text-sm text-fg-muted">Илэрц олдсонгүй</p> : null}

      <div className="mt-auto">
        <Item item={FEEDBACK_ITEM} locked={false} active={false} onNavigate={onNavigate} />
      </div>
    </nav>
  );
}

function Group({ title, items, locked, onNavigate }: { title: string; items: readonly MenuItem[]; locked: boolean; onNavigate: (i: MenuItem) => void }) {
  return (
    <div className="grid gap-0.5">
      <p className="px-3 pb-1 text-xs text-fg-muted">{title}</p>
      <ul className="grid gap-0.5">
        {items.map((item) => (
          <li key={item.id}>
            <Item item={item} locked={locked && item.needsVerification} active={item.id === 'home'} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Item({ item, locked, active, onNavigate }: { item: MenuItem; locked: boolean; active: boolean; onNavigate: (i: MenuItem) => void }) {
  const Icon = item.icon;
  if (locked) {
    return (
      <span
        aria-disabled
        title={LOCKED_HINT}
        className="flex h-10 cursor-not-allowed items-center gap-3 rounded-lg px-3 text-sm text-fg-faint"
      >
        <Icon aria-hidden className="size-[18px] shrink-0" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <Lock aria-hidden className="size-3.5 shrink-0" />
        <span className="sr-only">, {LOCKED_HINT}</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      onClick={() => onNavigate(item)}
      className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-fg ${
        active ? 'bg-field font-semibold text-fg' : 'text-fg hover:bg-field'
      }`}
    >
      <Icon aria-hidden className={`size-[18px] shrink-0 ${active ? 'text-brand-deep' : 'text-fg-muted'}`} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </button>
  );
}
