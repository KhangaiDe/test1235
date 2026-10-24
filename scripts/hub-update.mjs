#!/usr/bin/env node
/**
 * Daily data pull for the Business hub reports (`npm run hub:update`).
 *
 * Fetches every source that publishes a clean number, scores those signals with
 * the reports' own thresholds, and appends today's run (Asia/Ulaanbaatar date)
 * to public/hub/coal.html and public/hub/fx.html:
 *   - Dalian JM settlements (Sina): coal M1, M2, prices.main/front; fx signal 1
 *   - Mongolbank homepage: official USD/MNT rate
 *   - Mongolbank FX auction table: fx signal 12
 *   - ikon.mn commercial bank rates: fx signal 11
 *   - MSE trade history (Playwright): coal M3
 *   - Westmetall LME copper cash: fx signal 2
 *   - ECB reference rates (Frankfurter): fx signal 13, USD/CNY context
 * Points, scores, bands, probabilities, paths, forecasts and histories are
 * recomputed. Everything else (monthly statistics, politics, news, and all the
 * written text) is carried over from the previous run for a person or Claude to
 * update; `npm run check:hub` refuses a run whose headline was not rewritten.
 *
 * Usage: node scripts/hub-update.mjs [--dry-run] [--force]
 *   --dry-run  fetch and print the summary without writing
 *   --force    rebuild today's run if it already exists
 * A source that fails keeps its previous value and is listed under "Failed".
 */
import { readFileSync, writeFileSync } from 'node:fs';

const DRY = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; business-hub-update)' };

// ---------- dates (Asia/Ulaanbaatar, UTC+8, no DST) ----------
const ubToday = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const TODAY = ubToday();
const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const minusMonths = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 - n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(d, last));
  return t.toISOString().slice(0, 10);
};
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dShort = (iso) => `${+iso.slice(8, 10)} ${MON[+iso.slice(5, 7) - 1]}`;

// ---------- formatting ----------
const fmt = (v, dp = 1) => Number(v).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const pct = (v, dp = 1) => (v >= 0 ? '+' : '') + v.toFixed(dp) + '%';
const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

// ---------- summary ----------
const got = [];
const failed = [];
const note = (line) => got.push(line);
async function source(name, fn) {
  try {
    return await fn();
  } catch (e) {
    failed.push(`${name}: ${e.message}`);
    return null;
  }
}

async function get(url, init = {}) {
  let last;
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(url, { ...init, headers: { ...UA, ...init.headers }, signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      last = e;
    }
  }
  throw new Error(`${url}: ${last.message}`);
}
const textOf = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' | ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/(\s*\|\s*)+/g, ' | ')
    .replace(/\s+/g, ' ');

// ---------- sources ----------
const SINA = (c) => `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_x1=/InnerFuturesNewService.getDailyKLine?symbol=${c}`;

