import type { Metadata } from 'next';
import { ReportView } from '@/features/hub/ReportView';

export const metadata: Metadata = { title: 'Тайлан · Business hub · M corporate' };

export default function ReportPage() {
  return <ReportView />;
}
