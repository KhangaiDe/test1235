/**
 * Reports shown in Business hub. Each `src` is served from public/hub/ in the
 * static build; on Cloudflare the Worker in worker/index.ts can serve a newer
 * copy from HUB_SOURCE instead (see README, "Business hub").
 */
export interface HubReport {
  id: 'coal' | 'fx';
  label: string;
  hint: string;
  /** One or two sentences for the report's card. */
  description: string;
  src: string;
  /** id of the <script type="application/json"> that holds the report's runs */
  stateId: string;
  /** Pixels of the report shown free (title, headline, score tiles) before the paywall. */
  previewHeight: number;
}

export const HUB_REPORTS: readonly HubReport[] = [
  {
    id: 'coal',
    label: 'Coking coal',
    hint: 'Нүүрс тээвэр, хөрс хуулалт',
    description: 'Коксжих нүүрсний зах зээл, хилийн тээвэр, төрийн уурхайн борлуулалт нь нүүрс тээвэр болон хөрс хуулалтын гэрээт гүйцэтгэгчдэд хэр дарамт учруулж байгааг хэмжинэ.',
    src: '/hub/coal.html',
    stateId: 'coal-state',
    previewHeight: 640,
  },
  {
    id: 'fx',
    label: 'USD/MNT',
    hint: 'Ханшийн эрсдэл',
    description: 'Төгрөгийн ханшийн одоогийн горим алдагдах эрсдэл: Монголбанкны дуудлага худалдаа, нөөц, экспорт, улс төр, ирэх 6 сарын хувилбарууд.',
    src: '/hub/fx.html',
    stateId: 'fx-state',
    previewHeight: 600,
  },
];
