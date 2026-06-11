import { getEasaBasicFDP, getEasaAugmentedFDP, getEasaMinRest, checkWOCL, formatHM, type AcclimatisedState, type RestFacility } from './calculators-easa';

export type WBDutyType = 'standard' | 'eastbound' | 'ttn' | 'augmented' | 'heavy';

export interface FDPResult {
  easaValue: number;
  easaRef: string;
  wcValue: number;
  wcRef: string;
  binding: number;
  bindingSource: 'easa' | 'wc';
  warnings: string[];
}

// WB FDP calculator
export function calcWBFDP(params: {
  reportHour: number;
  sectors: number;
  dutyType: WBDutyType;
  acclimatised: AcclimatisedState;
  restFacility?: RestFacility;
  extraCrew?: 1 | 2;
}): FDPResult {
  const { reportHour, sectors, dutyType, acclimatised, restFacility = 'class3', extraCrew = 1 } = params;

  // EASA floor
  const isAugmented = dutyType === 'augmented' || dutyType === 'heavy';
  let easaResult = isAugmented
    ? getEasaAugmentedFDP(dutyType === 'heavy' ? 2 : extraCrew, restFacility)
    : getEasaBasicFDP(reportHour, sectors, acclimatised);

  // WC limits (§2.15)
  let wcValue: number;
  let wcRef: string;
  const warnings: string[] = [];

  switch (dutyType) {
    case 'standard':
      wcValue = 12;
      wcRef = '§2.15.1 — Standard 2-pilot';
      break;
    case 'eastbound':
    case 'ttn':
      wcValue = 11;
      wcRef = dutyType === 'eastbound' ? '§2.15.2 — Eastbound TA' : '§2.15.2 — Through-the-Night N-S';
      break;
    case 'augmented': {
      // §2.15.4: Without agreed cockpit crew rest area (class 3 seat) → max 14h WB / 13h EB
      // §2.15.3: With cockpit rest area → max 15h (with WOCL reduction)
      const hasRestArea = restFacility !== 'class3';
      wcValue = hasRestArea ? 15 : 14;
      wcRef = hasRestArea ? '§2.15.3 — Augmented (with cockpit rest area)' : '§2.15.4 — Augmented (no cockpit rest area, max 14h WB)';
      if (!hasRestArea) {
        warnings.push('No cockpit rest area: WC limit reduced to 14h westbound / 13h eastbound (§2.15.4)');
      }
      // WOCL encroachment reduction (§2.15.3 — only applies when rest area present)
      if (hasRestArea) {
        const wocl = checkWOCL(reportHour, 15);
        if (wocl.inWOCL) {
          const startR = Math.min(wocl.startEncroachMin / 60, 2);
          const endR   = Math.min((wocl.endEncroachMin / 60) * 0.5, 2);
          const reduction = Math.min(startR + endR, 2);
          if (reduction > 0) {
            wcValue -= reduction;
            warnings.push(`WOCL encroachment: −${formatHM(reduction)} reduction applied (§2.15.3)`);
          }
        }
      }
      break;
    }
    case 'heavy':
      wcValue = 17;
      wcRef = '§2.15.5 — Heavy crew (+2 pilots)';
      break;
    default:
      wcValue = 12;
      wcRef = '§2.15.1';
  }

  const binding = Math.min(easaResult.value, wcValue);
  const bindingSource = easaResult.value <= wcValue ? 'easa' : 'wc';

  // Landing limit warnings — differentiated by duty type (§2.13)
  if (dutyType === 'eastbound' && sectors >= 2) {
    warnings.push('Eastbound Intercontinental: max 2 landings as operating pilot per duty (§2.13.2)');
  } else if (dutyType === 'heavy' && sectors >= 2) {
    warnings.push('Heavy crew: max 2 landings per crew member per duty (§2.13.3)');
  } else if (sectors >= 4) {
    warnings.push('Intercontinental landings: max 4 per duty for standard/augmented operations (§2.13.1)');
  }

  return {
    easaValue: easaResult.value,
    easaRef: easaResult.ref,
    wcValue,
    wcRef,
    binding,
    bindingSource,
    warnings,
  };
}

