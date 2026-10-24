'use client';

/**
 * "Товч" (short) view of a report: only the masthead with the scores and the
 * first few highlights, each cut to its lead sentence, so it reads in seconds.
 * "Дэлгэрэнгүй" (long) is the report as published. Nothing is removed; the
 * short view only hides things, so switching back is instant.
 */
export type ReportMode = 'short' | 'long';

const STORAGE_KEY = 'mcorp.hub.mode';
const HIGHLIGHTS_SHOWN = 4;
/** A lead sentence shorter than this also gets the next one, so "Both scores rose." isn't left alone. */
const MIN_LEAD = 60;

export function readMode(): ReportMode {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'long' ? 'long' : 'short';
  } catch {
    return 'short';
  }
}

export function saveMode(mode: ReportMode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // the choice just won't be remembered
  }
}

const STYLE = `
html[data-hub-mode="short"] #app > :not([data-hub-keep]),
html[data-hub-mode="short"] [data-hub-keep] > p.sub,
html[data-hub-mode="short"] .alert ul,
html[data-hub-mode="short"] .ledger p.small:not(.cov),
html[data-hub-mode="short"] .ledger ul.plain,
html[data-hub-mode="short"] li[data-hub-extra],
html[data-hub-mode="short"] .hub-rest { display: none !important; }
`;

/** Marks what the short view keeps. Run once per load, after the report has rendered. */
function prepare(doc: Document) {
  if (doc.getElementById('hub-short-style')) return;
  const style = doc.createElement('style');
  style.id = 'hub-short-style';
  style.textContent = STYLE;
  doc.head.appendChild(style);

  const app = doc.getElementById('app');
  if (!app) return;
  const masthead = Array.from(app.children).find((c) => c.querySelector('h1'));
  masthead?.setAttribute('data-hub-keep', '');
  const highlights = Array.from(app.querySelectorAll(':scope > section')).find(
    (s) => s.querySelector(':scope > h2')?.textContent?.trim().toLowerCase() === 'key highlights',
  );
  if (!highlights) return;
  highlights.setAttribute('data-hub-keep', '');
  highlights.querySelectorAll('li').forEach((li, i) => {
    if (i >= HIGHLIGHTS_SHOWN) li.setAttribute('data-hub-extra', '');
    const text = li.childNodes.length === 1 ? li.firstChild : null;
    if (text?.nodeType !== Node.TEXT_NODE || !text.textContent) return;
    const split = leadLength(text.textContent);
    if (split >= text.textContent.length) return;
    const lead = doc.createElement('span');
    lead.textContent = text.textContent.slice(0, split);
    const rest = doc.createElement('span');
    rest.className = 'hub-rest';
    rest.textContent = text.textContent.slice(split);
    li.replaceChildren(lead, rest);
  });
}

/** Where the lead ends: after the first sentence, or the second if the first is very short. */
function leadLength(text: string) {
  const ends = /[.!?](?=\s+[A-Z])/g;
  for (let m = ends.exec(text); m; m = ends.exec(text)) {
    if (m.index + 1 >= MIN_LEAD) return m.index + 1;
  }
  // Every sentence break comes before MIN_LEAD: keep the whole item.
  return text.length;
}

export function applyMode(frame: HTMLIFrameElement | null, mode: ReportMode) {
  let doc: Document | null | undefined;
  try {
    doc = frame?.contentDocument;
  } catch {
    return;
  }
  if (!doc?.documentElement) return;
  prepare(doc);
  doc.documentElement.setAttribute('data-hub-mode', mode);
}

const OPTIONS: { id: ReportMode; label: string }[] = [
  { id: 'short', label: 'Товч' },
  { id: 'long', label: 'Дэлгэрэнгүй' },
];

export function ModeToggle({ mode, onChange }: { mode: ReportMode; onChange: (mode: ReportMode) => void }) {
  return (
    <div role="radiogroup" aria-label="Тайлангийн хувилбар" className="inline-flex h-10 rounded-xl border border-hairline bg-page p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={mode === o.id}
          onClick={() => {
            saveMode(o.id);
            onChange(o.id);
          }}
          className={`rounded-lg px-3 text-sm transition focus-visible:outline-2 focus-visible:outline-fg ${
            mode === o.id ? 'bg-field font-semibold' : 'text-fg-muted hover:bg-field'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
