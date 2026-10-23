# M corporate — login and first-login intro

Redesign of the M corporate internet-bank login, following the digital onboarding flow in the *Business Bank – New* Figma file (Onboard page).

During digital onboarding a customer creates a login name and password that are **valid for 30 days**. The **first** time they sign in with those temporary credentials, the brand panel opens to full screen and a particle intro plays: galaxy, then sphere, then the 3D M mark, then **"M corporate — Тавтай морил, ‹organisation›"**. It then hands off to the internet bank, where they verify their registration. Later logins, and logins with permanent credentials, go straight in.

Stack: Next.js 16 (App Router, static export) · TypeScript · Tailwind CSS 4 · React Hook Form + Zod · Motion · lucide-react. The intro is plain Canvas 2D.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

| Route          | What it is                                                                 |
| -------------- | -------------------------------------------------------------------------- |
| `/`            | Login: brand panel with the live star field, organisation / M Sign tabs    |
| `/home/`       | Internet bank home: registration verification, DAN welcome, session timer  |
| `/playground/` | Review tool for the intro: scrub, replay, play at 0.5× or 0.25×            |
| `/home/` → **Business hub** | Coking Coal and USD/MNT monitors, reloaded on every click     |
| `/subscribe/`  | Business hub checkout (demo payment, ₮99,000 a month)                      |

### Test accounts (prototype only)

| Login name    | Password        | What happens                                                   |
| ------------- | --------------- | -------------------------------------------------------------- |
| `popy`        | `Popy@2026`     | Temporary credentials, first login → intro → home + DAN popup  |
| `merchant123` | `Merchant@2026` | Permanent credentials → straight in, everything unlocked       |
| `expired`     | `Expired@2026`  | Temporary credentials older than 30 days → error message       |

After `popy` has logged in once, later logins skip the intro, as they would in production. Use **"Анхны нэвтрэлтийг сэргээх"** under the form to see the intro again. The accounts list is in `src/features/auth/api.ts`, and the `DemoAccounts` box on the login page should be removed before release.

## The flow in code

```
src/features/login/LoginExperience.tsx
  form      sign in (signIn) ─┬─ permanent / already activated → /home
                              └─ first login with temporary credentials
  takeover  panel opens to full screen, particles gather   ← prepareWorkspace() runs
  building  M mark assembles, welcome with the organisation name
  done      1.3 s on the lockup → /home      ("Алгасах" skips straight there)

src/features/home/InternetBankHome.tsx
  opens on the same final frame (WelcomeHandoff), fades it out,
  then shows the DAN welcome ("Өдрийн мэнд") once
```

The takeover reuses one full-viewport canvas. The brand panel is that canvas clipped with `clip-path`, and on a first login the clip opens to the full screen (`.intro-layer` in `globals.css`). On phones the clip grows as a circle from the "Нэвтрэх" button.

### Connecting the real backend

- `signIn(username, password)` must return `{ session, firstLogin }`, where `firstLogin` should come from the server (first use of temporary credentials). It throws `AuthError('invalid' | 'expired')` with the message to show.
- `prepareWorkspace()` loads whatever the first screen needs, and the intro covers that wait.
- Sessions live in `sessionStorage` here (`src/features/auth/session.ts`). In production, use the auth service's cookie and `/me` instead.
- The DAN button simulates a successful fill. In production it redirects to DAN sign-in.

## Intro component

`<LazyMCorporateIntro phase caption initialTime onSettle />` from `src/components/m-corporate-intro`:

| Prop          | Meaning                                                                          |
| ------------- | -------------------------------------------------------------------------------- |
| `phase`       | `idle` star field · `gather` swirl into a spinning sphere (holds) · `build` mark + lockup |
| `caption`     | Line under the lockup, `{ lead, accent }` (accent in brand green)                |
| `initialTime` | Open at a timeline position. `TIMELINE.total` opens on the finished lockup       |
| `onSettle`    | Fires when the current phase finishes                                            |

People with **reduce motion** turned on skip straight to the end of each phase. Colours come from the Tailwind tokens in `globals.css`, which the canvas reads at runtime.

## Deploy to Cloudflare

Live at **https://still-frog-528a.khangai-de.workers.dev**, a Cloudflare Worker that serves the static export (`wrangler.jsonc`).

```bash
npx wrangler login   # once per computer, opens the browser
npm run deploy       # next build + wrangler deploy
```

In CI, set `CLOUDFLARE_API_TOKEN` (permission: Account → Workers Scripts → Edit) instead of logging in.

## Font

TT Firs Text (Normal, Medium, DemiBold) via `next/font/local` in `src/fonts`.


## Business hub

"Business hub" in the side menu (`src/features/home/data.ts`) opens `src/features/hub/BusinessHub.tsx`: two tabs, Coking coal and USD/MNT, each an iframe of a self-contained report page.

- Every click on "Business hub", and the "Шинэчлэх" button, reloads both reports with a fresh `?v=<timestamp>`, so nobody sees a cached copy. The tab shows the run date read from the report itself.
- The reports live in `public/hub/coal.html` and `public/hub/fx.html`. To publish a new run, replace those two files and `npm run deploy`.
- `worker/index.ts` runs in front of `/hub/*` only and sends `Cache-Control: no-store`. If the `HUB_SOURCE` variable is set (in `wrangler.jsonc` → `vars`, or the Cloudflare dashboard), it fetches `HUB_SOURCE/coal.html` and `HUB_SOURCE/fx.html` on every request instead, so new runs appear without a redeploy. It falls back to the bundled copy if that fetch fails. The response header `X-Hub-Source` says which one was served.
- Add another report: put the HTML in `public/hub/`, add it to `src/features/hub/reports.ts`, and add its name to `REPORTS` in `worker/index.ts`.

### Subscription (demo paywall)

Without a subscription, Business hub shows each report's title, headline and score tiles, then fades into a Subscribe box (Substack-style). "Захиалах" opens `/subscribe/`: pay from an organisation account, the M corporate Credit Card or QPay, then the receipt links back to `/home/?view=hub` with everything unlocked for one month. "Цуцлах (туршилт)" next to the status badge resets it.

This is a **demo**: no money moves and the subscription is stored in the browser (`localStorage`, per login name), in `src/features/hub/subscription.ts`. The price is `PLAN.priceMnt` there. For real payments, connect a payment gateway (QPay, the bank's card gateway or Stripe) and have `worker/index.ts` check a signed subscription cookie before serving `/hub/*.html`; otherwise the reports can be opened directly by URL.
