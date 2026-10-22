'use client';

import dynamic from 'next/dynamic';

/**
 * Client-only, code-split version of the intro. The canvas has nothing to
 * render on the server, and this keeps the engine out of other routes' bundles.
 */
export const LazyMCorporateIntro = dynamic(() => import('./MCorporateIntro'), {
  ssr: false,
  loading: () => null,
});
