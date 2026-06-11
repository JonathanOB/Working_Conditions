import { AlertTriangle, Radio } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ScrollView, Switch, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { FleetBadge } from '../../components/FleetBadge';
import { SectionHeader } from '../../components/SectionHeader';
import { TimePicker } from '../../components/TimePicker';
import { useFleet } from '../../hooks/useFleet';
import { calcA320Standby, getA320PlanningFDP } from '../../lib/calculators-a320';
import { formatHM, type RestFacility } from '../../lib/calculators-easa';
import { calcWBFDP, type WBDutyType } from '../../lib/calculators-wb';

function fmtClockTime(rawHours: number): string {
  const wrapped = ((rawHours % 24) + 24) % 24;
  const hh = Math.floor(wrapped).toString().padStart(2, '0');
  const mm = Math.round((wrapped % 1) * 60).toString().padStart(2, '0');
  return `${hh}:${mm}${rawHours >= 24 ? ' (+1)' : ''}`;
}

function effectiveHour(pickerHour: number, referenceHour: number): number {
  return pickerHour < referenceHour ? pickerHour + 24 : pickerHour;
}

function ChipPicker<T extends string>({
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
              paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
              backgroundColor: value === opt.value ? '#2E6DB4' : card,
              borderWidth: 1, borderColor: value === opt.value ? '#2E6DB4' : border,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: value === opt.value ? '#FFFFFF' : text }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function Stepper({ label, value, min, max, onChange, isDark }: {
  label: string; value: number; min: number; max: number;
  onChange: (v: number) => void; isDark: boolean;
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
        <Text style={{ fontSize: 18, fontWeight: '700', color: text, width: 30, textAlign: 'center' }}>{value}</Text>
        <TouchableOpacity onPress={() => onChange(Math.min(max, value + 1))} style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: card, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20, color: text, lineHeight: 22 }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ResultBlock({ label, value, ref_, isDark, highlight }: {
  label: string; value: string; ref_: string; isDark: boolean; highlight?: boolean;
}) {
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';
  return (
    <View style={{
      backgroundColor: highlight ? (isDark ? '#0F2A1A' : '#ECFDF5') : card,
      borderRadius: 12, borderWidth: 1,
      borderColor: highlight ? '#059669' : border,
      padding: 14, gap: 4,
    }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: highlight ? '#059669' : sub }}>{label}</Text>
      <Text style={{ fontSize: 24, fontWeight: '800', color: highlight ? '#059669' : text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: highlight ? '#059669' : '#2E6DB4' }}>{ref_}</Text>
    </View>
  );
}

type WBStandbyType = 'stbh' | 'stbb';
type A320StandbyType = 'stbh' | 'stba' | 'k-pre' | 'k-post' | 'k-standalone';

const WB_DUTY_OPTIONS: { value: WBDutyType; label: string }[] = [
  { value: 'standard',  label: 'Standard Intercontinental' },
  { value: 'eastbound', label: 'Eastbound TA'   },
  { value: 'ttn',       label: 'TTN / N-S'      },
  { value: 'augmented', label: 'Augmented (3c)' },
  { value: 'heavy',     label: 'Heavy (4c)'     },
];

const REST_FACILITY_OPTIONS: { value: RestFacility; label: string }[] = [
  { value: 'class1', label: 'Class 1 (bunk)' },
  { value: 'class2', label: 'Class 2'        },
  { value: 'class3', label: 'Class 3 (seat)' },
];

function MaxFDPCard({
  easaValue, easaRef, wcValue, wcRef,
  bindingSource, binding, warnings, dutyLabel, isDark,
}: {
  easaValue: number; easaRef: string; wcValue: number; wcRef: string;
  bindingSource: 'easa' | 'wc'; binding: number; warnings: string[];
  dutyLabel: string; isDark: boolean;
}) {
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const sub = isDark ? '#64748B' : '#94A3B8';
  return (
    <View style={{ backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border, padding: 14, marginTop: 12, gap: 10 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#2E6DB4', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Max FDP — {dutyLabel}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, backgroundColor: '#2E6DB408', borderRadius: 10, padding: 10, borderWidth: 0.5, borderColor: '#2E6DB430' }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#2E6DB4', textTransform: 'uppercase', marginBottom: 2 }}>EASA</Text>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#2E6DB4' }}>{formatHM(easaValue)}</Text>
          <Text style={{ fontSize: 10, color: '#2E6DB480', marginTop: 2, lineHeight: 14 }}>{easaRef}</Text>
        </View>
        <View style={{
          flex: 1, borderRadius: 10, padding: 10, borderWidth: 0.5,
          backgroundColor: bindingSource === 'wc' ? '#5B4FA818' : '#5B4FA808',
          borderColor: bindingSource === 'wc' ? '#5B4FA840' : '#5B4FA820',
        }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#5B4FA8', textTransform: 'uppercase', marginBottom: 2 }}>Working Conditions</Text>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#5B4FA8' }}>{formatHM(wcValue)}</Text>
          <Text style={{ fontSize: 10, color: '#5B4FA880', marginTop: 2, lineHeight: 14 }}>{wcRef}</Text>
        </View>
      </View>
      <View style={{ backgroundColor: isDark ? '#0A1E38' : '#EFF6FF', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ flex: 1, fontSize: 11, color: sub }}>
          Binding max FDP — {bindingSource === 'wc' ? 'WC more restrictive' : 'EASA more restrictive'}
        </Text>
        <Text style={{ fontSize: 22, fontWeight: '900', color: '#2E6DB4' }}>{formatHM(binding)}</Text>
      </View>
      {warnings.map((w, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8, backgroundColor: '#D4840A10', borderRadius: 8, padding: 10, borderWidth: 0.5, borderColor: '#D4840A40' }}>
          <AlertTriangle size={13} color="#D4840A" style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontSize: 12, color: isDark ? '#D4840A' : '#92400E', lineHeight: 18 }}>{w}</Text>
        </View>
      ))}
    </View>
  );
}

