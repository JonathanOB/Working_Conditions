import { getEasaBasicFDP, getEasaMinRest, formatHM, type AcclimatisedState } from './calculators-easa';

export type A320DutyType = 'standard' | 'early' | 'ttn' | 'intercontinental' | 'extended';
export type A320Direction = 'westbound' | 'eastbound';

export interface FDPResult {
  easaValue: number;
  easaRef: string;
  wcValue: number;
  wcRef: string;
  binding: number;
  bindingSource: 'easa' | 'wc';
  warnings: string[];
}

// A320 FDP planning limits (§2.10)
export function getA320PlanningFDP(
  reportHour: number,
  reportMin: number,
  sectors: number,
  dutyType: A320DutyType,
  direction: A320Direction,
  acclimatised: AcclimatisedState
): FDPResult {
  const t = reportHour + reportMin / 60;
  const warnings: string[] = [];

  let wcValue: number;
  let wcRef: string;

  if (dutyType === 'intercontinental') {
    if (direction === 'eastbound') {
      wcValue = 12; wcRef = '§2.10.5(b) — Eastbound transatlantic';
    } else {
      wcValue = 12; wcRef = '§2.10.5(a) — Intercontinental';
    }
  } else if (dutyType === 'ttn') {
    wcValue = 10 + 10/60; wcRef = '§2.10.4(a) — TTN (0100–0459 start)';
    warnings.push('Through-the-Night duty: post-duty rest is duty+4h, min 14h (§2.20.9)');
  } else {
    // Standard/early
    if (t >= 1 && t < 5) {
      wcValue = 10 + 10/60; wcRef = '§2.10.4(a) — 0100–0459';
    } else if (t >= 5 && t < 5 + 50/60) {
      // 05:00–05:49
      if (sectors === 2) { wcValue = 11.0; wcRef = '§2.10.4(b) — 2-sector 0500–0549'; }
      else if (sectors > 2) { wcValue = 10 + 10/60; wcRef = '§2.10.4(c) — 3+ sectors 0500–0549'; }
      else { wcValue = 11.0; wcRef = '§2.10.4(b)'; }
    } else if (t >= 5 + 50/60 && t < 6 + 20/60) {
      // 05:50–06:19
      wcValue = 11 + 10/60; wcRef = '§2.10.4(d) — 0550–0619';
    } else {
      wcValue = 12.0; wcRef = '§2.10.4(e) — 0620–0059';
    }
  }

  if (dutyType === 'extended') {
    wcValue += 1;
    wcRef = wcRef + ' + §2.11.1 extended (+1h)';
    warnings.push('Extended duty: counts against 8/year quota (§2.11.1). Min 7 days separation from other extended duties.');
  }

  const easaResult = getEasaBasicFDP(reportHour, sectors, acclimatised);
  const binding = Math.min(easaResult.value, wcValue);
  const bindingSource = easaResult.value <= wcValue ? 'easa' : 'wc';

  if (sectors > 6) warnings.push('Continental max 6 landings (7 if 3 sectors each <1h) — §2.9.1');

  return { easaValue: easaResult.value, easaRef: easaResult.ref, wcValue, wcRef, binding, bindingSource, warnings };
}

// A320 operational FDP on delays (§3.11.1)
export function getA320OperationalFDP(
  startHour: number,
  startMin: number,
  endHour: number,
  endMin: number,
  sectors: number,
  dutyType: A320DutyType,
  direction: A320Direction
): { value: number; ref: string } {
  const t = startHour + startMin / 60;
  const endT = endHour + endMin / 60;

  if (dutyType === 'intercontinental') {
    if (direction === 'eastbound') return { value: 12, ref: '§3.11.2 — EB TA operational max' };
    return { value: 14, ref: '§3.11.2 — Intercontinental operational max' };
  }

  // Continental
  const terminates0200_0634 = (endT >= 2 && endT <= 6 + 34/60);
  if ((t >= 1 && t < 5 + 50/60) || terminates0200_0634) {
    return { value: 11.5, ref: '§3.11.1 — starts 0100–0549 or terminates 0200–0634' };
  }
  if (t >= 5 + 50/60 && t < 6 + 1/3) {
    return { value: 12, ref: '§3.11.1 — starts 0550–0619' };
  }
  // 0620–0159
  const sectorReduction = Math.min((Math.max(sectors - 2, 0)) * 0.5, 2);
  return { value: 13 - sectorReduction, ref: `§3.11.1 — falls entirely 0620–0159${sectorReduction > 0 ? ` (−${formatHM(sectorReduction)} sector reduction)` : ''}` };
}

