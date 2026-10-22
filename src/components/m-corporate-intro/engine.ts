/**
 * Canvas 2D particle engine for the M corporate intro.
 *
 * Everything on screen is a pure function of the timeline position `t`
 * (plus an ambient clock for twinkle), so the animation can be played,
 * held, rewound and scrubbed. Phases only move a target on the timeline:
 *
 *   idle    → 0      (star field; rewinds here on error)
 *   gather  → 4.6 s  (galaxy disk, then a sphere that keeps spinning while the request runs)
 *   build   → 10.8 s (sphere assembles the 3D mark, hands off to the crisp lockup)
 */
import {
  EXTRUSION,
  MARK_CENTER,
  MarkPart,
  drawMark,
  rasteriseMark,
} from './geometry';

export type IntroPhase = 'idle' | 'gather' | 'build';

export const TIMELINE = {
  total: 10.8,
  gatherHold: 4.6,
  marks: [
    { t: 0, label: 'Цуглуулах' },
    { t: 2.4, label: 'Бөмбөрцөг' },
    { t: 4.8, label: 'Угсрах' },
    { t: 8.4, label: 'Лого' },
  ],
} as const;

const PHASE_TARGET: Record<IntroPhase, number> = {
  idle: 0,
  gather: TIMELINE.gatherHold,
  build: TIMELINE.total,
};

const REWIND_SPEED = 2.6;
const WORDMARK = 'corporate';
const TAGLINE: readonly [string, string] = ['Үргэлжлүүл, ', 'өргөжүүл'];

export interface IntroEngineOptions {
  reducedMotion?: boolean;
  /** Called once each time the timeline reaches the target of the current phase. */
  onSettle?: (phase: IntroPhase) => void;
  /** Called every frame with the timeline position in seconds. */
  onTimeUpdate?: (t: number) => void;
}

export interface IntroEngine {
  setPhase(phase: IntroPhase): void;
  /** Jump to a timeline position and stay there (for review tools). */
  seek(t: number): void;
  /** Play toward a timeline position at the current speed. */
  playTo(t: number): void;
  setSpeed(speed: number): void;
  getTime(): number;
  destroy(): void;
}

interface Palette {
  stage: string;
  ink: string;
  muted: string;
  brand: string;
  brandDeep: string;
  font: string;
}

// ---------- small math helpers
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = (v: number) => (v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const D2R = Math.PI / 180;
const TAU = Math.PI * 2;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function readPalette(el: HTMLElement): Palette {
  const css = getComputedStyle(el);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    stage: v('--color-stage', '#030504'),
    ink: v('--color-ink', '#f4f7f6'),
    muted: v('--color-muted', '#8a9097'),
    brand: v('--color-brand', '#21cda8'),
    brandDeep: v('--color-brand-deep', '#169b80'),
    font: css.fontFamily || 'sans-serif',
  };
}

