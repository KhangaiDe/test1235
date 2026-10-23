/**
 * Strips source references from a loaded report before anyone sees it: the
 * "Sources" section, every Source / Sources / Link table column, and any other
 * outbound link (turned into plain text, so values that were links still show).
 *
 * Done on the hub side rather than in public/hub/*.html, so it also covers the
 * copies the Worker fetches from HUB_SOURCE. The report pages build their DOM
 * in an inline script, which has run by the time the iframe fires `load`.
 */
const SOURCE_SECTION = /^sources?$/i;
const SOURCE_COLUMN = /^(sources?|link)$/i;

export function hideSources(frame: HTMLIFrameElement | null) {
  let doc: Document | null | undefined;
  try {
    doc = frame?.contentDocument;
  } catch {
    return;
  }
  if (!doc) return;

  doc.querySelectorAll('section').forEach((s) => {
    const title = s.querySelector(':scope > h2')?.textContent?.trim() ?? '';
    if (SOURCE_SECTION.test(title)) s.remove();
  });

  doc.querySelectorAll('table').forEach((table) => {
    const head = table.tHead?.rows[0] ?? table.rows[0];
    if (!head) return;
    const drop = Array.from(head.cells)
      .map((c, i) => (SOURCE_COLUMN.test(c.textContent?.trim() ?? '') ? i : -1))
      .filter((i) => i >= 0)
      .reverse();
    if (!drop.length) return;
    const width = head.cells.length;
    Array.from(table.rows).forEach((row) => {
      if (row.cells.length === width) {
        drop.forEach((i) => row.deleteCell(i));
      } else {
        // A spanning row (e.g. a group heading): narrow its last cell instead.
        const last = row.cells[row.cells.length - 1];
        if (last && last.colSpan > 1) last.colSpan = Math.max(1, last.colSpan - drop.length);
      }
    });
  });

  doc.querySelectorAll('a[href^="http"]').forEach((a) => a.replaceWith(doc.createTextNode(a.textContent ?? '')));
}
