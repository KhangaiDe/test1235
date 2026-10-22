import { EXTRUSION, FRONT, M_POLYGON, WINDOW } from './geometry';

const LAYERS = 5;

interface MCorporateMarkProps {
  className?: string;
  title?: string;
  /** `dark`: dark window, white M (for dark backgrounds). `light`: white window, dark M. */
  tone?: 'dark' | 'light';
}

/** Static vector version of the M mark, drawn from the same geometry as the animation. */
export function MCorporateMark({ className, title, tone = 'dark' }: MCorporateMarkProps) {
  const [fx, fy, fw, fh, fr] = FRONT;
  const [wx, wy, ww, wh, wr] = WINDOW;
  return (
    <svg viewBox="0 0 84 83" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <g className="fill-brand">
        {Array.from({ length: LAYERS }, (_, i) => {
          const t = 1 - i / (LAYERS - 1);
          return <rect key={i} x={fx + EXTRUSION[0] * t} y={fy + EXTRUSION[1] * t} width={fw} height={fh} rx={fr} />;
        })}
      </g>
      <rect className={tone === 'dark' ? 'fill-stage' : 'fill-page'} x={wx} y={wy} width={ww} height={wh} rx={wr} />
      <polygon className={tone === 'dark' ? 'fill-ink' : 'fill-fg'} points={M_POLYGON.map(([x, y]) => `${x},${y}`).join(' ')} />
    </svg>
  );
}
