import type { Metadata } from 'next';
import { PaywallReset } from '@/features/hub/PaywallReset';

export const metadata: Metadata = { title: 'Paywall сэргээх · Business hub · M corporate' };

export default function PaywallResetPage() {
  return <PaywallReset />;
}
