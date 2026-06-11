import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { useFleet } from '../../hooks/useFleet';
import { FleetBadge } from '../../components/FleetBadge';
import { SectionHeader } from '../../components/SectionHeader';
import { TimePicker } from '../../components/TimePicker';
import { formatHM } from '../../lib/calculators-easa';
import { calcWBDelay } from '../../lib/calculators-wb';
import { calcA320Delay, type A320Direction } from '../../lib/calculators-a320';
import { Zap, AlertTriangle, CheckCircle } from 'lucide-react-native';

function Picker<T extends string>({
  label, value, options, onChange, isDark,
}: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; isDark: boolean;
}) {
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: sub }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {options.map(opt => (
          <TouchableOpacity key={opt.value} onPress={() => onChange(opt.value)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: value === opt.value ? '#2E6DB4' : card, borderWidth: 1, borderColor: value === opt.value ? '#2E6DB4' : border, minWidth: '47%', flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', textAlign: 'center', color: value === opt.value ? '#FFFFFF' : text }}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const DELAY_OPTIONS = [
  { value: 15,  label: '15 min' },
  { value: 30,  label: '30 min' },
  { value: 45,  label: '45 min' },
  { value: 60,  label: '1 hour' },
  { value: 90,  label: '1h 30m' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
  { value: 300, label: '5 hours' },
  { value: 360, label: '6 hours' },
  { value: 480, label: '8 hours' },
];

function DurationPicker({ label, value, onChange, isDark }: {
  label: string; value: number; onChange: (v: number) => void; isDark: boolean;
}) {
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: sub }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {DELAY_OPTIONS.map(opt => (
          <TouchableOpacity key={opt.value} onPress={() => onChange(opt.value)} style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: value === opt.value ? '#B91C1C' : card, borderWidth: 1, borderColor: value === opt.value ? '#B91C1C' : border }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: value === opt.value ? '#FFFFFF' : text }}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

type WBDutyType = 'standard' | 'eastbound' | 'ttn' | 'augmented' | 'heavy';

export default function DelayScreen() {
  const isDark = useColorScheme() === 'dark';
  const fleet = useFleet();

  const [rosteredHour, setRosteredHour] = useState(9);
  const [delayMin, setDelayMin] = useState(60);
  const [wbDutyType, setWbDutyType] = useState<WBDutyType>('standard');
  const [a320DutyType, setA320DutyType] = useState<'continental' | 'intercontinental'>('continental');
  const [direction, setDirection] = useState<A320Direction>('westbound');
  const [rosteredFinish, setRosteredFinish] = useState(22);

  const bg = isDark ? '#0A1628' : '#F7F8FA';
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';

  const delayHours = delayMin / 60;

  const wbResult = calcWBDelay(rosteredHour, delayHours, wbDutyType);
  const a320Result = calcA320Delay({
    rosteredReportHour: rosteredHour,
    rosteredReportMin: 0,
    rosteredFinishHour: rosteredFinish,
    delayHours,
    dutyType: a320DutyType,
    direction,
  });

  const wbEffectiveStart = (() => {
    const eh = Math.floor(delayHours < 4 ? rosteredHour + delayHours : rosteredHour + 4) % 24;
    return `${eh.toString().padStart(2, '0')}:00`;
  })();

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Zap size={20} color="#B91C1C" />
            <Text style={{ fontSize: 17, fontWeight: '700', color: text }}>Delay Tool</Text>
          </View>
          <FleetBadge fleet={fleet} size="sm" />
        </View>

        <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16, gap: 16 }}>
          <TimePicker label="Rostered report time" hour={rosteredHour} onHourChange={setRosteredHour} />
          <DurationPicker label="Delay duration" value={delayMin} onChange={setDelayMin} isDark={isDark} />

          {fleet === 'wb' ? (
            <Picker
              label="Duty type"
              value={wbDutyType}
              onChange={setWbDutyType}
              isDark={isDark}
              options={[
                { value: 'standard',   label: 'Standard' },
                { value: 'eastbound',  label: 'Eastbound Transatlantic' },
                { value: 'ttn',        label: 'Through The Night' },
                { value: 'augmented',  label: 'Augmented (+1 Crew)' },
                { value: 'heavy',      label: 'Heavy Crew (+2)' },
              ]}
            />
          ) : (
            <>
              <Picker
                label="Duty type"
                value={a320DutyType}
                onChange={setA320DutyType}
                isDark={isDark}
                options={[
                  { value: 'continental',      label: 'Continental' },
                  { value: 'intercontinental', label: 'Intercontinental' },
                ]}
              />
              {a320DutyType === 'intercontinental' && (
                <Picker
                  label="Direction"
                  value={direction}
                  onChange={setDirection}
                  isDark={isDark}
                  options={[
                    { value: 'westbound', label: 'Westbound' },
                    { value: 'eastbound', label: 'Eastbound TA' },
                  ]}
                />
              )}
              <TimePicker label="Rostered finish time" hour={rosteredFinish} onHourChange={setRosteredFinish} />
            </>
          )}
        </View>

        <SectionHeader title="Result" />

        {/* FDP start */}
        <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, overflow: 'hidden', marginBottom: 10 }}>
          <View style={{ backgroundColor: '#B91C1C', padding: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#FEE2E2', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Delay: {delayMin >= 60 ? `${Math.floor(delayMin / 60)}h${delayMin % 60 > 0 ? ` ${delayMin % 60}m` : ''}` : `${delayMin}m`}
            </Text>
            <Text style={{ fontSize: 13, color: '#FEE2E2', marginTop: 4 }}>
              {fleet === 'wb' ? wbResult.fdpStartRule : a320Result.maxFDPRef}
            </Text>
          </View>
          <View style={{ padding: 16, gap: 0 }}>
            {[
              { label: 'Effective FDP start', value: fleet === 'wb' ? wbResult.effectiveFDPStart : a320Result.effectiveFDPStart },
              { label: 'Max FDP (rostered limit)', value: fleet === 'wb' ? formatHM(wbResult.maxFDPHours) : formatHM(a320Result.maxFDPHours) },
              ...(fleet === 'wb' ? [{ label: `With operational extension (${wbResult.operationalExtension > 0 ? '+' : ''}${wbResult.operationalExtension}h)`, value: formatHM(wbResult.maxFDPHours + wbResult.operationalExtension) }] : []),
            ].map((row, i, arr) => (
              <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: border }}>
                <Text style={{ flex: 1, fontSize: 13, color: sub }}>{row.label}</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: text }}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* WB: operational extension detail */}
        {fleet === 'wb' && (
          <View style={{ backgroundColor: '#2E6DB410', borderRadius: 12, borderWidth: 0.5, borderColor: '#2E6DB440', padding: 14, gap: 4, marginBottom: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#2E6DB4' }}>Operational Extension Available</Text>
            <Text style={{ fontSize: 12, color: sub, lineHeight: 17 }}>{wbResult.operationalExtensionRef}</Text>
            <Text style={{ fontSize: 11, color: sub, lineHeight: 16, marginTop: 2 }}>Absolute maximum with extension: {formatHM(wbResult.operationalExtensionMax)}. Extension is at company discretion during delays — not automatic.</Text>
          </View>
        )}

        {/* WB: §3.7.3 Right to refuse — key pilot right */}
        {fleet === 'wb' && (
          <View style={{ backgroundColor: '#7C2D1215', borderRadius: 14, borderWidth: 1.5, borderColor: '#B91C1C50', padding: 16, gap: 8, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} color="#B91C1C" />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#B91C1C' }}>Pilot Right — §3.7.3</Text>
            </View>
            <Text style={{ fontSize: 13, color: text, lineHeight: 20 }}>
              "At base, when it is known that a delayed flight duty will infringe on the conditions for subsequent days off, a pilot so affected{' '}
              <Text style={{ fontWeight: '700' }}>may choose not to operate such a duty</Text>
              {', notwithstanding any compensation offered in §3.4."}'}
            </Text>
            <Text style={{ fontSize: 11, color: sub, lineHeight: 16 }}>
              This right applies at base only. Crew Control must advise of any delays or unscheduled overnights (§3.7.3).
            </Text>
          </View>
        )}

        {/* Days-off compensation */}
        <View style={{ backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border, padding: 14, gap: 8, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {delayHours < 2 ? (
              <CheckCircle size={15} color="#1B6B3A" />
            ) : (
              <AlertTriangle size={15} color="#D4840A" />
            )}
            <Text style={{ fontSize: 13, fontWeight: '700', color: delayHours < 2 ? '#1B6B3A' : '#D4840A' }}>
              Days-Off Infringement Compensation
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: sub, lineHeight: 19 }}>
            {fleet === 'wb' ? wbResult.daysOffCompensation : a320Result.compensation}
          </Text>
          <Text style={{ fontSize: 11, color: sub, fontStyle: 'italic' }}>
            {fleet === 'wb' ? wbResult.daysOffCompensationRef : '§3.5.1.3'}
          </Text>
        </View>

        {fleet === 'a320' && a320Result.ttnTriggered && (
          <View style={{ backgroundColor: '#7C2D1218', borderRadius: 10, borderWidth: 1, borderColor: '#B91C1C50', padding: 14, marginBottom: 10, flexDirection: 'row', gap: 10 }}>
            <AlertTriangle size={16} color="#FCA5A5" style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#FCA5A5' }}>TTN Triggered</Text>
              <Text style={{ fontSize: 12, color: '#FCA5A5', marginTop: 4, lineHeight: 18 }}>{a320Result.ttnRef}</Text>
              <Text style={{ fontSize: 12, color: '#FCA5A580', marginTop: 4, lineHeight: 18 }}>Post-duty rest: actual duty + 4h, min 14h (§3.14.1(c) / §2.20.9)</Text>
            </View>
          </View>
        )}

        {fleet === 'wb' && (
          <>
            <SectionHeader title="Intercontinental Delay Rules Summary" />
            <View style={{ backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
              {[
                { clause: '§3.7.1', rule: 'Delay <4h (pre-report)', result: 'FDP from actual report time' },
                { clause: '§3.7.2', rule: 'Delay ≥4h (pre-report)', result: 'FDP from rostered +4h' },
                { clause: '§3.7.3', rule: 'Delay will infringe days off', result: 'Pilot may refuse to operate (at base)' },
                { clause: '§3.10.1', rule: '2-pilot extension', result: '+1h, max 16h absolute' },
                { clause: '§3.10.2', rule: 'Augmented extension', result: '+2h (or +1h if WOCL)' },
                { clause: '§3.4.1.1', rule: 'Days off infringed, ≥2h delay', result: 'Day\'s leave OR Blue Sheet' },
                { clause: '§3.4.1.2', rule: 'Finish after 23:00 before days off', result: 'Day\'s leave OR Blue Sheet' },
                { clause: '§3.4.1.3', rule: 'Unscheduled overnight, returns on day off', result: 'Min days off + Blue Sheet' },
              ].map((row, i, arr) => (
                <View key={row.clause} style={{ flexDirection: 'row', padding: 12, borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: border, gap: 10, alignItems: 'flex-start' }}>
                  <Text style={{ width: 60, fontSize: 11, fontWeight: '700', color: '#2E6DB4' }}>{row.clause}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: text }}>{row.rule}</Text>
                    <Text style={{ fontSize: 12, color: sub, marginTop: 2 }}>{row.result}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {fleet === 'a320' && (
          <>
            <SectionHeader title="Compensation Rates (§3.5.1.3)" />
            <View style={{ backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
              {[
                { label: 'Continental: 0–60m late', rate: 'Nil' },
                { label: 'Continental: 61–120m late', rate: '0.19% OWC' },
                { label: 'Continental: >2h late', rate: '1 day off or Blue Sheet' },
                { label: 'Intercontinental: 0–2h late', rate: 'Nil' },
                { label: 'Intercontinental: >2h late + days off infringed', rate: '1 day off or Blue Sheet' },
              ].map((row, i, arr) => (
                <View key={row.label} style={{ flexDirection: 'row', padding: 13, borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: border }}>
                  <Text style={{ flex: 1, fontSize: 13, color: text }}>{row.label}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#D4840A' }}>{row.rate}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