// WB Rest calculator
export type WBRestScenario =
  | 'pre_ic'
  | 'pre_ic_after_stby'
  | 'pre_ns'
  | 'post_ic_base'
  | 'post_ic_eb_outstation'
  | 'outstation_ic_turnaround'
  | 'post_continental_base'
  | 'post_continental_outstation'
  | 'post_ttn'
  | 'post_ns_base'
  | 'post_ns_outstation'
  | 'post_south_africa'
  | 'after_standby';

export interface RestResult {
  easaValue: number;
  easaRef: string;
  wcValue: number;
  wcRef: string;
  binding: number;
  bindingSource: 'easa' | 'wc';
  formula: string;
}

export function calcWBRest(params: {
  scenario: WBRestScenario;
  actualFDPHours?: number;
  stdTimeDiffHours?: number;
  isBase?: boolean;
}): RestResult {
  const { scenario, actualFDPHours = 0, stdTimeDiffHours = 0, isBase = true } = params;
  const easaFloor = getEasaMinRest(actualFDPHours, isBase);

  let wcValue: number;
  let wcRef: string;
  let formula: string;

  switch (scenario) {
    case 'pre_ic':
      wcValue = 15; wcRef = '§2.22.2 / §3.13.1';
      formula = 'Fixed minimum: 15h 00m';
      break;
    case 'pre_ic_after_stby':
      wcValue = 13; wcRef = '§3.13.1';
      formula = 'Preceded by STBH: 13h 00m';
      break;
    case 'pre_ns':
      wcValue = Math.max(actualFDPHours + 4, 14); wcRef = '§2.23.1';
      formula = `Preceding duty (${formatHM(actualFDPHours)}) + 4h = ${formatHM(actualFDPHours + 4)} → min 14h → ${formatHM(wcValue)}`;
      break;
    case 'post_ic_base': {
      const calc = actualFDPHours + stdTimeDiffHours;
      wcValue = Math.max(calc, 18); wcRef = '§3.13.2';
      formula = `Actual FDP (${formatHM(actualFDPHours)}) + std time diff (${stdTimeDiffHours}h) = ${formatHM(calc)} → min 18h → ${formatHM(wcValue)}`;
      break;
    }
    case 'post_ic_eb_outstation': {
      const calc = actualFDPHours + stdTimeDiffHours;
      // §2.22.5: planning minimum = rostered FDP + std time diff, not less than 15h
      // §3.13.5: operating minimum = actual FDP + std time diff, not less than 14h
      wcValue = Math.max(calc, 15); wcRef = '§2.22.5 (planning min 15h)';
      formula = `Rostered duty (${formatHM(actualFDPHours)}) + std time diff (${stdTimeDiffHours}h) = ${formatHM(calc)} → planning min 15h (§2.22.5) → ${formatHM(wcValue)}\nNote: §3.13.5 operating minimum is actual duty + time diff, min 14h (applies if actual FDP differs from rostered)`;
      break;
    }
    case 'outstation_ic_turnaround':
      // §2.22.1: Turnaround at outstation between two IC duties
      wcValue = 22; wcRef = '§2.22.1';
      formula = 'Fixed minimum 22h: turnaround at outstation between completion of Intercontinental duty and commencement of another Intercontinental duty (§2.22.1)';
      break;
    case 'post_continental_base':
      wcValue = Math.max(actualFDPHours + 2, 12); wcRef = '§3.13.7.1';
      formula = `Actual duty (${formatHM(actualFDPHours)}) + 2h = ${formatHM(actualFDPHours + 2)} → min 12h → ${formatHM(wcValue)}`;
      break;
    case 'post_continental_outstation':
      wcValue = Math.max(actualFDPHours + 2, 11); wcRef = '§3.13.7.2';
      formula = `Actual duty (${formatHM(actualFDPHours)}) + 2h = ${formatHM(actualFDPHours + 2)} → min 11h → ${formatHM(wcValue)}`;
      break;
    case 'post_ttn':
      wcValue = Math.max(actualFDPHours + 4, 14); wcRef = '§3.13.7.3';
      formula = `Actual duty (${formatHM(actualFDPHours)}) + 4h = ${formatHM(actualFDPHours + 4)} → min 14h → ${formatHM(wcValue)}`;
      break;
    case 'post_ns_base':
      wcValue = Math.max(actualFDPHours + 4, 15); wcRef = '§2.23.3';
      formula = `Actual duty (${formatHM(actualFDPHours)}) + 4h = ${formatHM(actualFDPHours + 4)} → min 15h → ${formatHM(wcValue)}`;
      break;
    case 'post_ns_outstation':
      wcValue = Math.max(actualFDPHours + 4, 14); wcRef = '§2.23.2';
      formula = `Actual duty (${formatHM(actualFDPHours)}) + 4h = ${formatHM(actualFDPHours + 4)} → min 14h → ${formatHM(wcValue)}`;
      break;
    case 'post_south_africa':
      wcValue = 40; wcRef = '§2.24.1';
      formula = 'South Africa outstation: 40h or 2 local nights (whichever greater) → 40h 00m';
      break;
    case 'after_standby':
      wcValue = 13; wcRef = '§3.16.10';
      formula = 'After standby: fixed minimum 13h 00m';
      break;
    default:
      wcValue = 12; wcRef = '§3.13.7.1'; formula = '';
  }

  const binding = Math.max(easaFloor.value, wcValue);
  const bindingSource = wcValue >= easaFloor.value ? 'wc' : 'easa';

  return { easaValue: easaFloor.value, easaRef: easaFloor.ref, wcValue, wcRef, binding, bindingSource, formula };
}

