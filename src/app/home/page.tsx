import type { Metadata } from 'next';
import { InternetBankHome } from '@/features/home/InternetBankHome';

export const metadata: Metadata = { title: 'Нүүр · M corporate' };

export default function HomePage() {
  return <InternetBankHome />;
}