function hexToRgb(color: string): [number, number, number] {
  const hex = color.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex.slice(0, 6);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function dotSprite(color: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  if (!g) return c;
  const [r, gr, b] = hexToRgb(color);
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, `rgba(${r},${gr},${b},1)`);
  grad.addColorStop(0.55, `rgba(${r},${gr},${b},1)`);
  grad.addColorStop(0.7, `rgba(${r},${gr},${b},0.35)`);
  grad.addColorStop(1, `rgba(${r},${gr},${b},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return c;
}

export function createIntroEngine(canvas: HTMLCanvasElement, options: IntroEngineOptions = {}): IntroEngine {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is not available');
  const reduce = options.reducedMotion ?? false;
  const palette = readPalette(canvas);

  // ---------- particles
  const rect0 = canvas.getBoundingClientRect();
  const small = Math.min(rect0.width, rect0.height) < 560 || rect0.width < 640;
  const N = small ? 1500 : 2600;
  const NL = Math.round(N * 0.7); // particles that build the mark; the rest stay as stars
  const rnd = mulberry32(20261022);

  const fx = new Float32Array(N), fy = new Float32Array(N), dep = new Float32Array(N);
  const s1 = new Float32Array(N), s2 = new Float32Array(N), s3 = new Float32Array(N), s4 = new Float32Array(N);
  const size = new Float32Array(N), tw = new Float32Array(N), tph = new Float32Array(N);
  const greenStar = new Uint8Array(N);
  const vx = new Float32Array(N), vy = new Float32Array(N), vz = new Float32Array(N);
  const diskAngle = new Float32Array(N), diskRadius = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    fx[i] = rnd(); fy[i] = rnd(); dep[i] = 0.2 + 0.8 * rnd();
    s1[i] = rnd(); s2[i] = rnd(); s3[i] = rnd(); s4[i] = rnd();
    size[i] = rnd(); tw[i] = 0.4 + rnd() * 1.4; tph[i] = rnd() * TAU;
    greenStar[i] = rnd() < 0.17 ? 1 : 0;
    // Fibonacci sphere
    const y = 1 - (2 * (i + 0.5)) / N;
    const r = Math.sqrt(1 - y * y);
    const phi = i * 2.399963;
    vx[i] = Math.cos(phi) * r; vy[i] = y; vz[i] = Math.sin(phi) * r;
    diskAngle[i] = s1[i] * TAU;
    diskRadius[i] = 0.28 + 0.95 * Math.sqrt(s2[i]);
  }

  // ---------- mark targets
  const STEP = 0.55;
  const cells = rasteriseMark(STEP);
  const cellArea = cells.length * STEP * STEP;
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const picks = Array.from({ length: NL }, (_, i) => {
    const c = cells[i % cells.length];
    const x = c.x + (rnd() - 0.5) * STEP;
    const y = c.y + (rnd() - 0.5) * STEP;
    return { x, y, depth: c.depth, part: c.part, screenX: x + EXTRUSION[0] * c.depth };
  }).sort((a, b) => a.screenX - b.screenX);
  const minX = picks[0].screenX;
  const spanX = picks[picks.length - 1].screenX - minX || 1;

  const tX = new Float32Array(NL), tY = new Float32Array(NL), tZ = new Float32Array(NL);
  const tPart = new Uint8Array(NL), order = new Float32Array(NL);
  let seatedForOmega = Number.NaN;

  /** Seat particles left-to-right by where they sit on the sphere when the build starts. */
  function seatParticles(omega: number) {
    seatedForOmega = omega;
    const co = Math.cos(omega), so = Math.sin(omega), roll = -8 * D2R;
    const idx = Array.from({ length: NL }, (_, i) => i);
    const px = idx.map((i) => (vx[i] * co + vz[i] * so) * Math.cos(roll) - vy[i] * Math.sin(roll));
    idx.sort((a, b) => px[a] - px[b]);
    for (let rank = 0; rank < NL; rank++) {
      const i = idx[rank];
      const p = picks[rank];
      tX[i] = p.x; tY[i] = p.y; tZ[i] = p.depth; tPart[i] = p.part;
      order[i] = (p.screenX - minX) / spanX;
    }
  }

  // ---------- sprites and the crisp mark
  const sprites = [dotSprite(palette.ink), dotSprite(palette.brand), dotSprite(palette.brandDeep), dotSprite(palette.ink)];
  const markCanvas = document.createElement('canvas');
  const markCtx = markCanvas.getContext('2d');

  // ---------- sizing
  let W = 1, H = 1, dpr = 1;
  let glow: CanvasGradient | null = null;
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const [br, bg, bb] = hexToRgb(palette.brand);
    glow = ctx!.createRadialGradient(W / 2, H * 1.08, 0, W / 2, H * 1.08, Math.max(W * 0.72, H * 0.62));
    glow.addColorStop(0, `rgba(${br},${bg},${bb},.26)`);
    glow.addColorStop(0.35, `rgba(${br},${bg},${bb},.10)`);
    glow.addColorStop(0.62, `rgba(${br},${bg},${bb},.03)`);
    glow.addColorStop(1, `rgba(${br},${bg},${bb},0)`);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // ---------- pointer parallax
  let parTX = 0, parTY = 0, parX = 0, parY = 0;
  const onPointer = (e: PointerEvent) => {
    parTX = (e.clientX / window.innerWidth - 0.5) * 2;
    parTY = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener('pointermove', onPointer);

  // ---------- timeline state
  let t = 0;
  let target = 0;
  let speed = 1;
  let phase: IntroPhase | null = null;
  let settled = true;
  let holdExtra = 0; // seconds spent spinning at the gather hold
  let clock = 0;
  let last = performance.now();
  let raf = 0;
  const [brR, brG, brB] = hexToRgb(palette.brand);

  function settle() {
    if (settled) return;
    settled = true;
    if (phase && target === PHASE_TARGET[phase]) options.onSettle?.(phase);
  }

  function renderMarkAt(s: number) {
    if (!markCtx) return;
    const w = Math.ceil(86 * s * dpr), h = Math.ceil(85 * s * dpr);
    if (markCanvas.width !== w || markCanvas.height !== h) {
      markCanvas.width = w;
      markCanvas.height = h;
    } else {
      markCtx.setTransform(1, 0, 0, 1, 0, 0);
      markCtx.clearRect(0, 0, w, h);
    }
    markCtx.setTransform(dpr * s, 0, 0, dpr * s, dpr * s, dpr * s);
    drawMark(markCtx, { brand: palette.brand, window: palette.stage, letter: palette.ink }, s);
  }

  function render() {
    const c = ctx!;
    const amb = reduce ? 0 : clock;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.globalAlpha = 1;
    c.fillStyle = palette.stage;
    c.fillRect(0, 0, W, H);

    const cx = W / 2, cy = H * 0.47, U = Math.min(W, H) * 0.34, f = 3.4;
    const pS = ease(clamp01((t - 2.2) / 2.0));
    const settleGlow = ease(clamp01((t - 8.6) / 1.6));

    if (glow) {
      c.globalAlpha = 0.55 + 0.4 * pS * (1 - settleGlow);
      c.fillStyle = glow;
      c.fillRect(0, 0, W, H);
    }
    const core = ease(clamp01(t / 1.8)) * (1 - ease(clamp01((t - 6) / 1.8)));
    if (core > 0.01) {
      const g = c.createRadialGradient(cx, cy, 0, cx, cy, U * 1.3);
      g.addColorStop(0, `rgba(${brR},${brG},${brB},.20)`);
      g.addColorStop(0.5, `rgba(${brR},${brG},${brB},.06)`);
      g.addColorStop(1, `rgba(${brR},${brG},${brB},0)`);
      c.globalAlpha = core;
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    }

    // disk / sphere camera
    const roll = lerp(-24, -8, pS) * D2R, cr = Math.cos(roll), sr = Math.sin(roll);
    const pitch = 18 * D2R, cp = Math.cos(pitch), sp = Math.sin(pitch);
    const spin = 0.55 * t + 0.3 * Math.min(t, 5) ** 2;
    const omega = 0.9 * (t + holdExtra), co = Math.cos(omega), so = Math.sin(omega);
    if (t > TIMELINE.gatherHold) {
      const omegaAtBuild = 0.9 * (4.9 + holdExtra);
      if (omegaAtBuild !== seatedForOmega) seatParticles(omegaAtBuild);
    } else if (Number.isNaN(seatedForOmega)) {
      seatParticles(0.9 * 4.9);
    }

    // mark camera: rotating 3D view that settles into the logo's oblique projection
    const lp = ease(clamp01((t - 4.8) / 2.9));
    const psi = lerp(-58, -14, lp) * D2R, phi = lerp(30, 10, lp) * D2R;
    const cps = Math.cos(psi), sps = Math.sin(psi), cph = Math.cos(phi), sph = Math.sin(phi);
    const wObl = ease(clamp01((t - 7.1) / 1.3));
    const k = 1.22 / 84;
    const depthUnits = Math.hypot(EXTRUSION[0], EXTRUSION[1]);
    const pitchPx = Math.sqrt(cellArea / NL) * k * U;
    const fadeMarkDots = 1 - ease(clamp01((t - 8.35) / 0.7));

    parX += (parTX - parX) * 0.05;
    parY += (parTY - parY) * 0.05;

    for (let i = 0; i < N; i++) {
      const d = dep[i];
      const fxp = fx[i] * W + Math.sin(amb * 0.13 * tw[i] + tph[i]) * 6 * d - parX * d * 16;
      const fyp = fy[i] * H + Math.cos(amb * 0.11 * tw[i] + tph[i] * 1.3) * 6 * d - parY * d * 16;
      const twinkle = reduce ? 1 : 0.72 + 0.28 * Math.sin(amb * tw[i] * 1.7 + tph[i]);
      const aStar = (0.1 + 0.48 * d) * twinkle * (greenStar[i] ? 0.85 : 1);
      const rStar = (0.5 + 0.8 * size[i]) * (0.6 + 0.5 * d);
      let x = fxp, y = fyp, a = aStar, r = rStar;
      const baseSprite = greenStar[i] ? 1 : 0;
      let targetSprite = baseSprite, colorMix = 0;

      if (t > 0) {
        // galaxy disk in 3D, blending into the sphere
        const ang = diskAngle[i] + spin, R = diskRadius[i];
        let X = R * Math.cos(ang), Y = (s3[i] - 0.5) * 0.07, Z = R * Math.sin(ang);
        const w2 = ease(clamp01((t - 2.2 - 0.7 * s4[i]) / 1.5));
        if (w2 > 0) {
          const SX = (vx[i] * co + vz[i] * so) * 0.86, SY = vy[i] * 0.86, SZ = (-vx[i] * so + vz[i] * co) * 0.86;
          X += (SX - X) * w2; Y += (SY - Y) * w2; Z += (SZ - Z) * w2;
        }
        const y1 = Y * cp + Z * sp, z1 = -Y * sp + Z * cp;
        const x2 = X * cr - y1 * sr, y2 = X * sr + y1 * cr;
        const sc = f / (f + z1), dx = cx + x2 * sc * U, dy = cy + y2 * sc * U;
        const front = clamp01(0.5 - z1 * 0.6);

        // spiral in from the star field
        const stagger = clamp01(Math.hypot(fxp - cx, fyp - cy) / (0.75 * Math.max(W, H))) * 0.75 + s1[i] * 0.25;
        const w1 = ease(clamp01((t - 0.12 - 0.9 * stagger) / 1.45));
        if (w1 > 0) {
          if (w1 < 1) {
            const r0 = Math.hypot(fxp - cx, fyp - cy), a0 = Math.atan2(fyp - cy, fxp - cx);
            const r1 = Math.hypot(dx - cx, dy - cy);
            let a1 = Math.atan2(dy - cy, dx - cx);
            a1 += TAU * Math.round((ang + roll - a1) / TAU);
            const aa = a0 + (a1 - a0) * w1, rr = r0 + (r1 - r0) * w1;
            x = cx + Math.cos(aa) * rr;
            y = cy + Math.sin(aa) * rr;
          } else {
            x = dx; y = dy;
          }
          a = lerp(a, 0.3 + 0.62 * front, w1);
          r = lerp(r, (0.65 + 0.85 * size[i]) * sc * (0.8 + 0.4 * front), w1);
        }

        if (i < NL) {
          const w3 = ease(clamp01((t - 4.9 - order[i]) / 1.7));
          if (w3 > 0) {
            const X3 = (tX[i] - MARK_CENTER[0]) * k;
            const Y3 = (tY[i] - MARK_CENTER[1]) * k;
            const Z3 = (tZ[i] - 0.5) * depthUnits * k;
            const xa = X3 * cps + Z3 * sps, za = -X3 * sps + Z3 * cps;
            const yb = Y3 * cph + za * sph, zb = -Y3 * sph + za * cph;
            const lsc = f / (f + zb);
            const ox = cx + (tX[i] + EXTRUSION[0] * tZ[i] - MARK_CENTER[0]) * k * U;
            const oy = cy + (tY[i] + EXTRUSION[1] * tZ[i] - MARK_CENTER[1]) * k * U;
            const lx = lerp(cx + xa * lsc * U, ox, wObl);
            const ly = lerp(cy + yb * lsc * U, oy, wObl);
            const lscale = lerp(lsc, 1, wObl);
            const mx = lx - x, my = ly - y, bulge = Math.sin(Math.PI * w3) * (s1[i] - 0.5) * 0.38;
            x += mx * w3 - my * bulge;
            y += my * w3 + mx * bulge;
            targetSprite = tPart[i];
            colorMix = ease(clamp01((t - 5.3 - order[i]) / 1.5));
            a = lerp(a, tPart[i] === MarkPart.Side ? 0.82 : 0.96, w3);
            r = lerp(r, Math.max(0.75, 0.44 * pitchPx * lscale), w3);
          }
          a *= fadeMarkDots;
        } else {
          const w3 = ease(clamp01((t - 5.0 - 0.8 * s1[i]) / 1.8));
          if (w3 > 0) {
            x += (fxp - x) * w3;
            y += (fyp - y) * w3;
            a = lerp(a, aStar * (1 - 0.35 * settleGlow), w3);
            r = lerp(r, rStar, w3);
          }
        }
      }

      if (a < 0.004) continue;
      const h = r / 0.6;
      const alpha = a > 1 ? 1 : a;
      if (colorMix < 0.01 || targetSprite === baseSprite) {
        c.globalAlpha = alpha;
        c.drawImage(sprites[baseSprite], x - h, y - h, 2 * h, 2 * h);
      } else if (colorMix > 0.99) {
        c.globalAlpha = alpha;
        c.drawImage(sprites[targetSprite], x - h, y - h, 2 * h, 2 * h);
      } else {
        c.globalAlpha = alpha * (1 - colorMix);
        c.drawImage(sprites[baseSprite], x - h, y - h, 2 * h, 2 * h);
        c.globalAlpha = alpha * colorMix;
        c.drawImage(sprites[targetSprite], x - h, y - h, 2 * h, 2 * h);
      }
    }

    // crisp mark hand-off, then the lockup
    const markAlpha = ease(clamp01((t - 8.05) / 0.65));
    if (markAlpha > 0.001) {
      const sBig = k * U;
      c.font = `600 62px ${palette.font}`;
      const textUnits = c.measureText(WORDMARK).width; // wordmark width when 1 px = 1 mark unit
      const maxLockW = W < 640 ? W - 2 * Math.max(24, W * 0.08) : Math.min(W * 0.58, 780);
      const sLock = Math.min(sBig * 0.8, maxLockW / (84 + 14 + textUnits));
      const lockW = (84 + 14 + textUnits) * sLock;
      const lockL = (W - lockW) / 2;
      const e = ease(clamp01((t - 9.0) / 1.1));
      const s = lerp(sBig, sLock, e);
      const mx0 = lerp(cx - MARK_CENTER[0] * sBig, lockL, e);
      const my0 = lerp(cy - MARK_CENTER[1] * sBig, cy - MARK_CENTER[1] * sLock, e);
      renderMarkAt(s);
      c.globalAlpha = markAlpha;
      c.drawImage(markCanvas, mx0 - s, my0 - s, markCanvas.width / dpr, markCanvas.height / dpr);

      const textIn = ease(clamp01((t - 9.45) / 0.9));
      if (textIn > 0.001) {
        const fs = 62 * sLock;
        const tx = lockL + (84 + 14) * sLock;
        const baseline = cy - MARK_CENTER[1] * sLock + 66 * sLock;
        c.save();
        c.beginPath();
        c.rect(tx - 4, baseline - fs * 1.2, textUnits * sLock * textIn + 8, fs * 1.6);
        c.clip();
        c.globalAlpha = textIn;
        c.fillStyle = palette.ink;
        c.font = `600 ${fs}px ${palette.font}`;
        c.textBaseline = 'alphabetic';
        c.fillText(WORDMARK, tx - (1 - textIn) * 14, baseline);
        c.restore();
      }
      const tagIn = ease(clamp01((t - 9.95) / 0.75));
      if (tagIn > 0.001) {
        const tfs = Math.max(15, Math.min(26, lockW * 0.062));
        c.font = `500 ${tfs}px ${palette.font}`;
        const w1 = c.measureText(TAGLINE[0]).width, w2 = c.measureText(TAGLINE[1]).width;
        const tx0 = W / 2 - (w1 + w2) / 2;
        const ty = cy + MARK_CENTER[1] * sLock + tfs * 2.3 + (1 - tagIn) * 8;
        c.globalAlpha = tagIn;
        c.textBaseline = 'alphabetic';
        c.fillStyle = palette.muted;
        c.fillText(TAGLINE[0], tx0, ty);
        c.fillStyle = palette.brand;
        c.fillText(TAGLINE[1], tx0 + w1, ty);
      }
    }
    c.globalAlpha = 1;
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    const gap = target - t;
    if (Math.abs(gap) > 1e-6) {
      const stepT = dt * speed * (gap < 0 ? REWIND_SPEED : 1);
      t = gap > 0 ? Math.min(target, t + stepT) : Math.max(target, t - stepT);
      if (t === target) settle();
    } else if (target === TIMELINE.gatherHold && !reduce) {
      holdExtra += dt * speed;
    }
    if (t === 0) holdExtra = 0;
    render();
    options.onTimeUpdate?.(t);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    setPhase(next) {
      phase = next;
      target = PHASE_TARGET[next];
      settled = false;
      if (reduce) {
        t = target;
        queueMicrotask(settle);
      } else if (t === target) {
        queueMicrotask(settle);
      }
    },
    seek(time) {
      phase = null;
      t = target = Math.min(TIMELINE.total, Math.max(0, time));
      holdExtra = 0;
      settled = true;
    },
    playTo(time) {
      phase = null;
      target = Math.min(TIMELINE.total, Math.max(0, time));
      settled = false;
    },
    setSpeed(next) {
      speed = next > 0 ? next : 1;
    },
    getTime: () => t,
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
    },
  };
}