// WB Days Off - coefficient system
export interface WBDaysOffResult {
  daysOff: number;
  daysOffClause: string;
  coefficient: number;
  coeffBankCredit: number;
  minimumHours: number;
  notes: string;
}

export function calcWBDaysOff(destination: string, nightStops: number, callFromStandby: boolean, serviceFrequency: number): WBDaysOffResult {
  const CORE = ['JFK', 'EWR', 'BOS', 'ORD', 'MIA'];
  // DEN, LAS, CUN are treated as augmented west-coast destinations (coeff 4.0) per WC §2.5.15.2
  const WEST_COAST = ['LAX', 'SFO', 'SEA', 'DEN', 'LAS', 'CUN'];

  if (destination === 'CHARTER') {
    return { daysOff: 0, daysOffClause: '—', coefficient: 0, coeffBankCredit: 0, minimumHours: 0, notes: '' };
  }
  if (CORE.includes(destination)) {
    return { daysOff: 2, daysOffClause: '§2.5.3', coefficient: 2.6, coeffBankCredit: 0, minimumHours: 61, notes: 'East-coast core duty. Coefficient: 2.6.' };
  }
  if (destination === 'MCO') {
    return { daysOff: 2, daysOffClause: '§2.5.3', coefficient: 3.5, coeffBankCredit: 0, minimumHours: 61, notes: 'Florida. Coefficient: 3.5. Stick time rule §2.27.4 applies.' };
  }
  if (WEST_COAST.includes(destination)) {
    // §2.5.14 table — check multi-night FIRST; it overrides standby for coeff bank credit
    if (nightStops >= 2) {
      // Two or more local nights — always 3 days + 1 bank regardless of frequency or standby (§2.5.11, §2.5.14)
      return { daysOff: 3, daysOffClause: '§2.5.11', coefficient: 4.0, coeffBankCredit: 1, minimumHours: 85, notes: 'Two or more local nights at augmented west coast destination: 3 days off + 1 day coefficient bank credit (§2.5.11 / §2.5.14).' };
    }
    // Single night stop from here on
    if (callFromStandby) {
      // §2.5.14 standby row, single night column: 3 days + 2 bank
      return { daysOff: 3, daysOffClause: '§2.5.14', coefficient: 4.0, coeffBankCredit: 2, minimumHours: 85, notes: 'Called from standby to augmented west coast, single night stop: 3 days off + 2 days coefficient bank credit (§2.5.14).' };
    }
    if (serviceFrequency <= 5) {
      // §2.5.12 / §2.5.14 — ≤5 services/week, single night: 3 days + 2 bank
      return { daysOff: 3, daysOffClause: '§2.5.12', coefficient: 4.0, coeffBankCredit: 2, minimumHours: 85, notes: 'Service scheduled ≤5 times per week, single night stop: 3 days off + 2 days coefficient bank credit (§2.5.12 / §2.5.14).' };
    }
    // §2.5.10 / §2.5.14 — 6 or 7 services/week, single night: 4 days + 1 bank
    return { daysOff: 4, daysOffClause: '§2.5.10', coefficient: 4.0, coeffBankCredit: 1, minimumHours: 109, notes: 'Single daily service (6–7 per week), single night stop at augmented destination: 4 days off + 1 day coefficient bank credit (§2.5.10 / §2.5.14).' };
  }
  return { daysOff: 2, daysOffClause: '§2.5.3', coefficient: 2.6, coeffBankCredit: 0, minimumHours: 61, notes: 'Standard core duty.' };
}

