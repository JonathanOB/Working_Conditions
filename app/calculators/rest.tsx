import React, { useState } from 'react';
import { View, Text, ScrollView, useColorScheme, Modal, TouchableOpacity } from 'react-native';
import { useFleet } from '../../hooks/useFleet';
import { FleetBadge } from '../../components/FleetBadge';
import { RuleCard } from '../../components/RuleCard';
import { SectionHeader } from '../../components/SectionHeader';
import { DropdownPicker } from '../../components/DropdownPicker';
import { calcWBRest, type WBRestScenario } from '../../lib/calculators-wb';
import { calcA320Rest, type A320RestScenario } from '../../lib/calculators-a320';
import { formatHM } from '../../lib/calculators-easa';
import { Calendar, X } from 'lucide-react-native';

function Stepper({ label, value, min, max, onChange, isDark, unit = 'h' }: {
  label: string; value: number; min: number; max: number;
  onChange: (v: number) => void; isDark: boolean; unit?: string;
}) {
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const borderColor = isDark ? '#1E3A5F' : '#E2E4EA';
  const textColor = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: sub }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => onChange(Math.max(min, value - 1))} style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: card, borderWidth: 1, borderColor, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20, color: textColor, lineHeight: 22 }}>−</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: textColor, width: 40, textAlign: 'center' }}>{value}{unit}</Text>
        <TouchableOpacity onPress={() => onChange(Math.min(max, value + 1))} style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: card, borderWidth: 1, borderColor, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20, color: textColor, lineHeight: 22 }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RuleModal({ visible, onClose, title, color, subtitle, body, isDark }: {
  visible: boolean; onClose: () => void;
  title: string; color: string; subtitle: string; body: string; isDark: boolean;
}) {
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';
  const pageBg = isDark ? '#0A1628' : '#F7F8FA';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={{ flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: pageBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '82%' }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            padding: 20, borderBottomWidth: 0.5, borderBottomColor: border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
              <Text style={{ fontSize: 17, fontWeight: '700', color: text }}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={sub} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            <View style={{ backgroundColor: `${color}18`, borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 0.5, borderColor: `${color}40` }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: 0.5 }}>Reference</Text>
              <Text style={{ fontSize: 14, color, fontWeight: '600', marginTop: 4 }}>{subtitle}</Text>
            </View>
            <Text style={{ fontSize: 15, color: text, lineHeight: 24 }}>{body}</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const EASA_REST_BODY =
  `ORO.FTL.235 sets the minimum rest for commercial air transport operations.\n\n` +
  `At home base, the minimum rest is the greater of:\n` +
  `  • 12 hours, or\n` +
  `  • preceding FDP + 10 hours\n\n` +
  `This ensures at least 8 hours of sleep opportunity, accounting for travel and physiological needs.\n\n` +
  `At outstation, the minimum ensures at least 10 hours free of duty, providing 8 hours of sleep opportunity after travel to/from accommodation.\n\n` +
  `The EASA minimum acts as a floor — the Working Conditions minimum applies where it is higher.`;

const WB_WC_BODY: Record<WBRestScenario, string> = {
  pre_ic:
    `§2.22.2 — Minimum Rest Before Intercontinental Duty\n\n` +
    `"The minimum rest period before an intercontinental flight duty shall not be less than fifteen (15) hours."\n\n` +
    `This is a fixed planning minimum and applies regardless of how long the preceding duty was. ` +
    `It supersedes the lower operating figure in §3.13.1 (13h when called from standby).`,

  pre_ic_after_stby:
    `§3.13.1 — Pre-Intercontinental Rest When Called from Standby\n\n` +
    `"Where a pilot is called from home base standby to operate an intercontinental duty, the minimum rest period before that duty shall not be less than thirteen (13) hours."\n\n` +
    `This reduced minimum applies operationally when called off STBH. The planning minimum remains 15h (§2.22.2).`,

  pre_ns:
    `§2.23.1 — Minimum Rest Before a North/South Duty\n\n` +
    `"The minimum rest period before a North/South duty shall not be less than the duration of the preceding duty plus four (4) hours, and not less than fourteen (14) hours."\n\n` +
    `Formula: preceding FDP + 4h → minimum 14h.`,

  post_ic_base:
    `§3.13.2 — Minimum Rest at Base After Intercontinental Duty\n\n` +
    `"The minimum rest period at home base following an intercontinental flight duty shall not be less than the actual duty time plus the standard time difference from the point of operation to the home base, and not less than eighteen (18) hours."\n\n` +
    `Formula: actual FDP + standard time difference → minimum 18h.\n\n` +
    `The standard time difference accounts for circadian disruption from the westbound flight.`,

  post_ic_eb_outstation:
    `§2.22.5 — Planning Minimum Rest at Outstation (Before EB Return)\n\n` +
    `"A pilot who is required to operate an eastbound flight from an outstation shall have a minimum rest before such duty equal to the rostered duration of the flight duty plus the standard time difference, and not less than fifteen (15) hours."\n\n` +
    `Formula: rostered FDP + standard time difference → planning minimum 15h.\n\n` +
    `§3.13.5 — Operating Minimum (if actual FDP differs from rostered):\n` +
    `Actual duty + standard time difference → minimum 14h.\n\n` +
    `The higher planning figure (§2.22.5) should appear on the roster. The operating figure (§3.13.5) applies if delays extend the actual duty.`,

  outstation_ic_turnaround:
    `§2.22.1 — Minimum Turnaround at Outstation Between Intercontinental Duties\n\n` +
    `"The minimum turnaround at an outstation between the completion of an intercontinental duty and the commencement of another intercontinental duty shall not be less than twenty-two (22) hours."\n\n` +
    `This is a fixed minimum and cannot be reduced regardless of duty durations or time differences. It applies when a pilot operates two separate Intercontinental duties from the same outstation without returning to base in between.`,

  post_continental_base:
    `§3.13.7.1 — Minimum Rest at Base After Continental Duty\n\n` +
    `"The minimum rest period at home base following a continental duty shall not be less than actual duty time plus two (2) hours, and not less than twelve (12) hours."\n\n` +
    `Formula: actual duty + 2h → minimum 12h.`,

  post_continental_outstation:
    `§3.13.7.2 — Minimum Rest at Outstation After Continental Duty\n\n` +
    `"The minimum rest period at an outstation following a continental duty shall not be less than actual duty time plus two (2) hours, and not less than eleven (11) hours."\n\n` +
    `Formula: actual duty + 2h → minimum 11h.`,

  post_ttn:
    `§3.13.7.3 — Minimum Rest After Through-The-Night Duty\n\n` +
    `"The minimum rest period following a through-the-night continental duty shall not be less than actual duty time plus four (4) hours, and not less than fourteen (14) hours."\n\n` +
    `Formula: actual duty + 4h → minimum 14h.\n\n` +
    `The additional 4h (vs. standard continental +2h) reflects the greater fatigue associated with through-the-night operations.`,

  post_ns_base:
    `§2.23.3 — Minimum Rest at Base After North/South Duty\n\n` +
    `"The minimum rest period at home base following a North/South duty shall not be less than the actual duty time plus four (4) hours, and not less than fifteen (15) hours."\n\n` +
    `Formula: actual duty + 4h → minimum 15h.`,

  post_ns_outstation:
    `§2.23.2 — Minimum Rest at Outstation After North/South Duty\n\n` +
    `"The minimum rest period at an outstation following a North/South duty shall not be less than the actual duty time plus four (4) hours, and not less than fourteen (14) hours."\n\n` +
    `Formula: actual duty + 4h → minimum 14h.`,

  post_south_africa:
    `§2.24.1 — Minimum Rest at South Africa Outstation\n\n` +
    `"Following a duty to South Africa, the minimum rest period at the outstation shall not be less than forty (40) hours, or two local nights — whichever is the greater."\n\n` +
    `The 40h fixed minimum reflects the extreme time zone displacement (UTC+2) and ensures full circadian recovery before the return eastbound duty.`,

  after_standby:
    `§3.16.10 — Minimum Rest After Standby Duty (Not Called Out)\n\n` +
    `"Following a standby duty at home base during which the pilot was not called out, the minimum rest period before the next duty shall not be less than thirteen (13) hours."\n\n` +
    `This applies when STBH ends without a flight assignment. Even an uncalled standby counts as duty for rest calculation purposes.`,
};

const A320_WC_BODY: Record<A320RestScenario, string> = {
  post_continental_base:
    `§3.14 — Minimum Rest at Base After Continental Duty\n\n` +
    `"Following a continental duty, the minimum rest period at home base shall not be less than actual duty time plus two (2) hours, and not less than twelve (12) hours."\n\n` +
    `Formula: actual duty + 2h → minimum 12h.`,

  post_continental_outstation:
    `§3.14 — Minimum Rest at Outstation After Continental Duty\n\n` +
    `"Following a continental duty at outstation, the minimum rest period shall not be less than actual duty time plus two (2) hours, and not less than eleven (11) hours."\n\n` +
    `Formula: actual duty + 2h → minimum 11h.`,

  post_ttn:
    `§3.14 — Minimum Rest After Through-The-Night Duty\n\n` +
    `"Following a through-the-night continental duty, the minimum rest period shall not be less than actual duty time plus four (4) hours, and not less than fourteen (14) hours."\n\n` +
    `Formula: actual duty + 4h → minimum 14h.`,

  pre_ic:
    `§2.17 — Minimum Rest Before Intercontinental Duty\n\n` +
    `"The minimum rest period before an intercontinental flight duty shall not be less than fifteen (15) hours."\n\n` +
    `Fixed planning minimum regardless of preceding duty duration.`,

  post_wb_ta:
    `§3.14 — Minimum Rest at Base After Westbound Transatlantic\n\n` +
    `"Following a westbound intercontinental duty at home base, the minimum rest shall not be less than actual duty time plus the standard time difference, and not less than eighteen (18) hours."\n\n` +
    `Formula: actual FDP + standard time difference → minimum 18h.`,

  post_eb_ta_outstation:
    `§3.14 — Minimum Rest at Outstation After Eastbound Transatlantic\n\n` +
    `"Following an eastbound intercontinental duty at outstation, the minimum rest before the return duty shall not be less than rostered duty plus standard time difference, and not less than fifteen (15) hours."\n\n` +
    `Formula: rostered FDP + standard time difference → minimum 15h.`,

  wb_to_eb_turnaround:
    `§2.17 — Westbound to Eastbound Turnaround at Outstation\n\n` +
    `"Where a pilot operates a westbound Intercontinental duty and is then required to operate an eastbound Intercontinental duty from the same outstation, the minimum turnaround shall not be less than twenty-two (22) hours."\n\n` +
    `Fixed 22h minimum between two Intercontinental duties at the same outstation.`,

  unscheduled_overnight:
    `§3.14 — Unscheduled Overnight (Diversion or Delay)\n\n` +
    `"Where an unscheduled overnight occurs at an outstation due to diversion or delay, the minimum rest period shall not be less than actual duty plus two (2) hours, and not less than ten (10) hours."\n\n` +
    `Formula: actual duty + 2h → minimum 10h.`,

  post_standby_no_duty:
    `§3.17 — Rest After Standby (Not Called)\n\n` +
    `"Following a standby duty at home base during which the pilot was not called out, the minimum rest before the next duty shall not be less than ten (10) hours."\n\n` +
    `Fixed minimum of 10h applies even when no flying occurred during standby.`,

  post_standby_duty:
    `§3.17 — Rest After Standby (Called and Flew)\n\n` +
    `"Following a standby duty during which the pilot was called to operate, the minimum rest after completion of the duty shall be calculated from actual duty time plus two (2) hours, and not less than twelve (12) hours."\n\n` +
    `Formula: actual duty + 2h → minimum 12h.`,
};

const WB_SCENARIOS: { value: WBRestScenario; label: string; subtitle?: string; needsFDP?: boolean; needsTimeDiff?: boolean }[] = [
  { value: 'pre_ic',                    label: 'Before an Intercontinental Duty',                   subtitle: 'Pre-Intercontinental standard rest' },
  { value: 'pre_ic_after_stby',         label: 'Before Intercontinental — Called from Standby',    subtitle: 'Pre-Intercontinental after STBH' },
  { value: 'pre_ns',                    label: 'Before a North/South Duty',                         subtitle: 'Pre-North/South', needsFDP: true },
  { value: 'post_ic_base',              label: 'After Arriving Home (Post-Intercontinental base)',  subtitle: 'Post-Intercontinental at Dublin base', needsFDP: true, needsTimeDiff: true },
  { value: 'post_ic_eb_outstation',     label: 'Rest at Outstation (before EB return)',             subtitle: 'Planning min §2.22.5', needsFDP: true, needsTimeDiff: true },
  { value: 'outstation_ic_turnaround',  label: 'Outstation — Intercontinental to Intercontinental Turnaround', subtitle: 'Two Intercontinental duties at same outstation' },
  { value: 'post_continental_base',     label: 'After Continental Duty (Base)',           subtitle: 'Post-continental at home', needsFDP: true },
  { value: 'post_continental_outstation', label: 'After Continental Duty (Outstation)',  subtitle: 'Post-continental away', needsFDP: true },
  { value: 'post_ttn',                  label: 'After a Through-The-Night Duty',          subtitle: 'Post-TTN continental', needsFDP: true },
  { value: 'post_ns_base',              label: 'After North/South — At Base',             subtitle: 'Post-N/S home', needsFDP: true },
  { value: 'post_ns_outstation',        label: 'After North/South — At Outstation',       subtitle: 'Post-N/S away', needsFDP: true },
  { value: 'post_south_africa',         label: 'After South Africa Outstation',           subtitle: 'Post-ZA outstation' },
  { value: 'after_standby',             label: 'After Standby Duty',                      subtitle: 'No flight assigned' },
];

const A320_SCENARIOS: { value: A320RestScenario; label: string; subtitle?: string; needsFDP?: boolean; needsTimeDiff?: boolean }[] = [
  { value: 'post_continental_base',       label: 'After Continental Duty (Base)',                        subtitle: 'Post-continental at home', needsFDP: true },
  { value: 'post_continental_outstation', label: 'After Continental Duty (Outstation)',                  subtitle: 'Post-continental away', needsFDP: true },
  { value: 'post_ttn',                    label: 'After a Through-The-Night Duty',                       subtitle: 'Post-TTN', needsFDP: true },
  { value: 'pre_ic',                      label: 'Before an Intercontinental Duty',                      subtitle: 'Pre-Intercontinental' },
  { value: 'post_wb_ta',                  label: 'After Transatlantic (Westbound, at Base)',              subtitle: 'Post-WB TA', needsFDP: true, needsTimeDiff: true },
  { value: 'post_eb_ta_outstation',       label: 'After Transatlantic (Eastbound, at Outstation)',        subtitle: 'Post-EB TA outstation', needsFDP: true, needsTimeDiff: true },
  { value: 'wb_to_eb_turnaround',         label: 'Westbound to Eastbound Turnaround',                    subtitle: 'WB→EB same outstation' },
  { value: 'unscheduled_overnight',       label: 'Unscheduled Overnight (Diversion / Delay)',             subtitle: 'Unplanned outstation rest', needsFDP: true },
  { value: 'post_standby_no_duty',        label: 'After Standby — Not Called',                           subtitle: 'Post-standby, no duty' },
  { value: 'post_standby_duty',           label: 'After Standby — Called and Flew',                      subtitle: 'Post-standby with duty', needsFDP: true },
];

export default function RestScreen() {
  const isDark = useColorScheme() === 'dark';
  const fleet = useFleet();

  const [wbScenario, setWbScenario] = useState<WBRestScenario>('post_continental_base');
  const [a320Scenario, setA320Scenario] = useState<A320RestScenario>('post_continental_base');
  const [actualFDPHours, setActualFDPHours] = useState(10);
  const [stdTimeDiff, setStdTimeDiff] = useState(5);
  const [showEasaModal, setShowEasaModal] = useState(false);
  const [showWCModal, setShowWCModal] = useState(false);

  const bg = isDark ? '#0A1628' : '#F7F8FA';
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';

  const wbMeta = WB_SCENARIOS.find(s => s.value === wbScenario)!;
  const a320Meta = A320_SCENARIOS.find(s => s.value === a320Scenario)!;
  const meta = fleet === 'wb' ? wbMeta : a320Meta;

  const wbIsBase = !wbScenario.includes('outstation') && !wbScenario.includes('turnaround');
  const a320IsBase = !a320Scenario.includes('outstation') && !a320Scenario.includes('turnaround') && a320Scenario !== 'unscheduled_overnight';

  const result = fleet === 'wb'
    ? calcWBRest({ scenario: wbScenario, actualFDPHours, stdTimeDiffHours: stdTimeDiff, isBase: wbIsBase })
    : calcA320Rest({ scenario: a320Scenario, actualFDPHours, stdTimeDiffHours: stdTimeDiff, isBase: a320IsBase });

  const wcBody = fleet === 'wb'
    ? WB_WC_BODY[wbScenario]
    : A320_WC_BODY[a320Scenario];

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Calendar size={20} color="#5B4FA8" />
            <Text style={{ fontSize: 17, fontWeight: '700', color: text }}>Rest Checker</Text>
          </View>
          <FleetBadge fleet={fleet} size="sm" />
        </View>

        <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16, gap: 16 }}>
          {fleet === 'wb' ? (
            <DropdownPicker
              label="Scenario"
              value={wbScenario}
              options={WB_SCENARIOS}
              onChange={setWbScenario}
              accentColor="#5B4FA8"
            />
          ) : (
            <DropdownPicker
              label="Scenario"
              value={a320Scenario}
              options={A320_SCENARIOS}
              onChange={setA320Scenario}
              accentColor="#5B4FA8"
            />
          )}

          {meta.needsFDP && (
            <Stepper label="Actual FDP (hours)" value={actualFDPHours} min={1} max={18} onChange={setActualFDPHours} isDark={isDark} />
          )}
          {meta.needsTimeDiff && (
            <Stepper label="Std time difference (h)" value={stdTimeDiff} min={1} max={12} onChange={setStdTimeDiff} isDark={isDark} />
          )}
        </View>

        <SectionHeader title="Result" subtitle="Tap EASA or Working Conditions for details" />
        <RuleCard
          easaValue={formatHM(result.easaValue)}
          easaRef={result.easaRef}
          wcValue={formatHM(result.wcValue)}
          wcRef={result.wcRef}
          bindingSource={result.bindingSource}
          onPressEasa={() => setShowEasaModal(true)}
          onPressWC={() => setShowWCModal(true)}
        />

        <View style={{ backgroundColor: card, borderRadius: 12, borderWidth: 1, borderColor: border, padding: 14, marginTop: 12 }}>
          <Text style={{ fontSize: 12, color: '#5B4FA8', fontWeight: '600', marginBottom: 4 }}>Formula</Text>
          <Text style={{ fontSize: 13, color: text, lineHeight: 20 }}>{result.formula}</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#D4840A', marginTop: 8 }}>
            Minimum rest: {formatHM(result.binding)}
          </Text>
        </View>
      </ScrollView>

      <RuleModal
        visible={showEasaModal}
        onClose={() => setShowEasaModal(false)}
        title="EASA FTL"
        color="#2E6DB4"
        subtitle={result.easaRef}
        body={EASA_REST_BODY}
        isDark={isDark}
      />
      <RuleModal
        visible={showWCModal}
        onClose={() => setShowWCModal(false)}
        title="Working Conditions"
        color="#5B4FA8"
        subtitle={result.wcRef}
        body={wcBody}
        isDark={isDark}
      />
    </View>
  );
}
