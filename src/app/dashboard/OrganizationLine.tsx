'use client';

import { useSearchParams } from 'next/navigation';

/** Reads ?org= on the client so the dashboard can be exported as static HTML. */
export function OrganizationLine() {
  const org = useSearchParams().get('org');
  const register = org && /^\d{7}$/.test(org) ? org : null;
  return (
    <p className="text-lg text-ink">
      {register ? (
        <>
          Регистр <span className="tabular-nums">{register}</span> бүхий байгууллагын M corporate нээгдлээ.
        </>
      ) : (
        'Таны M corporate нээгдлээ.'
      )}
    </p>
  );
}