export function getWBDayOffMinHours(daysOff: number): number {
  const MAP: Record<number, number> = { 1: 40, 2: 61, 3: 85, 4: 109 };
  return MAP[daysOff] ?? 40;
}

// WB Delay
export interface WBDelayResult {
  effectiveFDPStart: string;
  fdpStartRule: string;
  maxFDPHours: number;
  maxFDPRef: string;
  // Operational extension in delays (§3.10.1 / §3.10.2)
  operationalExtension: number;
  operationalExtensionMax: number;
  operationalExtensionRef: string;
  // Days-off infringement compensation (§3.4.1) — triggered when ≥2h and days off reduced
  daysOffCompensation: string;
  daysOffCompensationRef: string;
  // §3.7.3 — at base, pilot may refuse if delay known to infringe days off
  rightToRefuse: boolean;
}

export function calcWBDelay(rosteredReport: number, delayHours: number, dutyType: WBDutyType): WBDelayResult {
  // §3.7.1 / §3.7.2 — FDP start depends on pre-report delay magnitude
  let effectiveStart: number;
  let fdpStartRule: string;
  if (delayHours < 4) {
    effectiveStart = rosteredReport + delayHours;
    fdpStartRule = '§3.7.1 — delay <4h: FDP calculated from actual reporting time';
  } else {
    effectiveStart = rosteredReport + 4;
    fdpStartRule = '§3.7.2 — delay ≥4h: FDP calculated from rostered report time + 4h';
  }

  const baseMax = dutyType === 'heavy' ? 17 : dutyType === 'augmented' ? 15 : dutyType === 'eastbound' ? 11 : 12;
  const isAugmented = dutyType === 'augmented' || dutyType === 'heavy';

  // §3.10.1 / §3.10.2 — operational extension available in delays
  const extension = isAugmented ? 2 : 1;
  const absMax = isAugmented ? (dutyType === 'heavy' ? 19 : 17) : 16;
  const extRef = isAugmented
    ? '§3.10.2 — augmented crew: +2h extension (or +1h if WOCL encroachment)'
    : '§3.10.1 — 2-pilot: +1h extension, max 16h absolute. If operating pilot period 01:00–06:29 → max 12h duty as operating pilot';

  const effectiveHour = Math.floor(effectiveStart) % 24;
  const h = effectiveHour.toString().padStart(2, '0');
  const m = Math.round((effectiveStart % 1) * 60).toString().padStart(2, '0');

  // §3.4.1 days-off infringement compensation — applies when delay ≥2h AND reduces days off below minimum
  let daysOffComp: string;
  let daysOffRef: string;
  if (delayHours >= 2) {
    daysOffComp = 'If days off are reduced below minimum (§2.5.1): pilot may claim a day\'s leave OR Blue Sheet payment "working on a day off" (§3.4.1.1). If duty terminates after 23:00 before days off: same options apply without the 2h requirement (§3.4.1.2).';
    daysOffRef = '§3.4.1.1 / §3.4.1.2';
  } else {
    daysOffComp = 'Delay under 2h — days-off compensation threshold not reached (§3.4.1.1 requires ≥2h delay).';
    daysOffRef = '§3.4.1.1';
  }

  return {
    effectiveFDPStart: `${h}:${m}`,
    fdpStartRule,
    maxFDPHours: baseMax,
    maxFDPRef: `WC §2.15 — ${dutyType} limit`,
    operationalExtension: extension,
    operationalExtensionMax: absMax,
    operationalExtensionRef: extRef,
    daysOffCompensation: daysOffComp,
    daysOffCompensationRef: daysOffRef,
    // §3.7.3 — right to refuse always exists at base when delay would infringe days off
    rightToRefuse: true,
  };
}
