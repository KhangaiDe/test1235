/**
 * Reports shown in Business hub. Each `src` is served from public/hub/ in the
 * static build; on Cloudflare the Worker in worker/index.ts can serve a newer
 * copy from HUB_SOURCE instead (see README, "Business hub").
 */
export interface HubReport {
  id: 'coal' | 'fx';
  label: string;
  hint: string;
  src: string;
  /** id of the <script type="application/json"> that holds the report's runs */
  stateId: string;
}

export const HUB_REPORTS: readonly HubReport[] = [
  { id: 'coal', label: 'Coking coal', hint: 'Нүүрс тээвэр, хөрс хуулалт', src: '/hub/coal.html', stateId: 'coal-state' },
  { id: 'fx', label: 'USD/MNT', hint: 'Ханшийн эрсдэл', src: '/hub/fx.html', stateId: 'fx-state' },
];
