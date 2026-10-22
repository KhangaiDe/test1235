import type { Metadata } from 'next';
import { ttFirs } from '@/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'M corporate',
  description: 'Байгууллагын интернэт банк',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="mn" className={`${ttFirs.variable} h-full`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