// A320 Rest
export type A320RestScenario =
  | 'post_continental_base'
  | 'post_continental_outstation'
  | 'post_ttn'
  | 'pre_ic'
  | 'post_wb_ta'
  | 'post_eb_ta_outstation'
  | 'wb_to_eb_turnaround'
  | 'unscheduled_overnight'
  | 'post_standby_no_duty'
  | 'post_standby_duty';

export interface RestResult {
  easaValue: number;
  easaRef: string;
  wcValue: number;
  wcRef: string;
  binding: number;
  bindingSource: 'easa' | 'wc';
  formula: string;
}

export function calcA320Rest(params: {
  scenario: A320RestScenario;
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
    case 'post_continental_base':
      wcValue = Math.max(actualFDPHours + 2, 12); wcRef = '§3.14.1(a) / §2.17.1(a)';
      formula = `Actual duty (${formatHM(actualFDPHours)}) + 2h = ${formatHM(actualFDPHours + 2)} → min 12h → ${formatHM(wcValue)}`;
      break;
    case 'post_continental_outstation':
      wcValue = Math.max(actualFDPHours + 2, 11); wcRef = '§3.14.1(b) / §2.17.1(c)';
      formula = `Actual duty (${formatHM(actualFDPHours)}) + 2h = ${formatHM(actualFDPHours + 2)} → min 11h → ${formatHM(wcValue)}`;
      break;
    case 'post_ttn':
      wcValue = Math.max(actualFDPHours + 4, 14); wcRef = '§3.14.1(c) / §2.20.9';
      formula = `Actual duty (${formatHM(actualFDPHours)}) + 4h = ${formatHM(actualFDPHours + 4)} → min 14h → ${formatHM(wcValue)}`;
      break;
    case 'pre_ic':
      wcValue = 15; wcRef = '§3.14.2(a) / §2.17.2(b)';
      formula = 'Pre-intercontinental: fixed minimum 15h 00m';
      break;
    case 'post_wb_ta': {
      const calc = actualFDPHours + stdTimeDiffHours;
      wcValue = Math.max(calc, 18); wcRef = '§3.14.2(b) / §2.17.2(a)';
      formula = `Actual duty (${formatHM(actualFDPHours)}) + std time diff (${stdTimeDiffHours}h) = ${formatHM(calc)} → min 18h → ${formatHM(wcValue)}`;
      break;
    }
    case 'post_eb_ta_outstation': {
      const calc = actualFDPHours + stdTimeDiffHours;
      wcValue = Math.max(calc, 14); wcRef = '§3.14.2(e) / §2.17.2(e)';
      formula = `Actual duty (${formatHM(actualFDPHours)}) + std time diff (${stdTimeDiffHours}h) = ${formatHM(calc)} → min 14h → ${formatHM(wcValue)}`;
      break;
    }
    case 'wb_to_eb_turnaround':
      wcValue = 18; wcRef = '§2.17.2(a)';
      formula = 'WB→EB turnaround: minimum 18h free of all duty';
      break;
    case 'unscheduled_overnight':
      wcValue = Math.max(actualFDPHours + 2, 12); wcRef = '§3.14.4';
      formula = `Unscheduled overnight: normal minimum rest. May reduce by 1h if meal within prior 3h → ${formatHM(wcValue)}`;
      break;
    case 'post_standby_no_duty':
      wcValue = 12; wcRef = '§3.17.5(a)';
      formula = 'After standby (no duty assigned): minimum 12h 00m';
      break;
    case 'post_standby_duty':
      wcValue = Math.max(actualFDPHours + 2, 12); wcRef = '§3.17.5(b)';
      formula = `After standby (duty assigned): actual duty (${formatHM(actualFDPHours)}) + 2h = ${formatHM(actualFDPHours + 2)} → min 12h → ${formatHM(wcValue)}`;
      break;
    default:
      wcValue = 12; wcRef = '§3.14.1(a)'; formula = '';
  }

  const binding = Math.max(easaFloor.value, wcValue);
  const bindingSource = wcValue >= easaFloor.value ? 'wc' : 'easa';

  return { easaValue: easaFloor.value, easaRef: easaFloor.ref, wcValue, wcRef, binding, bindingSource, formula };
}

// A320 Days Off
export interface A320DaysOffResult {
  daysOff: number;
  daysOffClause: string;
  minimumHours: number;
  operationalMinimumHours: number;
  notes: string;
}

