import { Suspense } from 'react';
import Link from 'next/link';
import { MCorporateMark } from '@/components/m-corporate-intro/MCorporateMark';
import { OrganizationLine } from './OrganizationLine';

/** Placeholder for the real M corporate dashboard — the intro hands off here. */
export default function DashboardPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-10 px-[max(16px,env(safe-area-inset-left))] pt-[calc(env(safe-area-inset-top)+16px)] pb-10 sm:px-8">
      <header className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <MCorporateMark className="size-[30px]" />
        corporate
      </header>
      <main className="grid max-w-xl animate-[fade-in_.6s_ease-out_both] gap-4">
        <p className="text-xs font-medium tracking-[0.08em] text-muted uppercase">Хянах самбар</p>
        <h1 className="text-4xl leading-tight font-semibold tracking-tight text-balance">Тавтай морил</h1>
        <Suspense fallback={<p className="text-lg text-ink">Таны M corporate нээгдлээ.</p>}>
          <OrganizationLine />
        </Suspense>
        <p className="leading-relaxed text-muted">
          Энэ бол жишээ хуудас. Бодит хувилбарт энд байгууллагын данс, төлбөр, цалин, зээлийн мэдээлэл харагдана.
        </p>
        <Link href="/" className="justify-self-start text-brand underline-offset-4 hover:underline">
          Онбордингийг дахин үзэх
        </Link>
      </main>
    </div>
  );
}
