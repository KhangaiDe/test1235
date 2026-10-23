import type { Metadata } from 'next';
import { Checkout } from '@/features/hub/Checkout';

export const metadata: Metadata = { title: 'Захиалга · Business hub · M corporate' };

export default function SubscribePage() {
  return <Checkout />;
}
