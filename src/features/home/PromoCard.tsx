import { MCorporateMark } from '@/components/m-corporate-intro/MCorporateMark';

const STARS =
  'radial-gradient(1px 1px at 12% 18%, #f4f7f6cc 50%, transparent 51%),' +
  'radial-gradient(1px 1px at 72% 12%, #f4f7f699 50%, transparent 51%),' +
  'radial-gradient(1.5px 1.5px at 38% 44%, #21cda8 50%, transparent 51%),' +
  'radial-gradient(1px 1px at 86% 36%, #f4f7f6aa 50%, transparent 51%),' +
  'radial-gradient(1px 1px at 22% 68%, #f4f7f688 50%, transparent 51%),' +
  'radial-gradient(1.5px 1.5px at 64% 62%, #f4f7f6cc 50%, transparent 51%),' +
  'radial-gradient(1px 1px at 92% 78%, #21cda8aa 50%, transparent 51%),' +
  'radial-gradient(1px 1px at 48% 84%, #f4f7f699 50%, transparent 51%),' +
  'radial-gradient(1px 1px at 8% 90%, #f4f7f677 50%, transparent 51%),' +
  'radial-gradient(120% 70% at 50% 115%, #21cda840, transparent 70%)';

/** Brand card from the Figma home ("Хамтдаа холыг дөтөлнө"), drawn without the city photo. */
export function PromoCard() {
  return (
    <aside
      aria-label="M corporate"
      className="relative flex min-h-64 flex-col justify-between overflow-hidden rounded-2xl bg-stage p-6 text-ink"
      style={{ backgroundImage: STARS }}
    >
      <p className="text-xl leading-snug font-semibold text-balance">Хамтдаа холыг дөтөлнө</p>
      <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <MCorporateMark className="size-8" />
        corporate
      </div>
    </aside>
  );
}