export function calcA320DaysOff(nightsAway: number, isBackToBackTA: boolean, calledFromStandby: boolean): A320DaysOffResult {
  if (calledFromStandby && nightsAway >= 4) {
    return { daysOff: 3, daysOffClause: '§2.4.3', minimumHours: 80 + 50/60, operationalMinimumHours: 79, notes: '4 consecutive standby nights: 3 free days on return.' };
  }
  if (isBackToBackTA) {
    return { daysOff: 4, daysOffClause: '§2.4.4', minimumHours: 104 + 50/60, operationalMinimumHours: 101, notes: 'Back-to-back TA: minimum 4 consecutive days off after 2nd trip.' };
  }
  if (nightsAway >= 7) {
    const extra = nightsAway - 7;
    return { daysOff: 4 + extra, daysOffClause: '§2.4.5', minimumHours: 104 + 50/60, operationalMinimumHours: 101, notes: `${nightsAway} nights away: ${4 + extra} days off on return.` };
  }
  if (nightsAway >= 5) {
    return { daysOff: 3, daysOffClause: '§2.4.5', minimumHours: 80 + 50/60, operationalMinimumHours: 79, notes: `${nightsAway} nights away: 3 days off on return.` };
  }
  if (nightsAway >= 4) {
    return { daysOff: 2, daysOffClause: '§2.4.5', minimumHours: 60 + 50/60, operationalMinimumHours: 58, notes: '4 nights away: 2 days off on return.' };
  }
  // EB transatlantic
  return { daysOff: 2, daysOffClause: '§2.4.4', minimumHours: 60 + 50/60, operationalMinimumHours: 58, notes: 'Eastbound transatlantic: minimum 2 days off at base.' };
}

export function getA320DayOffMinHours(daysOff: number): number {
  const planningMap: Record<number, number> = { 1: 36 + 50/60, 2: 60 + 50/60, 3: 80 + 50/60, 4: 104 + 50/60 };
  return planningMap[daysOff] ?? 36 + 50/60;
}

// A320 Delay
export interface A320DelayResult {
  effectiveFDPStart: string;
  maxFDPHours: number;
  maxFDPRef: string;
  ttnTriggered: boolean;
  ttnRef?: string;
  compensation: string;
}

export function calcA320Delay(params: {
  rosteredReportHour: number;
  rosteredReportMin: number;
  rosteredFinishHour: number;
  delayHours: number;
  dutyType: 'continental' | 'intercontinental';
  direction: A320Direction;
}): A320DelayResult {
  const { rosteredReportHour, rosteredReportMin, rosteredFinishHour, delayHours, dutyType, direction } = params;
  const rosteredReport = rosteredReportHour + rosteredReportMin / 60;
  const actualReport = rosteredReport + delayHours;

  let effectiveStart: number;
  let maxFDP: number;
  let ref: string;

  if (dutyType === 'intercontinental') {
    if (delayHours < 4) { effectiveStart = actualReport; ref = '§3.4.3(a) — Intercontinental delay <4h: from actual report'; }
    else { effectiveStart = rosteredReport + 4; ref = '§3.4.3(b) — Intercontinental delay ≥4h: from rostered + 4h'; }
    maxFDP = direction === 'eastbound' ? 12 : 14;
    ref += ` | ${direction === 'eastbound' ? '§3.11.2 Eastbound TA max 12h' : '§3.11.2 Intercontinental max 14h'}`;
  } else {
    if (delayHours < 2) { effectiveStart = actualReport; ref = '§3.4.4(a) — continental delay <2h: from actual report'; }
    else { effectiveStart = rosteredReport + 2; ref = '§3.4.4(b) — continental delay ≥2h: from rostered + 2h'; }
    maxFDP = 13;
    ref += ' | §3.11.1 operational max 13h';
  }

  const eh = Math.floor(effectiveStart) % 24;
  const em = Math.round((effectiveStart % 1) * 60);
  const effectiveFDPStart = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;

  // TTN triggers
  const actualFinish = rosteredFinishHour + delayHours;
  const ttnTriggered = (rosteredFinishHour < 1 && actualFinish >= 1 + 30/60) ||
                       (rosteredFinishHour < 3 && actualFinish >= 3 + 30/60);
  const ttnRef = ttnTriggered
    ? (rosteredFinishHour < 1 ? '§3.4.1 — delayed past 0130: night duty' : '§3.4.2 / §3.18 — delayed past 0330: TTN')
    : undefined;

  // Compensation
  let compensation: string;
  const lateMin = delayHours * 60;
  if (dutyType === 'continental') {
    if (lateMin <= 60) compensation = 'Nil';
    else if (lateMin <= 120) compensation = '0.19% OWC (§3.3.1 — 61–120m late)';
    else compensation = '1 day off or Blue Sheet (§3.3.1 — >2h late)';
  } else {
    if (lateMin <= 120) compensation = 'Nil';
    else compensation = '1 day off or Blue Sheet (§3.3.1 — Intercontinental >2h late)';
  }

  return { effectiveFDPStart, maxFDPHours: maxFDP, maxFDPRef: ref, ttnTriggered, ttnRef, compensation };
}