export default function StandbyScreen() {
  const isDark = useColorScheme() === 'dark';
  const fleet = useFleet();

  // Shared
  const [wbType, setWbType] = useState<WBStandbyType>('stbh');
  const [a320Type, setA320Type] = useState<A320StandbyType>('stbh');
  const [standbyStart, setStandbyStart] = useState(8);
  const [called, setCalled] = useState(false);
  const [callHour, setCallHour] = useState(10);
  const [reportHour, setReportHour] = useState(12);

  // WB FDP inputs
  const [wbDutyType, setWbDutyType] = useState<WBDutyType>('augmented');
  const [wbSectors, setWbSectors] = useState(1);
  const [restFacility, setRestFacility] = useState<RestFacility>('class1');

  // A320 FDP inputs
  const [a320IsIC, setA320IsIC] = useState(false);
  const [a320IsEastbound, setA320IsEastbound] = useState(false);
  const [a320Sectors, setA320Sectors] = useState(2);

  useEffect(() => {
    setReportHour((callHour + 2) % 24);
  }, [callHour]);

  const bg = isDark ? '#0A1628' : '#F7F8FA';
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';

  const effCallHour = effectiveHour(callHour, standbyStart);
  const effReportHour = effectiveHour(reportHour, effCallHour);

  // ── WB ───────────────────────────────────────────────────────────────
  const isWBAugmented = wbDutyType === 'augmented' || wbDutyType === 'heavy';
  const wbFdpResult = called ? calcWBFDP({
    reportHour: effReportHour % 24,
    sectors: wbSectors,
    dutyType: wbDutyType,
    acclimatised: 'acclimatised',
    restFacility,
  }) : null;
  const wbFdpCredit = called ? Math.max(0, (effCallHour - standbyStart) * 0.5) : 0;
  const wbMaxFDP = wbFdpResult ? wbFdpResult.binding : 0;
  const wbRemaining = Math.max(0, wbMaxFDP - wbFdpCredit);
  const wbLatestFinish = effReportHour + wbRemaining;

  // ── A320 ─────────────────────────────────────────────────────────────
  const a320StandbyResult = calcA320Standby({
    type: a320Type,
    standbyStartHour: standbyStart,
    dutyAssigned: called,
    callHour: called ? effCallHour : undefined,
    isIntercontinental: a320IsIC,
  });

  // Planning max FDP from report time (EASA + WC)
  const a320FdpResult = called ? getA320PlanningFDP(
    effReportHour % 24,
    0,
    a320Sectors,
    a320IsIC ? 'intercontinental' : 'standard',
    a320IsEastbound ? 'eastbound' : 'westbound',
    'acclimatised',
  ) : null;

  const a320MaxFDP = a320FdpResult ? a320FdpResult.binding : 0;
  const a320FdpCredit = a320StandbyResult.fdpCreditHours;
  const a320Remaining = Math.max(0, a320MaxFDP - a320FdpCredit);
  // Latest finish: the tighter of (a) hard ceiling from standby start, (b) report + remaining FDP
  const a320CeilingFromStart = standbyStart + a320StandbyResult.elapsedMaxHours;
  const a320CeilingFromReport = called ? (effReportHour + a320Remaining) : a320CeilingFromStart;
  const a320LatestFinish = called ? Math.min(a320CeilingFromStart, a320CeilingFromReport) : a320CeilingFromStart;

  const WB_RULES_STBH = [
    '50% of expired standby counts as FDP credit (§3.16.4)',
    'Rest after standby: minimum 13h (§3.16.10)',
    'Report within 2h of call (§2.21.11)',
    'Pre-22:00 standby cannot cover 00:00–07:59 Intercontinental departures (§3.16.9)',
  ];
  const WB_RULES_STBB = [
    'Max STBB duration: 10h per duty (§2.21.13)',
    'Max 6 STBB blocks per year (§2.21.9)',
    'STBB duration: 5–6 days (§2.21.5)',
    'Report within 2h of call (§2.21.11)',
    'Rest after STBB: minimum 13h (§3.16.10)',
  ];

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Radio size={20} color="#7C2D12" />
            <Text style={{ fontSize: 17, fontWeight: '700', color: text }}>Standby Decoder</Text>
          </View>
          <FleetBadge fleet={fleet} size="sm" />
        </View>

        {/* ── Inputs ─────────────────────────────────────────────────── */}
        <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16, gap: 14 }}>
          {fleet === 'wb' ? (
            <ChipPicker label="Standby type" value={wbType} onChange={setWbType} isDark={isDark} options={[
              { value: 'stbh', label: 'STBH — Home Standby' },
              { value: 'stbb', label: 'STBB — Block Standby' },
            ]} />
          ) : (
            <ChipPicker label="Standby type" value={a320Type} onChange={setA320Type} isDark={isDark} options={[
              { value: 'stbh',         label: 'STBH'              },
              { value: 'stba',         label: 'STBA (Airport)'    },
              { value: 'k-pre',        label: 'K-duty (pre)'      },
              { value: 'k-post',       label: 'K-duty (post)'     },
              { value: 'k-standalone', label: 'K standalone'      },
            ]} />
          )}

          <TimePicker label="Standby start time" hour={standbyStart} onHourChange={setStandbyStart} />

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: text }}>Have you been called?</Text>
            <Switch value={called} onValueChange={setCalled} trackColor={{ true: '#2E6DB4' }} />
          </View>

          {called && (
            <>
              <View style={{ height: 0.5, backgroundColor: border }} />
              <TimePicker label="Called at" hour={callHour} onHourChange={setCallHour} />
              <TimePicker label="Report time" hour={reportHour} onHourChange={setReportHour} />

              {/* WB-specific FDP inputs */}
              {fleet === 'wb' && (
                <>
                  <View style={{ height: 0.5, backgroundColor: border }} />
                  <ChipPicker label="Duty type" value={wbDutyType} onChange={setWbDutyType} isDark={isDark} options={WB_DUTY_OPTIONS} />
                  {!isWBAugmented && (
                    <Stepper label="Sectors" value={wbSectors} min={1} max={6} onChange={setWbSectors} isDark={isDark} />
                  )}
                  {isWBAugmented && (
                    <ChipPicker label="Cockpit rest facility" value={restFacility} onChange={setRestFacility} isDark={isDark} options={REST_FACILITY_OPTIONS} />
                  )}
                </>
              )}

              {/* A320-specific FDP inputs */}
              {fleet === 'a320' && (
                <>
                  <View style={{ height: 0.5, backgroundColor: border }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: sub }}>Intercontinental duty</Text>
                    <Switch value={a320IsIC} onValueChange={setA320IsIC} trackColor={{ true: '#2E6DB4' }} />
                  </View>
                  {a320IsIC && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: sub }}>Eastbound direction</Text>
                      <Switch value={a320IsEastbound} onValueChange={setA320IsEastbound} trackColor={{ true: '#2E6DB4' }} />
                    </View>
                  )}
                  {!a320IsIC && (
                    <Stepper label="Sectors" value={a320Sectors} min={1} max={6} onChange={setA320Sectors} isDark={isDark} />
                  )}
                </>
              )}
            </>
          )}
        </View>

        {/* ── Max FDP info card (WB) ──────────────────────────────────── */}
        {fleet === 'wb' && called && wbFdpResult && (
          <MaxFDPCard
            easaValue={wbFdpResult.easaValue}
            easaRef={wbFdpResult.easaRef}
            wcValue={wbFdpResult.wcValue}
            wcRef={wbFdpResult.wcRef}
            bindingSource={wbFdpResult.bindingSource}
            binding={wbFdpResult.binding}
            warnings={wbFdpResult.warnings}
            dutyLabel={WB_DUTY_OPTIONS.find(o => o.value === wbDutyType)?.label ?? ''}
            isDark={isDark}
          />
        )}

        {/* ── Max FDP info card (A320) ────────────────────────────────── */}
        {fleet === 'a320' && called && a320FdpResult && (
          <MaxFDPCard
            easaValue={a320FdpResult.easaValue}
            easaRef={a320FdpResult.easaRef}
            wcValue={a320FdpResult.wcValue}
            wcRef={a320FdpResult.wcRef}
            bindingSource={a320FdpResult.bindingSource}
            binding={a320FdpResult.binding}
            warnings={[...a320FdpResult.warnings, ...a320StandbyResult.warnings]}
            dutyLabel={a320IsIC ? (a320IsEastbound ? 'Eastbound Intercontinental' : 'Westbound Intercontinental') : `Continental (${a320Sectors} sector${a320Sectors > 1 ? 's' : ''})`}
            isDark={isDark}
          />
        )}

        {/* ── Results ─────────────────────────────────────────────────── */}
        <SectionHeader title="Result" />

        {fleet === 'wb' ? (
          <View style={{ gap: 10 }}>
            {wbType === 'stbh' && (
              <ResultBlock
                label="FDP credit consumed by standby"
                value={called ? formatHM(wbFdpCredit) : '—'}
                ref_={called ? `50% × ${formatHM(effCallHour - standbyStart)} elapsed — §3.16.4` : 'Call time not yet known'}
                isDark={isDark}
              />
            )}
            {called && wbType === 'stbh' && (
              <>
                <ResultBlock
                  label="Remaining FDP from report time"
                  value={formatHM(wbRemaining)}
                  ref_={`${formatHM(wbMaxFDP)} max − ${formatHM(wbFdpCredit)} credit = ${formatHM(wbRemaining)}`}
                  isDark={isDark}
                />
                <ResultBlock
                  label="Latest finish time"
                  value={fmtClockTime(wbLatestFinish)}
                  ref_={`Report ${fmtClockTime(effReportHour)} + ${formatHM(wbRemaining)} remaining FDP`}
                  isDark={isDark}
                  highlight
                />
              </>
            )}
            <ResultBlock
              label="Rest required after duty"
              value="13:00"
              ref_="§3.16.10 — minimum 13h after standby"
              isDark={isDark}
            />
            <View style={{ backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border, padding: 14, gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: text, marginBottom: 4 }}>
                {wbType === 'stbh' ? 'STBH Rules' : 'STBB Rules'}
              </Text>
              {(wbType === 'stbh' ? WB_RULES_STBH : WB_RULES_STBB).map((rule, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ color: '#2E6DB4', fontSize: 14 }}>·</Text>
                  <Text style={{ flex: 1, fontSize: 13, color: sub, lineHeight: 19 }}>{rule}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {called && (
              <ResultBlock
                label="FDP credit consumed by standby"
                value={formatHM(a320FdpCredit)}
                ref_={a320StandbyResult.elapsedMaxRef}
                isDark={isDark}
              />
            )}
            {called && (
              <ResultBlock
                label="Remaining FDP from report time"
                value={formatHM(a320Remaining)}
                ref_={`${formatHM(a320MaxFDP)} max − ${formatHM(a320FdpCredit)} credit = ${formatHM(a320Remaining)}`}
                isDark={isDark}
              />
            )}
            <ResultBlock
              label="Latest finish time"
              value={fmtClockTime(a320LatestFinish)}
              ref_={called
                ? `min(standby start + ${a320StandbyResult.elapsedMaxHours}h ceiling, report + remaining FDP)`
                : a320StandbyResult.elapsedMaxRef}
              isDark={isDark}
              highlight
            />
            <ResultBlock
              label="Rest required after duty"
              value={formatHM(a320StandbyResult.restRequiredHours)}
              ref_={a320StandbyResult.restRef}
              isDark={isDark}
            />
            {[...a320StandbyResult.warnings].map((w, i) => (
              <View key={i} style={{
                flexDirection: 'row', gap: 8,
                backgroundColor: '#7C2D1218', borderRadius: 8, padding: 12,
                borderWidth: 0.5, borderColor: '#B91C1C50',
              }}>
                <AlertTriangle size={14} color="#FCA5A5" style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, fontSize: 13, color: '#FCA5A5', lineHeight: 19 }}>{w}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
