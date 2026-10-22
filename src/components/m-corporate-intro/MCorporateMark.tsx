import { EXTRUSION, FRONT, M_POLYGON, WINDOW } from './geometry';

const LAYERS = 5;

/** Static vector version of the M mark, drawn from the same geometry as the animation. */
export function MCorporateMark({ className, title }: { className?: string; title?: string }) {
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
      <rect className="fill-stage" x={wx} y={wy} width={ww} height={wh} rx={wr} />
      <polygon className="fill-ink" points={M_POLYGON.map(([x, y]) => `${x},${y}`).join(' ')} />
    </svg>
  );
}
