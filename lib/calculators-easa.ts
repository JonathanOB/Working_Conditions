// EASA ORO.FTL shared calculation logic

export type AcclimatisedState = 'acclimatised' | 'unknown';
export type RestFacility = 'class1' | 'class2' | 'class3';
export interface WOCLResult {
  inWOCL: boolean;
  startEncroachMin: number;  // minutes duty start is within WOCL (02:00–05:59)
  endEncroachMin: number;    // minutes duty end is within WOCL
}

// EASA Table 1 — Basic Max FDP
// reportHour: 0-23
// sectors: 1+
// acclimatised: whether crew is acclimatised
export function getEasaBasicFDP(
  reportHour: number,
  sectors: number,
  acclimatised: AcclimatisedState
): { value: number; ref: string } {
  // Determine bucket
  const inA = reportHour >= 6 && reportHour <= 13;   // 06:00–13:59
  const inB = reportHour >= 14 && reportHour <= 21;   // 14:00–21:59
  // inC = 22:00–05:59 (everything else)

  const bucket = inA ? 'A' : inB ? 'B' : 'C';

  const sKey =
    sectors <= 2 ? '1-2' :
    sectors === 3 ? '3' :
    sectors === 4 ? '4' :
    sectors === 5 ? '5' : '6+';

  const TABLE: Record<string, Record<string, number>> = {
    A: { '1-2': 13.0, '3': 12.5, '4': 12.0, '5': 11.5, '6+': 11.0 },
    B: { '1-2': 12.0, '3': 11.5, '4': 11.0, '5': 10.5, '6+': 10.0 },
    C: { '1-2': 11.0, '3': 10.5, '4': 10.0, '5':  9.5, '6+':  9.0 },
  };

  let base = TABLE[bucket][sKey];
  if (acclimatised === 'unknown') base = Math.max(base - 1, 9.0);

  const timeLabel =
    bucket === 'A' ? '06:00–13:59' :
    bucket === 'B' ? '14:00–21:59' : '22:00–05:59';

  return {
    value: base,
    ref: `ORO.FTL.205(b) Table 1 — ${sectors} sector${sectors > 1 ? 's' : ''}, report ${timeLabel}${acclimatised === 'unknown' ? ' (−1h unknown acc.)' : ''}`,
  };
}

// EASA Augmented FDP max
export function getEasaAugmentedFDP(
  extraCrew: 1 | 2,
  restFacility: RestFacility
): { value: number; ref: string } {
  const TABLE: Record<RestFacility, Record<1|2, number>> = {
    class1: { 1: 16, 2: 17 },
    class2: { 1: 15, 2: 16 },
    class3: { 1: 14, 2: 15 },
  };
  const facilityLabel = { class1: 'Class 1 (flat bunk)', class2: 'Class 2', class3: 'Class 3' };
  return {
    value: TABLE[restFacility][extraCrew],
    ref: `ORO.FTL.205(e) — +${extraCrew} pilot(s), ${facilityLabel[restFacility]}`,
  };
}

// EASA minimum rest
export function getEasaMinRest(
  actualFDPHours: number,
  isBase: boolean
): { value: number; ref: string } {
  const min = isBase ? Math.max(actualFDPHours, 12) : Math.max(actualFDPHours, 10);
  return {
    value: min,
    ref: isBase ? 'ORO.FTL.210 — home base' : 'ORO.FTL.210 — outstation',
  };
}

// WOCL check
export function checkWOCL(startHour: number, durationHours: number): WOCLResult {
  const WOCL_START = 2;   // 02:00
  const WOCL_END   = 6;   // 06:00 (exclusive, so 05:59)
  const endHour = (startHour + durationHours) % 24;

  // Check if duty overlaps with 02:00–05:59
  const dutyEnd = startHour + durationHours;
  const woclStartMin = WOCL_START * 60;
  const woclEndMin   = WOCL_END * 60;
  const dutyStartMin = startHour * 60;
  const dutyEndMin   = dutyEnd * 60;

  const overlapStart = Math.max(dutyStartMin, woclStartMin);
  const overlapEnd   = Math.min(dutyEndMin, woclEndMin);
  const overlap = Math.max(0, overlapEnd - overlapStart);

  return {
    inWOCL: overlap > 0,
    startEncroachMin: Math.max(0, woclEndMin - dutyStartMin),
    endEncroachMin:   Math.max(0, dutyEndMin - woclStartMin),
  };
}

// Format decimal hours to "Xh Ym"
export function formatHM(decimalHours: number): string {
  const totalMin = Math.round(decimalHours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h}h` : `${h}h ${m.toString().padStart(2, '0')}m`;
}
