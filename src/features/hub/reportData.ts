import type { HubReport } from './reports';

export type Band = 'GREEN' | 'AMBER' | 'RED';

export interface RunScore {
  label: string;
  value: number;
  band: Band;
}

/** One dated run of a report, as listed in the hub's history. */
export interface RunSummary {
  date: string;
  scores: RunScore[];
  /** The run's headline (coal) or first highlight (fx). */
  lead: string;
}

interface CoalRun {
  run_date: string;
  haulage_score: number;
  haulage_band: Band;
  overburden_score: number;
  overburden_band: Band;
  headline: string;
}

interface FxRun {
  run_date: string;
  index: number;
  band: Band;
  highlights: string[];
}

function summarise(report: HubReport, run: CoalRun | FxRun): RunSummary {
  if (report.id === 'coal') {
    const r = run as CoalRun;
    return {
      date: r.run_date,
      scores: [
        { label: 'Тээвэр', value: Math.round(r.haulage_score), band: r.haulage_band },
        { label: 'Хөрс хуулалт', value: Math.round(r.overburden_score), band: r.overburden_band },
      ],
      lead: r.headline,
    };
  }
  const r = run as FxRun;
  return { date: r.run_date, scores: [{ label: 'Эрсдэлийн индекс', value: r.index, band: r.band }], lead: r.highlights[0] ?? '' };
}

/**
 * Reads the runs embedded in a report page (the JSON in its <script id=stateId>),
 * newest first. `stamp` busts caches the same way the hub's iframes do.
 */
export async function loadRuns(report: HubReport, stamp: number): Promise<RunSummary[]> {
  const res = await fetch(`${report.src}?v=${stamp}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const m = html.match(new RegExp(`<script type="application/json" id="${report.stateId}">(\\{[\\s\\S]*?)</script>`));
  if (!m) throw new Error('report data not found');
  const state = JSON.parse(m[1]) as { runs: (CoalRun | FxRun)[] };
  return state.runs.map((r) => summarise(report, r)).reverse();
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "24 Oct 2026", matching the dates inside the reports. */
export const fmtRunDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MON[m - 1]} ${y}`;
};
