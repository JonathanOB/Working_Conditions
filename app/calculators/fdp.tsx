import { Clock, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity, useColorScheme,
  View,
} from 'react-native';
import { FleetBadge } from '../../components/FleetBadge';
import { RuleCard } from '../../components/RuleCard';
import { SectionHeader } from '../../components/SectionHeader';
import { TimePicker } from '../../components/TimePicker';
import { useFleet } from '../../hooks/useFleet';
import { getA320PlanningFDP, type A320Direction, type A320DutyType } from '../../lib/calculators-a320';
import { formatHM, type AcclimatisedState, type RestFacility } from '../../lib/calculators-easa';
import { calcWBFDP, type WBDutyType } from '../../lib/calculators-wb';

function ToggleRow<T extends string>({
  label, value, options, onChange, isDark,
}: {
  label: string; value: T; options: { value: T; label: string }[];
  onChange: (v: T) => void; isDark: boolean;
}) {
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: sub }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center',
              backgroundColor: value === opt.value ? '#2E6DB4' : card,
              borderWidth: 1, borderColor: value === opt.value ? '#2E6DB4' : border,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: value === opt.value ? '#FFFFFF' : text }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function DutyTypePicker<T extends string>({
  label, value, options, onChange, isDark,
}: {
  label: string; value: T; options: { value: T; label: string }[];
  onChange: (v: T) => void; isDark: boolean;
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
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
              backgroundColor: value === opt.value ? '#2E6DB4' : card,
              borderWidth: 1, borderColor: value === opt.value ? '#2E6DB4' : border,
              minWidth: '47%', flex: 1,
            }}
          >
            <Text style={{
              fontSize: 13, fontWeight: '600', textAlign: 'center',
              color: value === opt.value ? '#FFFFFF' : text,
            }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function Stepper({ label, value, min, max, onChange, isDark }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void; isDark: boolean;
}) {
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: sub }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => onChange(Math.max(min, value - 1))} style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: card, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20, color: text, lineHeight: 22 }}>−</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: text, width: 24, textAlign: 'center' }}>{value}</Text>
        <TouchableOpacity onPress={() => onChange(Math.min(max, value + 1))} style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: card, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20, color: text, lineHeight: 22 }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RuleModal({ visible, onClose, title, color, subtitle, body }: {
  visible: boolean; onClose: () => void;
  title: string; color: string; subtitle: string; body: string;
}) {
  const isDark = useColorScheme() === 'dark';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';
  const bg = isDark ? '#0F1E35' : '#FFFFFF';
  const pageBg = isDark ? '#0A1628' : '#F7F8FA';
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={{ flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: pageBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            padding: 20, borderBottomWidth: 0.5, borderBottomColor: isDark ? '#1E3A5F' : '#E2E4EA',
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

const WB_DUTY_OPTIONS: { value: WBDutyType; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'eastbound', label: 'Eastbound Transatlantic' },
  { value: 'ttn', label: 'Through The Night' },
  { value: 'augmented', label: 'Augmented (+1 Crew)' },
  { value: 'heavy', label: 'Heavy Crew (+2)' },
];

const A320_DUTY_OPTIONS: { value: A320DutyType; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'early', label: 'Early (01:00–06:19)' },
  { value: 'ttn', label: 'Through The Night' },
  { value: 'intercontinental', label: 'Intercontinental' },
  { value: 'extended', label: 'Extended (+1h)' },
];

export default function FDPScreen() {
  const isDark = useColorScheme() === 'dark';
  const fleet = useFleet();

  const [reportHour, setReportHour] = useState(8);
  const [sectors, setSectors] = useState(1);
  const [acclimatised, setAcclimatised] = useState<AcclimatisedState>('acclimatised');

  const [wbDutyType, setWbDutyType] = useState<WBDutyType>('standard');
  const [restFacility, setRestFacility] = useState<RestFacility>('class3');
  const [extraCrew, setExtraCrew] = useState<1 | 2>(1);

  const [a320DutyType, setA320DutyType] = useState<A320DutyType>('standard');
  const [direction, setDirection] = useState<A320Direction>('westbound');

  const [showEasaModal, setShowEasaModal] = useState(false);
  const [showWCModal, setShowWCModal] = useState(false);

  const bg = isDark ? '#0A1628' : '#F7F8FA';
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const sub = isDark ? '#64748B' : '#94A3B8';
  const text = isDark ? '#F1F5F9' : '#0A1628';

  const isAugmented = wbDutyType === 'augmented' || wbDutyType === 'heavy';
  const isICa320 = a320DutyType === 'intercontinental';

  const result = fleet === 'wb'
    ? calcWBFDP({ reportHour, sectors, dutyType: wbDutyType, acclimatised, restFacility, extraCrew })
    : getA320PlanningFDP(reportHour, 0, sectors, a320DutyType, direction, acclimatised);

  const easaModalBody = `ORO.FTL.205(b) sets the basic maximum FDP for acclimatised two-pilot operations using Table 1. The table is divided into three report-time windows:\n\n• 06:00–13:59: 13h00m (1-2 sectors) down to 11h00m (6+)\n• 14:00–21:59: 12h00m (1-2 sectors) down to 10h00m (6+)\n• 22:00–05:59: 11h00m (1-2 sectors) down to 09h00m (6+)\n\nFor unknown acclimatisation (within 3 time zones), deduct 1 hour from Table 1 values (ORO.FTL.205(b) Note 1).\n\nAugmented operations (extra crew with in-flight rest) may extend this limit under ORO.FTL.205(e).`;

  const wcModalBody = fleet === 'wb'
    ? `§2.15 of the Widebody Working Conditions (WC 2025) sets intercontinental FDP limits that are often more restrictive than EASA Table 1.\n\nKey WB limits:\n• Standard: 14h30m (WB/EB off-peak), 13h30m (peak)\n• Eastbound TA: reduced 30m\n• Through The Night: 12h\n• Augmented: up to 16h depending on rest facility (§2.9)\n• Heavy crew (+2): up to 17h\n\nThe binding limit is always the MORE RESTRICTIVE of EASA and WC.`
    : `§2.10 of the A320/Neo Working Conditions sets FDP limits by report time window.\n\n• Standard continental: 12h–13h depending on report time\n• Early duty (01:00–06:19 report): 11h30m\n• Through The Night: 10h30m\n• Intercontinental: 14h00m WB, 13h00m EB\n• Extended: +1h with commander agreement\n\nThe binding limit is always the MORE RESTRICTIVE of EASA and WC.`;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Clock size={20} color="#2E6DB4" />
            <Text style={{ fontSize: 17, fontWeight: '700', color: text }}>FDP Calculator</Text>
          </View>
          <FleetBadge fleet={fleet} size="sm" />
        </View>

        <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16, gap: 16 }}>
          <TimePicker label="Report Time (local)" hour={reportHour} onHourChange={setReportHour} highlightWOCL />

          <Stepper label="Number of sectors" value={sectors} min={1} max={9} onChange={setSectors} isDark={isDark} />

          <ToggleRow
            label="Acclimatisation"
            value={acclimatised}
            onChange={setAcclimatised}
            isDark={isDark}
            options={[
              { value: 'acclimatised', label: 'Acclimatised' },
              { value: 'unknown', label: 'Unknown' },
            ]}
          />

          {fleet === 'wb' ? (
            <>
              <DutyTypePicker
                label="Duty type"
                value={wbDutyType}
                onChange={setWbDutyType}
                isDark={isDark}
                options={WB_DUTY_OPTIONS}
              />
              {isAugmented && (
                <>
                  <DutyTypePicker
                    label="Rest facility"
                    value={restFacility}
                    onChange={(v) => setRestFacility(v as RestFacility)}
                    isDark={isDark}
                    options={[
                      { value: 'class1', label: 'Class 1 (Bunk)' },
                      { value: 'class2', label: 'Class 2' },
                      { value: 'class3', label: 'Class 3 (Seat)' },
                    ]}
                  />
                  {wbDutyType === 'augmented' && (
                    <ToggleRow
                      label="Extra crew"
                      value={String(extraCrew)}
                      onChange={(v) => setExtraCrew(Number(v) as 1 | 2)}
                      isDark={isDark}
                      options={[
                        { value: '1', label: '+1 pilot' },
                        { value: '2', label: '+2 pilots' },
                      ]}
                    />
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <DutyTypePicker
                label="Duty type"
                value={a320DutyType}
                onChange={setA320DutyType}
                isDark={isDark}
                options={A320_DUTY_OPTIONS}
              />
              {isICa320 && (
                <ToggleRow
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
            </>
          )}
        </View>

        <SectionHeader title="Result" subtitle="Tap EASA or Working Conditions for details" />
        <RuleCard
          easaValue={formatHM(result.easaValue)}
          easaRef={result.easaRef}
          wcValue={formatHM(result.wcValue)}
          wcRef={result.wcRef}
          bindingSource={result.bindingSource}
          warnings={result.warnings}
          onPressEasa={() => setShowEasaModal(true)}
          onPressWC={() => setShowWCModal(true)}
        />

        <View style={{ backgroundColor: card, borderRadius: 12, borderWidth: 1, borderColor: border, padding: 14, marginTop: 12 }}>
          <Text style={{ fontSize: 12, color: sub, lineHeight: 18 }}>
            Report {reportHour.toString().padStart(2, '0')}:00 · {sectors} sector{sectors !== 1 ? 's' : ''} · {acclimatised === 'acclimatised' ? 'Acclimatised' : 'Unknown acclimatisation (−1h EASA)'}
            {fleet === 'wb' ? `\n${WB_DUTY_OPTIONS.find(o => o.value === wbDutyType)?.label}` : `\n${A320_DUTY_OPTIONS.find(o => o.value === a320DutyType)?.label}`}
            {'\n'}Binding: {formatHM(result.binding)} ({result.bindingSource === 'easa' ? 'EASA floor applies' : 'Working Conditions more restrictive'})
          </Text>
        </View>

        {fleet === 'wb' && (
          <View style={{ backgroundColor: card, borderRadius: 12, borderWidth: 1, borderColor: border, padding: 14, marginTop: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#5B4FA8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              §2.7 — Day Before an Intercontinental Flight
            </Text>
            <Text style={{ fontSize: 13, color: text, lineHeight: 20 }}>
              The previous duty before any Intercontinental flight must:{'\n'}
              {'  '}• Not exceed <Text style={{ fontWeight: '700' }}>9 hours</Text> duration{'\n'}
              {'  '}• Finish no later than <Text style={{ fontWeight: '700' }}>21:00</Text>{'\n'}
              {'  '}• Not commence before <Text style={{ fontWeight: '700' }}>06:00</Text> (07:00 in certain circumstances)
            </Text>
          </View>
        )}
      </ScrollView>

      <RuleModal
        visible={showEasaModal}
        onClose={() => setShowEasaModal(false)}
        title="EASA FTL"
        color="#2E6DB4"
        subtitle={result.easaRef}
        body={easaModalBody}
      />
      <RuleModal
        visible={showWCModal}
        onClose={() => setShowWCModal(false)}
        title="Working Conditions"
        color="#5B4FA8"
        subtitle={result.wcRef}
        body={wcModalBody}
      />
    </View>
  );
}
