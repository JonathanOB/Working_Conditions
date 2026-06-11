export type Fleet = 'wb' | 'a320';

export const FLEET_LABELS: Record<Fleet, string> = {
  wb: 'A330 · WB',
  a320: 'A320/Neo · NB',
};

export const FLEET_NAMES: Record<Fleet, string> = {
  wb: 'A330 Widebody',
  a320: 'A320/321/(Neo) Narrowbody',
};

export const FLEET_WC_VERSION: Record<Fleet, string> = {
  wb: 'WC 2025 · signed 10/09/2025',
  a320: 'WC May 2018',
};
