import type { Metadata } from 'next';
import { LoginExperience } from '@/features/login/LoginExperience';

export const metadata: Metadata = { title: 'Нэвтрэх · M corporate' };

export default function LoginPage() {
  return <LoginExperience />;
}