/** Dalian coking coal: every listed contract for the next 12 months, keyed by code. */
async function dalian() {
  const [y, m] = TODAY.split('-').map(Number);
  const codes = [];
  for (let i = 0; i < 13; i++) {
    const t = new Date(Date.UTC(y, m - 1 + i, 1));
    codes.push(`JM${String(t.getUTCFullYear()).slice(2)}${String(t.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  const out = {};
  for (const c of codes) {
    const body = await get(SINA(c)).catch(() => '');
    const json = body.match(/\((\[[\s\S]*\])\)/);
    if (!json) continue;
    const rows = JSON.parse(json[1]).map((r) => ({ d: r.d, close: +r.c, settle: +r.s, vol: +r.v, oi: +r.p }));
    if (rows.length) out[c] = rows;
  }
  const latest = Object.values(out).reduce((d, rows) => (rows.at(-1).d > d ? rows.at(-1).d : d), '');
  if (!latest) throw new Error('no contract data');
  const live = Object.keys(out).filter((c) => out[c].at(-1).d === latest).sort();
  const at = (c, d) => out[c].filter((r) => r.d <= d).at(-1);
  const main = live.reduce((a, c) => (at(c, latest).oi > at(a, latest).oi ? c : a));
  const front = live[0];
  // The ~6-month contract: most open interest among deliveries 4-8 months after the latest trading month.
  const monthsAhead = (c) => (2000 + +c.slice(2, 4) - +latest.slice(0, 4)) * 12 + (+c.slice(4, 6) - +latest.slice(5, 7));
  const deferredPool = live.filter((c) => monthsAhead(c) >= 4 && monthsAhead(c) <= 8);
  const deferred = deferredPool.reduce((a, c) => (!a || at(c, latest).oi > at(a, latest).oi ? c : a), null);
  return { out, latest, main, front, deferred, at };
}

async function officialRate() {
  const t = textOf(await get('https://www.mongolbank.mn/mn/'));
  const m = t.match(/1 USD \| ([\d,]+\.\d+) \| (\d{4}-\d\d-\d\d)/) || t.match(/1 USD\s+([\d,]+\.\d+)\s+(\d{4}-\d\d-\d\d)/);
  if (!m) throw new Error('rate not found on the homepage');
  return { rate: +m[1].replace(/,/g, ''), date: m[2] };
}

async function auctions() {
  const body = await get('https://www.mongolbank.mn/mn/forex-auction/data', {
    method: 'POST',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });
  const rows = JSON.parse(body).data;
  return rows.map((r) => {
    const spot = r.DESCRIPTION.split(/<br>|2\.\s*Своп/)[0];
    const sold = spot.match(/([\d.]+)\s*сая ам\.долларыг/);
    const filled = spot.match(/саналыг\s*([\d.]+)\s*%/);
    const swapAsked = r.DESCRIPTION.match(/([\d.]+)\s*сая ам\.долларын своп/);
    const swapDeclined = /своп[\s\S]*биелүүлээгүй/.test(r.DESCRIPTION);
    return {
      d: r.RATE_DATE,
      sold: sold ? +sold[1] : 0,
      unmet: filled ? +filled[1] < 100 : false,
      swapDeclined: swapDeclined && swapAsked ? +swapAsked[1] : 0,
      bought: r.SELL_TO_BOM && r.SELL_TO_BOM !== '-' && r.SELL_TO_BOM !== '0.00',
    };
  });
}

const BIG_FOUR = ['ХХБанк', 'Голомт Банк', 'ХААН Банк', 'Төрийн Банк'];
async function bankCash() {
  const html = await get('https://ikon.mn/xrates');
  // Tab labels, in table order; the page repeats them and has one empty tab first.
  const banks = [...new Set([...html.matchAll(/class="xr_b[^"]*">\s*([^<]*?)\s*</g)].map((m) => m[1].trim()).filter(Boolean))];
  const t = textOf(html);
  const usd = [...t.matchAll(/Америк доллар \| USD \| ([\d,.]+)₮ \| ([\d,.]+)₮/g)].map((m) => +m[2].replace(/,/g, ''));
  const date = (t.match(/ВАЛЮТЫН ХАНШ \| \/(\d{4}-\d\d-\d\d)\//g) || []).at(-1)?.match(/\d{4}-\d\d-\d\d/)[0];
  const rows = banks.map((b, i) => ({ bank: b, sell: usd[i] })).filter((r) => BIG_FOUR.includes(r.bank) && r.sell);
  if (rows.length < 3) throw new Error(`only ${rows.length} of the big four banks found`);
  return { rows, median: median(rows.map((r) => r.sell)), date };
}

async function copper() {
  const html = await get('https://www.westmetall.com/en/markdaten.php?action=table&field=LME_Cu_cash');
  const rows = [];
  for (const m of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const c = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((x) => x[1].replace(/<[^>]+>/g, '').trim());
    const dm = c[0]?.match(/^(\d+)\. (\w+) (\d{4})$/);
    if (dm && c[1]) {
      const mon = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(dm[2]);
      rows.push({ d: `${dm[3]}-${String(mon + 1).padStart(2, '0')}-${dm[1].padStart(2, '0')}`, v: +c[1].replace(/,/g, '') });
    }
  }
  rows.sort((a, b) => (a.d < b.d ? -1 : 1));
  if (!rows.length) throw new Error('no rows');
  return rows;
}

async function usdcny(date) {
  const j = JSON.parse(await get(`https://api.frankfurter.app/${date}?from=USD&to=CNY`, { redirect: 'follow' }));
  return { d: j.date, v: j.rates.CNY };
}

/** Mining-products trade history on the MSE; script-rendered, so read it with Playwright. */
async function mseLots(since) {
  let pw = null;
  for (const spec of ['playwright', '/opt/node22/lib/node_modules/playwright/index.mjs']) {
    try {
      pw = await import(spec);
      break;
    } catch {
      // try the next one
    }
  }
  if (!pw) throw new Error('playwright not available');
  const browser = await pw.chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto('https://new.mse.mn/trade', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await page.getByText('Арилжааны түүх').first().click();
    await page.waitForTimeout(3000);
    const rows = [];
    for (let i = 0; i < 40; i++) {
      const batch = await page.$$eval('table tbody tr', (trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.trim())));
      for (const r of batch) if (r.length >= 9) rows.push(r);
      if (!batch.length || batch.at(-1)[8].slice(0, 10) < since) break;
      await page.getByText('Дараах').last().click();
      await page.waitForTimeout(2000);
    }
    const seen = new Set();
    return rows
      .filter((r) => !seen.has(r.slice(1).join('|')) && seen.add(r.slice(1).join('|')))
      .map((r) => ({
        d: r[8].slice(0, 10),
        seller: r[1],
        product: r[2],
        tonnes: +r[3].replace(/,/g, ''),
        floor: r[4],
        price: r[5],
        sold: r[5] !== '',
      }));
  } finally {
    await browser.close();
  }
}

async function hotMetal() {
  const t = textOf(await get('https://tks.mysteel.com/')).replace(/ \| /g, ' ');
  const m = t.match(/国内钢厂日均铁水产量\s+([\d.]+)\s+([\d.]+)\s+[-+\d.]+\s+(\d\d-\d\d)/);
  if (!m) throw new Error('hot metal row not found');
  return { v: +m[1] / 100, prev: +m[2] / 100, date: `${TODAY.slice(0, 4)}-${m[3]}` };
}

// ---------- state in the report files ----------
function load(file, id) {
  const html = readFileSync(file, 'utf8');
  const m = html.match(new RegExp(`(<script type="application/json" id="${id}">)(\\{[\\s\\S]*?)(</script>)`));
  return { html, m, state: JSON.parse(m[2]) };
}
function save({ html, m }, state, file) {
  const out = JSON.stringify(state).replace(/[\u0080-\uffff]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
  if (out.includes('</')) throw new Error('state would close its script tag');
  const start = m.index + m[1].length;
  writeFileSync(file, html.slice(0, start) + out + html.slice(start + m[2].length));
}
const clone = (o) => JSON.parse(JSON.stringify(o));

/** Start today's run from the previous one; with --force, first drop today's run and today's history rows. */
function startRun(state, histories) {
  if (state.runs.at(-1).run_date === TODAY) {
    if (!FORCE) return null;
    state.runs.pop();
    for (const [key, field] of histories) {
      const arr = key.split('.').reduce((o, k) => o[k], state);
      for (let i = arr.length - 1; i >= 0; i--) if (arr[i][field] === TODAY) arr.splice(i, 1);
    }
  }
  const prev = state.runs.at(-1);
  const run = clone(prev);
  run.run_date = TODAY;
  return { prev, run };
}

// ---------- scoring rules (as written in each signal's thresholds) ----------
const fall3m = (chg) => (chg > -5 ? 0 : chg >= -15 ? 1 : 2); // >-5% / -5 to -15% / <-15%
const curve = (gap) => (gap >= -3 ? 0 : gap >= -10 ? 1 : 2); // >=-3% / -3 to -10% / <-10%
const unsoldRule = (u) => (u < 20 ? 0 : u <= 50 ? 1 : 2); // <20% / 20-50% / >50%
const premiumRule = (p) => (p < 0.5 ? 0 : p <= 1 ? 1 : 2); // <0.5% / 0.5-1% / >1%
const auctionRule = (chg, unmet) => (unmet || chg > 100 ? 2 : chg > 50 ? 1 : 0); // flat / up >50% / up >100% or unmet
const cnyRule = (rise) => (rise > 6 ? 2 : rise > 3 ? 1 : 0); // amber >3%, red >6% (spread leg n/a)
const band = (v) => (v <= 40 ? 'GREEN' : v <= 60 ? 'AMBER' : 'RED');
const PROBS = [
  [20, { A: 90, B: 8, C: 2 }],
  [40, { A: 80, B: 15, C: 5 }],
  [60, { A: 60, B: 28, C: 12 }],
  [80, { A: 40, B: 35, C: 25 }],
  [100, { A: 20, B: 40, C: 40 }],
];
const changeWord = (prev, now) =>
  prev.na && !now.na ? `now observed, ${['green', 'amber', 'red'][now.score]} (was n/a)` : now.score === prev.score ? 'no change' : now.score < prev.score ? `better (was ${prev.score})` : `worse (was ${prev.score})`;

// ---------- main ----------
const COAL = 'public/hub/coal.html';
const FX = 'public/hub/fx.html';

const dce = await source('Dalian futures (Sina)', dalian);
const rate = await source('Mongolbank official rate', officialRate);
const auc = await source('Mongolbank auctions', auctions);
const cash = await source('ikon.mn bank cash rates', bankCash);
const cu = await source('Westmetall copper', copper);
// The exchange site is occasionally slow to render; one retry.
const lots = await source('MSE trade history', () => mseLots(addDays(TODAY, -30)).catch(() => mseLots(addDays(TODAY, -30))));
const metal = await source('Mysteel hot metal', hotMetal);
const mktDate = dce?.latest ?? addDays(TODAY, -1);
const cnyNow = await source('USD/CNY now (ECB)', () => usdcny(mktDate));
const cnyBase = await source('USD/CNY 3 months ago (ECB)', () => usdcny(minusMonths(mktDate, 3)));

// Shared futures figures
let fut = null;
if (dce) {
  const { latest, main, front, deferred, at } = dce;
  const baseDay = minusMonths(latest, 3);
  const now = at(main, latest);
  const base = at(main, baseDay);
  fut = {
    latest,
    main,
    front,
    deferred,
    now,
    base,
    frontNow: at(front, latest),
    defNow: deferred ? at(deferred, latest) : null,
    chg: (now.settle / base.settle - 1) * 100,
  };
  fut.gap = fut.defNow ? (fut.defNow.settle / now.settle - 1) * 100 : null;
  note(`Dalian ${dShort(latest)}: main ${main} settle ${fmt(now.settle)} (OI ${now.oi.toLocaleString('en-US')}), ${dShort(base.d)} ${fmt(base.settle)}, 3-month ${pct(fut.chg)}; front ${front} ${fmt(fut.frontNow.settle)}; ${deferred} ${fmt(fut.defNow?.settle ?? NaN)} (${pct(fut.gap ?? NaN)} vs main)`);
}

// ---------- coal ----------
{
  const doc = load(COAL, 'coal-state');
  const st = doc.state;
  const started = startRun(st, [['series.score_history', 'd']]);
  if (!started) {
    note(`Coal: a run for ${TODAY} already exists; left alone (use --force to rebuild it).`);
  } else {
    const { prev, run } = started;
    run.first_run = false;
    const sig = Object.fromEntries(run.signals.map((s) => [s.id, s]));
    if (fut) {
      sig.M1.score = fall3m(fut.chg);
      sig.M1.status = 'ok';
      sig.M1.asof = fut.latest;
      sig.M1.value = `${pct(fut.chg)} on the main contract (${fut.main} settle ${fmt(fut.base.settle)} on ${dShort(fut.base.d)} to ${fmt(fut.now.settle)} on ${dShort(fut.latest)}). The delivery-month front ${fut.front} settled at ${fmt(fut.frontNow.settle)}.`;
      sig.M1.sources = [{ label: `Sina ${fut.main} daily`, url: SINA(fut.main) }];
      if (fut.defNow) {
        sig.M2.score = curve(fut.gap);
        sig.M2.status = 'ok';
        sig.M2.asof = fut.latest;
        sig.M2.value = `${pct(fut.gap)} (${fut.deferred} ${fmt(fut.defNow.settle)} vs main contract ${fut.main} ${fmt(fut.now.settle)}, settlements on ${dShort(fut.latest)}). ${fut.deferred} is the most liquid contract about six months out (open interest ${fut.defNow.oi.toLocaleString('en-US')} lots).`;
        sig.M2.sources = [
          { label: `Sina ${fut.deferred} daily`, url: SINA(fut.deferred) },
          { label: `Sina ${fut.main} daily`, url: SINA(fut.main) },
        ];
      }
      Object.assign(run.prices.main, {
        label: `Dalian main contract (${fut.main}, settlement, reference)`,
        v: fut.now.settle,
        asof: fut.latest,
        src: SINA(fut.main),
        note: `Close ${fmt(fut.now.close)}. Open interest ${fut.now.oi.toLocaleString('en-US')} lots, the most liquid contract.`,
      });
      Object.assign(run.prices.front, {
        label: `Dalian front month (${fut.front}, reference only)`,
        v: fut.frontNow.settle,
        asof: fut.latest,
        src: SINA(fut.front),
        note: `Nearest listed contract. Open interest ${fut.frontNow.oi.toLocaleString('en-US')} lots. Shown for reference only.`,
      });
    }
    if (lots) {
      const from = addDays(TODAY, -28);
      const ett = lots.filter((l) => l.d > from && /Эрдэнэс Тавантолгой/.test(l.seller) && /коксжих/.test(l.product));
      const thermal = lots.filter((l) => l.d > from && /Эрдэнэс Тавантолгой/.test(l.seller) && !/коксжих/.test(l.product));
      const offered = ett.reduce((t, l) => t + l.tonnes, 0);
      const sold = ett.filter((l) => l.sold).reduce((t, l) => t + l.tonnes, 0);
      sig.M3.asof = ett.length ? ett.map((l) => l.d).sort().at(-1) : TODAY;
      sig.M3.sources = [{ label: 'MSE trade history', url: 'https://new.mse.mn/trade' }];
      if (!offered) {
        sig.M3.status = 'na';
        sig.M3.score = 0;
        sig.M3.value = `n/a. Erdenes Tavan Tolgoi offered no coking coal on the Mongolian Stock Exchange in the four weeks to ${dShort(TODAY)}. Scored 0 by rule.`;
      } else {
        const unsold = (1 - sold / offered) * 100;
        sig.M3.status = 'ok';
        sig.M3.score = unsoldRule(unsold);
        const list = ett.map((l) => `${dShort(l.d)} ${(l.tonnes / 1000).toFixed(0)}kt ${l.sold ? `sold at ${l.price}` : `unsold (floor ${l.floor})`}`).join('; ');
        sig.M3.value = `${unsold.toFixed(0)}% unsold. Erdenes Tavan Tolgoi coking-coal lots on the Mongolian Stock Exchange in the four weeks to ${dShort(TODAY)}: ${list}.${thermal.length ? ` Thermal coal: ${thermal.filter((l) => l.sold).length} of ${thermal.length} lots sold.` : ''}`;
        const lastSold = [...ett].reverse().find((l) => l.sold);
        if (lastSold) {
          Object.assign(run.prices.auction, {
            label: 'Latest Erdenes Tavan Tolgoi coking-coal deal (MSE)',
            v: +lastSold.price.replace(/[^\d.]/g, ''),
            asof: lastSold.d,
            src: 'https://new.mse.mn/trade',
            note: `${lastSold.product}, ${lastSold.tonnes.toLocaleString('en-US')} t, floor ${lastSold.floor}.`,
          });
        }
      }
      note(`MSE: ${ett.length} ETT coking-coal lots in 4 weeks, ${offered.toLocaleString('en-US')} t offered, ${sold.toLocaleString('en-US')} t sold`);
    }
    const pts = { M: 0, H: 0, S: 0, P: 0 };
    for (const s of run.signals) pts[s.id[0]] += s.score * s.weight;
    run.points = pts;
    run.haulage_score = Math.round(((pts.M + pts.H + pts.P) / 32) * 1000) / 10;
    run.overburden_score = Math.round(((pts.M + pts.S + pts.P) / 28) * 1000) / 10;
    run.haulage_band = band(run.haulage_score);
    run.overburden_band = band(run.overburden_score);
    run.change_haulage = Math.round((run.haulage_score - prev.haulage_score) * 10) / 10;
    run.change_overburden = Math.round((run.overburden_score - prev.overburden_score) * 10) / 10;
    for (const it of run.context.items) {
      if (it.k.startsWith('USD/MNT') && rate) Object.assign(it, { v: fmt(rate.rate, 2), asof: rate.date, src: 'https://www.mongolbank.mn/mn/' });
      if (it.k === 'USD/CNY' && cnyNow && cnyBase)
        Object.assign(it, {
          v: cnyNow.v.toFixed(4),
          asof: cnyNow.d,
          src: `https://api.frankfurter.app/${cnyNow.d}?from=USD&to=CNY`,
          note: `ECB reference rate. ${cnyBase.v.toFixed(4)} on ${dShort(cnyBase.d)} (${pct((cnyNow.v / cnyBase.v - 1) * 100)}).`,
        });
    }
    st.runs.push(run);
    st.series.score_history.push({ d: TODAY, haulage: run.haulage_score, overburden: run.overburden_score });
    note(`Coal: haulage ${run.haulage_score} ${run.haulage_band} (${run.change_haulage >= 0 ? '+' : ''}${run.change_haulage}), overburden ${run.overburden_score} ${run.overburden_band} (${run.change_overburden >= 0 ? '+' : ''}${run.change_overburden}); points ${JSON.stringify(pts)}`);
    if (!DRY) save(doc, st, COAL);
  }
}

// ---------- fx ----------
{
  const doc = load(FX, 'fx-state');
  const st = doc.state;
  const started = startRun(st, [['index_history', 'date'], ['forecasts', 'vintage'], ['cash_premium_obs', 'date']]);
  if (!started) {
    note(`FX: a run for ${TODAY} already exists; left alone (use --force to rebuild it).`);
  } else {
    const { prev, run } = started;
    const prevSig = Object.fromEntries(prev.signals.map((s) => [s.id, s]));
    const S = Object.fromEntries(run.signals.map((s) => [s.id, s]));
    if (rate) {
      run.official_rate = rate.rate;
      run.official_rate_date = rate.date;
      st.series.usdmnt_last_obs = { date: rate.date, value: rate.rate };
    }
    if (fut) {
      Object.assign(S[1], {
        value: pct(fut.chg),
        score: fall3m(fut.chg),
        asof: fut.latest,
        detail: `DCE ${fut.main} (main contract) settlement ${fmt(fut.base.settle)} (${dShort(fut.base.d)}) to ${fmt(fut.now.settle)} (${dShort(fut.latest)}), same contract. Settlements, as in the Coking Coal Monitor.`,
        sources: [[`Sina ${fut.main} daily (settlements)`, SINA(fut.main)]],
      });
    }
    if (cu) {
      const now = cu.at(-1);
      const base = cu.filter((r) => r.d <= minusMonths(now.d, 3)).at(-1);
      const chg = (now.v / base.v - 1) * 100;
      Object.assign(S[2], {
        value: pct(chg),
        score: fall3m(chg),
        asof: now.d,
        detail: `LME cash settlement ${fmt(base.v, 0)} (${dShort(base.d)}) to ${fmt(now.v, 0)} (${dShort(now.d)}) USD/t.`,
      });
      note(`Copper: ${fmt(base.v, 0)} (${base.d}) -> ${fmt(now.v, 0)} (${now.d}), ${pct(chg)}`);
    }
    if (cash && rate) {
      const prem = (cash.median / rate.rate - 1) * 100;
      Object.assign(S[11], {
        value: pct(prem, 2),
        score: premiumRule(prem),
        na: false,
        asof: cash.date ?? rate.date,
        detail: `Median cash USD sell rate of the four largest banks (${cash.rows.map((r) => `${r.bank} ${r.sell.toLocaleString('en-US')}`).join(', ')}): ${fmt(cash.median)} against the official ${fmt(rate.rate, 2)}, a premium of ${prem.toFixed(3)}%. Banks' published cash rates stand in for Naiman Sharga street quotes, which are not published.`,
        sources: [['ikon.mn commercial bank rates', 'https://ikon.mn/xrates']],
      });
      st.cash_premium_obs.push({ date: TODAY, sell: cash.median, official: rate.rate, premium: Math.round(prem * 100) / 100, url: 'https://ikon.mn/xrates' });
      note(`Bank cash: median ${cash.median} vs official ${rate.rate} = ${prem.toFixed(3)}%`);
    }
    if (auc) {
      const in4 = auc.filter((a) => a.d > addDays(TODAY, -28) && a.d <= TODAY);
      const pr4 = auc.filter((a) => a.d > addDays(TODAY, -56) && a.d <= addDays(TODAY, -28));
      const s4 = in4.reduce((t, a) => t + a.sold, 0);
      const p4 = pr4.reduce((t, a) => t + a.sold, 0);
      const chg = p4 ? (s4 / p4 - 1) * 100 : s4 ? Infinity : 0;
      const unmet = in4.some((a) => a.unmet);
      const swaps = in4.filter((a) => a.swapDeclined);
      const bought = in4.some((a) => a.bought);
      Object.assign(S[12], {
        value: Number.isFinite(chg) ? pct(chg, 0) : 'up from zero',
        score: auctionRule(chg, unmet),
        na: false,
        asof: in4.length ? in4.map((a) => a.d).sort().at(-1) : TODAY,
        detail: `Mongolbank sold USD ${fmt(s4)} mn at its auctions in the four weeks to ${dShort(TODAY)} (${in4.map((a) => `${dShort(a.d)} ${a.sold}`).join(', ')}) against USD ${fmt(p4)} mn in the four weeks before. ${unmet ? 'Some spot demand went unmet.' : 'Every spot bid was filled.'}${swaps.length ? ` Swap requests were declined on ${swaps.map((a) => `${dShort(a.d)} (USD ${a.swapDeclined} mn)`).join(', ')}.` : ''}${bought ? ' Mongolbank also bought dollars at auction.' : ''}`,
        sources: [['Mongolbank FX auction results', 'https://www.mongolbank.mn/mn/forex-auction']],
      });
      note(`Auctions: USD ${s4} mn in 4 weeks vs ${p4} mn before (${Number.isFinite(chg) ? pct(chg, 0) : 'n/a'}), unmet spot: ${unmet}`);
    }
    if (cnyNow && cnyBase) {
      const rise = (cnyNow.v / cnyBase.v - 1) * 100;
      Object.assign(S[13], {
        value: `USD/CNY ${pct(rise)}`,
        score: cnyRule(rise),
        asof: cnyNow.d,
        detail: `ECB reference USD/CNY ${cnyBase.v.toFixed(4)} (${dShort(cnyBase.d)}) to ${cnyNow.v.toFixed(4)} (${dShort(cnyNow.d)}). Sovereign spread 3-month change n/a.`,
        sources: [['ECB reference rates via Frankfurter', `https://api.frankfurter.app/${cnyNow.d}?from=USD&to=CNY`]],
      });
    }
    for (const s of run.signals) {
      s.points = s.score * s.weight;
      s.change = changeWord(prevSig[s.id] ?? s, s);
    }
    run.signal_points = run.signals.reduce((t, s) => t + s.points, 0);
    run.politics_points = run.politics.reduce((t, p) => t + p.score, 0);
    run.total_points = run.signal_points + run.politics_points;
    run.index_raw = Math.round((run.total_points / run.max_points) * 10000) / 100;
    run.index = Math.round(run.index_raw);
    run.band = band(run.index);
    run.index_change = run.index - prev.index;
    run.na_count = run.signals.filter((s) => s.na).length;
    run.base_probs = { ...PROBS.find(([hi]) => run.index <= hi)[1] };
    run.probs = { ...run.base_probs };
    run.shift_reason = `No judgement shift: the index (${run.index}) maps to ${run.base_probs.A}/${run.base_probs.B}/${run.base_probs.C}.`;
    // Paths: crawl, accelerated (0.6%/month) and step (2%/month) from today's rate to each month-end.
    const base = run.official_rate;
    const a = run.crawl_monthly_pct / 100;
    const [y, m] = base && rate ? rate.date.split('-').map(Number) : TODAY.split('-').map(Number);
    run.paths = run.paths.map((p) => {
      const n = p.n;
      const target = new Date(Date.UTC(y, m - 1 + n, 0)).toISOString().slice(0, 10);
      const A = base * (1 + a) ** n;
      const B = base * 1.006 ** n;
      const C = base * 1.02 ** n;
      const P = run.probs;
      const r2 = (v) => Math.round(v * 100) / 100;
      const p90 = P.A >= 90 ? A : P.A + P.B >= 90 ? B : C;
      return { n, target, A: r2(A), B: r2(B), C: r2(C), expected: r2((P.A * A + P.B * B + P.C * C) / 100), p90: r2(p90) };
    });
    run.p90_path = run.probs.A >= 90 ? 'A' : run.probs.A + run.probs.B >= 90 ? 'B' : 'C';
    run.crawl_basis = run.crawl_basis.replace(/Paths start from the .*$/, `Paths start from the ${dShort(rate?.date ?? TODAY)} rate (${fmt(base, 2)}).`);
    const R = Object.fromEntries(run.signals.map((s) => [s.id, s]));
    const prevR = Object.fromEntries(prev.signals.map((s) => [s.id, s]));
    for (const al of run.alerts) {
      if (/^Signal 11 red/.test(al.rule)) {
        al.triggered = R[11].score === 2 && prevR[11].score === 2;
        al.note = R[11].na ? 'Signal 11 is n/a.' : `Signal 11 at ${R[11].value} (${['green', 'amber', 'red'][R[11].score]}).`;
      }
      if (/^Signal 1 or 2 red/.test(al.rule)) {
        al.triggered = R[1].score === 2 || R[2].score === 2;
        al.note = `Coking coal ${R[1].value} over three months; copper ${R[2].value}.`;
      }
      if (/^Index up 15/.test(al.rule)) {
        al.triggered = run.index_change >= 15;
        al.note = `Index ${run.index_change >= 0 ? 'up' : 'down'} ${Math.abs(run.index_change)} (${prev.index} to ${run.index}).`;
      }
    }
    run.alert = run.alerts.some((al) => al.triggered);
    st.runs.push(run);
    st.updated = TODAY;
    st.index_history.push({ date: TODAY, index: run.index, band: run.band, pA: run.probs.A, pB: run.probs.B, pC: run.probs.C });
    for (const p of run.paths)
      st.forecasts.push({ vintage: TODAY, base_rate: base, target: p.target, horizon: p.n, expected: p.expected, no_change: base, A: p.A, B: p.B, C: p.C, p90: p.p90, actual: null });
    const due = st.forecasts.filter((f) => f.actual == null && f.target < TODAY);
    if (due.length) note(`FX: ${due.length} forecasts have passed their target date and need an actual (${[...new Set(due.map((f) => f.target))].join(', ')}).`);
    note(`FX: index ${run.index} ${run.band} (${run.index_change >= 0 ? '+' : ''}${run.index_change}), signals ${run.signal_points} + politics ${run.politics_points}, probs ${run.probs.A}/${run.probs.B}/${run.probs.C}; changed signals: ${run.signals.filter((s) => s.change !== 'no change').map((s) => `#${s.id} ${s.change}`).join('; ') || 'none'}`);
    if (!DRY) save(doc, st, FX);
  }
}

if (metal) note(`Hot metal (for coal M5, not scored here): ${metal.v.toFixed(3)} Mt/day, previous ${metal.prev.toFixed(3)} (${metal.date})`);
if (rate) note(`Official rate: ${rate.rate} (${rate.date})`);

console.log(`# Business hub update for ${TODAY}${DRY ? ' (dry run, nothing written)' : ''}\n`);
console.log(got.map((l) => `- ${l}`).join('\n'));
if (failed.length) console.log(`\n## Failed (previous values kept)\n${failed.map((l) => `- ${l}`).join('\n')}`);
console.log(`\nStill to do by hand: monthly statistics (fx 3-10, coal H2), politics and events, trucks, border price, M4-M6, H1, H3-H5, S1-S3, then rewrite the headline, highlights, outlooks, alert notes and data gaps. \`npm run check:hub\` fails until the headline is rewritten.`);
