import type { Metadata } from 'next';
import { IntroPlayground } from './IntroPlayground';

export const metadata: Metadata = { title: 'Intro playground · M corporate' };

/** Review tool for designers and developers: scrub, replay and slow down the intro. */
export default function PlaygroundPage() {
  return <IntroPlayground />;
}
