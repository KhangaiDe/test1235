#!/usr/bin/env node
/**
 * Sanity check for the Business hub reports (public/hub/*.html) before they are
 * published. Used by the daily update; run it by hand with `npm run check:hub`.
 *
 * For each report it checks that the embedded JSON state parses, that runs[] is
 * in date order, that the newest run has every field the previous run had (the
 * page script reads them all), and that the page renders in Chromium without a
 * script error and still shows its title, scores and "Key highlights".
 * Exits non-zero on any failure.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPORTS = [
  { file: 'public/hub/coal.html', stateId: 'coal-state' },
  { file: 'public/hub/fx.html', stateId: 'fx-state' },
];

const failures = [];

/** Paths where the newest run lacks a Mongolian field the previous run had, or kept it while the English changed. */
function mnProblems(prev, now, path) {
  const out = [];
  if (!prev || typeof now !== 'object' || now === null) return out;
  if (Array.isArray(now)) {
    now.forEach((x, i) => out.push(...mnProblems(Array.isArray(prev) ? prev[i] : undefined, x, `${path}[${i}]`)));
    return out;
  }
  for (const k of Object.keys(prev)) {
    if (!k.endsWith('_mn')) continue;
    const en = k.slice(0, -3);
    // Signal change words ("no change", "worse (was 1)") are written in both languages by hub-update.
    if (!(en in now) || en === 'change') continue;
    if (!(k in now)) out.push(`text missing at ${path}.${en}`);
    else if (JSON.stringify(now[en]) !== JSON.stringify(prev[en]) && JSON.stringify(now[k]) === JSON.stringify(prev[k]))
      out.push(`text not updated at ${path}.${en}`);
  }
  for (const k of Object.keys(now)) if (!k.endsWith('_mn')) out.push(...mnProblems(prev[k], now[k], `${path}.${k}`));
  return out;
}
const fail = (file, msg) => failures.push(`${file}: ${msg}`);

function readState(file, stateId) {
  const html = readFileSync(file, 'utf8');
  // The fx page also names its state tag inside an HTML comment, so take the tag whose content starts with "{".
  const m = html.match(new RegExp(`<script type="application/json" id="${stateId}">(\\{[\\s\\S]*?)</script>`));
  if (!m) throw new Error(`no <script id="${stateId}"> with JSON`);
  return JSON.parse(m[1]);
}

for (const { file, stateId } of REPORTS) {
  let state;
  try {
    state = readState(file, stateId);
  } catch (e) {
    fail(file, `state does not parse: ${e.message}`);
    continue;
  }
  const runs = state.runs ?? [];
  if (!runs.length) {
    fail(file, 'runs[] is empty');
    continue;
  }
  for (let i = 1; i < runs.length; i++) {
    if (!(runs[i].run_date > runs[i - 1].run_date)) fail(file, `runs out of order at ${runs[i].run_date}`);
  }
  const last = runs[runs.length - 1];
  const prev = runs[runs.length - 2];
  if (prev) {
    const missing = Object.keys(prev).filter((k) => !(k in last));
    if (missing.length) fail(file, `newest run (${last.run_date}) is missing fields: ${missing.join(', ')}`);
  }
  if (!last.highlights?.length) fail(file, 'newest run has no highlights');
  // scripts/hub-update.mjs copies the text forward; it must be rewritten before publishing.
  if (prev && JSON.stringify(last.highlights) === JSON.stringify(prev.highlights))
    fail(file, `highlights of ${last.run_date} are unchanged from ${prev.run_date}; rewrite them for the new run`);
  if (prev && 'headline' in last && last.headline === prev.headline) fail(file, `headline of ${last.run_date} is unchanged from ${prev.run_date}`);
  // Mongolian (?lang=mn): every *_mn text the previous run had must exist in the newest run,
  // and must change wherever the English changed (hub-update copies the old translation forward).
  if (prev) for (const msg of mnProblems(prev, last, '')) fail(file, `Mongolian ${msg}`);
  console.log(`${file}: ${runs.length} runs, newest ${last.run_date}`);
}

async function loadPlaywright() {
  for (const spec of ['playwright', '/opt/node22/lib/node_modules/playwright/index.mjs']) {
    try {
      return await import(spec);
    } catch {
      // try the next one
    }
  }
  return null;
}

const pw = await loadPlaywright();
if (!pw) {
  fail('render', 'playwright not found, so the pages could not be rendered');
} else {
  const browser = await pw.chromium.launch();
  try {
    for (const { file } of REPORTS) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      // Fonts come from Google; don't wait on them.
      await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
      await page.goto(pathToFileURL(resolve(file)).href, { waitUntil: 'load' });
      const shape = await page.evaluate(() => ({
        h1: !!document.querySelector('#app h1'),
        h2: Array.from(document.querySelectorAll('#app h2')).map((h) => h.textContent.trim()),
      }));
      if (errors.length) fail(file, `script error when rendering: ${errors[0]}`);
      if (!shape.h1) fail(file, 'rendered page has no title');
      if (!shape.h2.includes('Key highlights')) fail(file, 'rendered page has no "Key highlights" section');
      if (shape.h2.length < 5) fail(file, `rendered page has only ${shape.h2.length} sections`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

if (failures.length) {
  console.error(`\nFAILED\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('OK');
