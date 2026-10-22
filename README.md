# M corporate onboarding intro

A Next.js App Router project that adds a Mercury-style particle intro to M corporate onboarding. The particles form a galaxy, then a sphere, then assemble the extruded M mark and settle into the **M corporate** lockup.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · React Hook Form + Zod · Motion. The animation is plain Canvas 2D with no runtime dependency.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

| Route         | What it is                                                         |
| ------------- | ------------------------------------------------------------------ |
| `/`           | Onboarding form wired to the intro                                 |
| `/dashboard`  | Placeholder page the intro hands off to                            |
| `/playground` | Review tool: scrub, replay, play at 0.5× or 0.25×                  |

In the demo, register number **0000000** makes the mock request fail, so you can see the error path.

## How the intro is driven

`<LazyMCorporateIntro phase={…} onSettle={…} />` is the only API the page needs.

| Phase    | What the user sees                                                               | Settles when                  |
| -------- | -------------------------------------------------------------------------------- | ----------------------------- |
| `idle`   | Star field. Coming from another phase, the animation rewinds to it               | Back at 0 s                   |
| `gather` | Stars swirl into a galaxy disk, then a sphere that keeps spinning while you wait | Reaches the hold point (4.6 s) |
| `build`  | Sphere assembles the 3D mark, then the crisp lockup and tagline                  | End of the timeline (10.8 s)  |

`src/features/onboarding/OnboardingExperience.tsx` maps form state to phases:

- **submit** → `gather` (the request is running)
- **request succeeds** → `build` → on settle, wait 1.4 s and `router.push('/dashboard')`
- **request fails** → `idle` (rewinds) → on settle, the form returns with the error and the user's values kept

To connect the real backend, replace `connectOrganization` in `src/features/onboarding/api.ts`. The animation only needs the promise to resolve or reject.

## Files

```
src/components/m-corporate-intro/
  engine.ts               Canvas engine: particles, cameras, timeline, phase gates
  geometry.ts             M mark geometry (measured from the official logo) + rasteriser
  MCorporateIntro.tsx     Client component ('use client'), typed props, ref handle for tools
  LazyMCorporateIntro.tsx next/dynamic wrapper, ssr: false, keeps the engine out of other routes
  MCorporateMark.tsx      Static SVG mark built from the same geometry
src/features/onboarding/
  schema.ts               Zod schema (register 7 digits, email, phone 8 digits, terms)
  OnboardingForm.tsx      React Hook Form + zodResolver
  StatusPill.tsx          Status messages with Motion
  api.ts                  Mock request — replace with the real one
src/fonts/                TT Firs Text via next/font/local
```

## Brand tokens

Colours live once, in `src/app/globals.css` (`@theme static`). The canvas reads the same CSS variables at runtime, so changing `--color-brand` recolours both the UI and the animation.

## Accessibility and performance

- Users with **reduce motion** turned on skip straight to the end of each phase, with no movement.
- The canvas is `role="img"` with a Mongolian label; status changes are announced through an `aria-live` region.
- 2,600 particles on desktop and 1,500 on small screens, drawn from pre-rendered dot sprites. Pixel ratio is capped at 2.
- The engine is code-split and only loads on the onboarding route.

## Font licence

TT Firs Text is licensed to M Bank by TypeType for web use on **M Bank's own domains only** (see `Web-font-License.pdf` from the font package). Keep this repository private, and do not copy the font files to third-party hosts or public demos. The licence lists logos as needing a separate licence. The "corporate" wordmark in the final lockup is set in TT Firs, so swap in the brand team's official wordmark asset before release, or confirm the licence covers it.