// A320 Standby
export interface A320StandbyResult {
  fdpCreditHours: number;
  remainingFDPHours: number;
  elapsedMaxHours: number;
  elapsedMaxRef: string;
  restRequiredHours: number;
  restRef: string;
  warnings: string[];
}

export function calcA320Standby(params: {
  type: 'stbh' | 'stba' | 'k-pre' | 'k-post' | 'k-standalone';
  standbyStartHour: number;
  dutyAssigned: boolean;
  callHour?: number;
  isIntercontinental?: boolean;
}): A320StandbyResult {
  const { type, standbyStartHour, dutyAssigned, callHour, isIntercontinental = false } = params;
  const warnings: string[] = [];

  let fdpCredit = 0;
  let elapsedMax: number;
  let elapsedRef: string;

  if (type === 'stbh') {
    const callTime = callHour ?? standbyStartHour;
    fdpCredit = Math.max(0, (callTime - standbyStartHour) * 0.5); // 50% of expired standby

    if (isIntercontinental) {
      elapsedMax = 14; elapsedRef = '§3.17.2(f) — Intercontinental: max 14h from standby start';
    } else {
      // If the full 16h window from standby start would end in 01:00–06:29, apply 13h cap instead.
      const wouldEndIn = (standbyStartHour + 16) % 24;
      const landInWOCL = wouldEndIn >= 1 && wouldEndIn < 6.5;
      if (landInWOCL) {
        elapsedMax = 13; elapsedRef = '§3.17.2(e) — FDP would enter 0100–0629: max 13h from standby start';
      } else {
        elapsedMax = 16; elapsedRef = '§3.17.2(e) — FDP outside 0100–0629: max 16h from standby start';
      }
    }
    // Pre-22:00 STBH cannot be used to cover IC departures between 00:00 and 07:59
    if (standbyStartHour < 22 && (standbyStartHour + elapsedMax) > 24) {
      warnings.push('Standby commences before 22:00 and extends past midnight — cannot cover Intercontinental departures 00:00–07:59 (§3.16.9)');
    }
  } else if (type === 'stba') {
    // STBA: elapsed airport standby time counts at 100% as FDP credit
    fdpCredit = Math.max(0, (callHour ?? standbyStartHour) - standbyStartHour);
    elapsedMax = 9; elapsedRef = '§2.16.1(c) — STBA: max 9h total from standby start';
  } else if (type === 'k-pre') {
    // K-pre: 50% of pre-report standby time
    fdpCredit = Math.max(0, ((callHour ?? standbyStartHour) - standbyStartHour) * 0.5);
    elapsedMax = 10; elapsedRef = '§2.16.3 — K-duty: max 10h from standby start';
  } else if (type === 'k-standalone') {
    // K-standalone: 75% of elapsed K-duty period
    fdpCredit = Math.max(0, ((callHour ?? standbyStartHour) - standbyStartHour) * 0.75);
    elapsedMax = 10; elapsedRef = '§2.16.3(h) — K standalone: max 10h, 75% credit';
  } else {
    // k-post: no FDP credit (available for further duty after post-flight K)
    fdpCredit = 0;
    elapsedMax = 10; elapsedRef = '§2.16.3(d) — K post-flight: max 10h from start';
  }

  // IC max FDP limit differs from continental (12h vs up to 13h continental)
  const baseFDPMax = isIntercontinental ? 12 : 13;
  const remaining = Math.max(0, baseFDPMax - fdpCredit);

  // Rest: minimum 12h after standby with duty; the actual formula (duty+2h or 12h) requires
  // knowing actual FDP which isn't available at planning time — show the minimum floor.
  const restHours = dutyAssigned ? 12 : 12;
  const restRef = dutyAssigned
    ? '§3.17.5(b) — min 12h (actual duty+2h if longer)'
    : '§3.17.5(a) — 12h after standby (no duty)';

  return {
    fdpCreditHours: fdpCredit,
    remainingFDPHours: remaining,
    elapsedMaxHours: elapsedMax,
    elapsedMaxRef: elapsedRef,
    restRequiredHours: restHours,
    restRef,
    warnings,
  };
}
