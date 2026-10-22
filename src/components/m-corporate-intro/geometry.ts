/**
 * Geometry of the M mark, in units of the 84 × 83 mark box.
 * Measured from the official M bank logo: a rounded green frame with a
 * dark window, a bold white M, and an extrusion toward the bottom-left.
 */

/** [x, y, width, height, radius] */
export type RoundRect = readonly [number, number, number, number, number];
export type Point = readonly [number, number];

export const MARK_SIZE = { width: 84, height: 83 } as const;
export const MARK_CENTER: Point = [42, 41.5];

export const FRONT: RoundRect = [9, 0, 75, 73, 14];
export const WINDOW: RoundRect = [15, 6, 63, 61, 9];
/** Screen offset of the back face relative to the front face. */
export const EXTRUSION: Point = [-9, 10];

export const M_POLYGON: readonly Point[] = [
  [24, 20], [38, 20], [47.5, 42], [57, 20], [71, 20], [71, 55], [63, 55],
  [63, 31], [51.5, 55], [43.5, 55], [32, 31], [32, 55], [24, 55],
];

/** Part of the mark a sample belongs to. */
export enum MarkPart {
  Frame = 1,
  Side = 2,
  Letter = 3,
}

export interface MarkSample {
  /** Front-face x, y in mark units. */
  x: number;
  y: number;
  /** 0 = front face, 1 = back face of the extrusion. */
  depth: number;
  part: MarkPart;
}

export function inRoundRect(x: number, y: number, [rx, ry, w, h, r]: RoundRect): boolean {
  if (x < rx || x > rx + w || y < ry || y > ry + h) return false;
  const dx = Math.max(rx + r - x, x - (rx + w - r), 0);
  const dy = Math.max(ry + r - y, y - (ry + h - r), 0);
  return dx * dx + dy * dy <= r * r;
}

export function inPolygon(x: number, y: number, poly: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Rasterises the mark on a grid and returns one sample per filled cell.
 * Cells outside the front face are traced back along the extrusion to find
 * which front-face point (and how deep) they belong to.
 */
export function rasteriseMark(step = 0.55): MarkSample[] {
  const samples: MarkSample[] = [];
  for (let y = 0; y <= MARK_SIZE.width; y += step) {
    for (let x = 0; x <= MARK_SIZE.width; x += step) {
      if (inRoundRect(x, y, FRONT)) {
        if (inRoundRect(x, y, WINDOW)) {
          if (inPolygon(x, y, M_POLYGON)) samples.push({ x, y, depth: 0, part: MarkPart.Letter });
        } else {
          samples.push({ x, y, depth: 0, part: MarkPart.Frame });
        }
        continue;
      }
      for (let k = 1; k <= 24; k++) {
        const s = k / 24;
        const qx = x - EXTRUSION[0] * s;
        const qy = y - EXTRUSION[1] * s;
        if (inRoundRect(qx, qy, FRONT)) {
          samples.push({ x: qx, y: qy, depth: s, part: MarkPart.Side });
          break;
        }
      }
    }
  }
  return samples;
}

function roundRectPath(ctx: CanvasRenderingContext2D, [x, y, w, h, r]: RoundRect) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws the crisp vector mark at the context's current transform (1 unit = 1 mark unit). */
export function drawMark(
  ctx: CanvasRenderingContext2D,
  colors: { brand: string; window: string; letter: string },
  pixelsPerUnit: number,
) {
  ctx.fillStyle = colors.brand;
  const steps = Math.max(10, Math.ceil(14 * pixelsPerUnit));
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    roundRectPath(ctx, [FRONT[0] + EXTRUSION[0] * t, FRONT[1] + EXTRUSION[1] * t, FRONT[2], FRONT[3], FRONT[4]]);
    ctx.fill();
  }
  ctx.fillStyle = colors.window;
  roundRectPath(ctx, WINDOW);
  ctx.fill();
  ctx.fillStyle = colors.letter;
  ctx.beginPath();
  M_POLYGON.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}
