import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Switch } from 'react-native';
import { useFleet } from '../../hooks/useFleet';
import { FleetBadge } from '../../components/FleetBadge';
import { SectionHeader } from '../../components/SectionHeader';
import { DropdownPicker } from '../../components/DropdownPicker';
import { calcWBDaysOff, getWBDayOffMinHours } from '../../lib/calculators-wb';
import { calcA320DaysOff, getA320DayOffMinHours } from '../../lib/calculators-a320';
import { formatHM } from '../../lib/calculators-easa';
import { Calendar, AlertTriangle, Info } from 'lucide-react-native';

const WB_DESTINATIONS = [
  { value: 'JFK',     label: 'JFK — New York (JFK)',        subtitle: 'Core duty · Coeff 2.6' },
  { value: 'EWR',     label: 'EWR — New York (Newark)',     subtitle: 'Core duty · Coeff 2.6' },
  { value: 'BOS',     label: 'BOS — Boston',                subtitle: 'Core duty · Coeff 2.6' },
  { value: 'ORD',     label: 'ORD — Chicago',               subtitle: 'Core duty · Coeff 2.6' },
  { value: 'MIA',     label: 'MIA — Miami',                 subtitle: 'Core duty · Coeff 2.6' },
  { value: 'MCO',     label: 'MCO — Orlando',               subtitle: 'Florida · Coeff 3.5 · Stick time rules' },
  { value: 'SEA',     label: 'SEA — Seattle',               subtitle: 'West coast · Coeff 4.0 · Augmented' },
  { value: 'SFO',     label: 'SFO — San Francisco',         subtitle: 'West coast · Coeff 4.0 · Augmented' },
  { value: 'LAX',     label: 'LAX — Los Angeles',           subtitle: 'West coast · Coeff 4.0 · Augmented' },
  { value: 'DEN',     label: 'DEN — Denver',                subtitle: 'West coast · Coeff 4.0 · Augmented' },
  { value: 'LAS',     label: 'LAS — Las Vegas',             subtitle: 'West coast · Coeff 4.0 · Augmented' },
  { value: 'CUN',     label: 'CUN — Cancun',                subtitle: 'West coast · Coeff 4.0 · Augmented' },
  { value: 'CHARTER', label: 'Charter / Other Destination', subtitle: 'Not in §2.5.15.2 coefficient table' },
];

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
        <Text style={{ fontSize: 18, fontWeight: '700', color: text, width: 30, textAlign: 'center' }}>{value}</Text>
        <TouchableOpacity onPress={() => onChange(Math.min(max, value + 1))} style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: card, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20, color: text, lineHeight: 22 }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ResultRow({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: border }}>
      <Text style={{ flex: 1, fontSize: 14, color: sub }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color: text }}>{value}</Text>
    </View>
  );
}

export default function DaysOffScreen() {
  const isDark = useColorScheme() === 'dark';
  const fleet = useFleet();

  const [wbDest, setWbDest] = useState<string>('JFK');
  const [nightStops, setNightStops] = useState(1);
  const [callFromStandby, setCallFromStandby] = useState(false);

  const [isDailyService, setIsDailyService] = useState(true);

  const [nightsAway, setNightsAway] = useState(1);
  const [backToBackTA, setBackToBackTA] = useState(false);
  const [a320Standby, setA320Standby] = useState(false);

  const bg = isDark ? '#0A1628' : '#F7F8FA';
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';

  const wbResult = calcWBDaysOff(wbDest, nightStops, callFromStandby, isDailyService ? 6 : 5);
  const a320Result = calcA320DaysOff(nightsAway, backToBackTA, a320Standby);
  const result = fleet === 'wb' ? wbResult : a320Result;
  const daysOff = result.daysOff;
  const minHours = fleet === 'wb' ? getWBDayOffMinHours(daysOff) : getA320DayOffMinHours(daysOff);

  const isWestCoast = ['LAX', 'SFO', 'SEA', 'DEN', 'LAS', 'CUN'].includes(wbDest);
  const isCharter = wbDest === 'CHARTER';

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Calendar size={20} color="#0E4B5A" />
            <Text style={{ fontSize: 17, fontWeight: '700', color: text }}>Days Off</Text>
          </View>
          <FleetBadge fleet={fleet} size="sm" />
        </View>

        <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16, gap: 16 }}>
          {fleet === 'wb' ? (
            <>
              <DropdownPicker
                label="Destination"
                value={wbDest}
                options={WB_DESTINATIONS}
                onChange={setWbDest}
                accentColor="#0E4B5A"
              />
              {!isCharter && (
                <Stepper label="Night stops away" value={nightStops} min={0} max={5} onChange={setNightStops} isDark={isDark} />
              )}
              {isWestCoast && !isCharter && nightStops === 1 && !callFromStandby && (
                <View style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: sub }}>Daily service (6–7×/week)</Text>
                      <Text style={{ fontSize: 11, color: sub, marginTop: 2 }}>
                        {isDailyService ? '§2.5.10 — 4 days off' : '§2.5.12 — 3 days off + 2 bank credit'}
                      </Text>
                    </View>
                    <Switch value={isDailyService} onValueChange={setIsDailyService} trackColor={{ true: '#0E4B5A' }} />
                  </View>
                </View>
              )}
              {!isCharter && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: sub }}>Called from standby</Text>
                  <Switch value={callFromStandby} onValueChange={setCallFromStandby} trackColor={{ true: '#0E4B5A' }} />
                </View>
              )}
            </>
          ) : (
            <>
              <Stepper label="Nights away" value={nightsAway} min={0} max={14} onChange={setNightsAway} isDark={isDark} />
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: sub }}>Back-to-back TA</Text>
                <Switch value={backToBackTA} onValueChange={setBackToBackTA} trackColor={{ true: '#0E4B5A' }} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: sub }}>Called from standby (4+ nights)</Text>
                <Switch value={a320Standby} onValueChange={setA320Standby} trackColor={{ true: '#0E4B5A' }} />
              </View>
            </>
          )}
        </View>

        {/* Charter message */}
        {isCharter && fleet === 'wb' && (
          <View style={{ marginTop: 16, gap: 10 }}>
            <View style={{
              backgroundColor: '#D4840A10', borderRadius: 14, borderWidth: 1, borderColor: '#D4840A50',
              padding: 16, flexDirection: 'row', gap: 12,
            }}>
              <AlertTriangle size={18} color="#D4840A" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#D4840A' }}>Not in Agreed Coefficient Table</Text>
                <Text style={{ fontSize: 13, color: sub, marginTop: 6, lineHeight: 20 }}>
                  This destination is not listed in the coefficient table at §2.5.15.2. No agreed days-off entitlement can be calculated. Contact your union representative (IALPA) or refer to the specific charter or ad-hoc agreement.
                </Text>
              </View>
            </View>

            {/* Exact WC wording */}
            <View style={{
              backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border, padding: 16,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#2E6DB4', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                §2.5.15.2 — Coefficient Values Intercontinental Duties
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: sub, marginBottom: 6 }}>
                Exact wording from Widebody Consolidated Working Conditions 2025:
              </Text>
              {[
                { duty: 'Core Duty',          coeff: '2.6',  note: 'NYC, BOS, ORD, IAD, BWI, YYZ' },
                { duty: 'MCO',                coeff: '3.5',  note: '' },
                { duty: 'US West Coast',      coeff: '4.0',  note: '' },
                { duty: 'SP US West Coast*',  coeff: '5.0',  note: '' },
                { duty: 'Minneapolis',        coeff: '3.3',  note: '' },
              ].map((row, i, arr) => (
                <View key={row.duty} style={{
                  flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 2,
                  borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: border,
                }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: text }}>{row.duty}</Text>
                    {row.note ? <Text style={{ fontSize: 11, color: sub, marginTop: 1 }}>{row.note}</Text> : null}
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: text }}>{row.coeff}</Text>
                </View>
              ))}
              <Text style={{ fontSize: 11, color: sub, marginTop: 10, lineHeight: 17 }}>
                "Each flight duty generates a coefficient value which equates to free days. One coefficient equates to one free day. Free days will be planned post duty and or into the pilot's free day bank depending on the type of duty and the coefficient value in accordance with the planning and operational rules."
              </Text>
              <Text style={{ fontSize: 11, color: sub, marginTop: 6, fontStyle: 'italic' }}>
                — §2.5.15.1, WC 2025
              </Text>
            </View>
          </View>
        )}

        {!isCharter && (
          <>
            <SectionHeader title="Result" />
            <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
              <View style={{ backgroundColor: '#0E4B5A', padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 48, fontWeight: '800', color: '#FFFFFF' }}>{daysOff}</Text>
                <Text style={{ fontSize: 16, color: '#67E8F9', fontWeight: '600' }}>Days off required</Text>
                <Text style={{ fontSize: 12, color: '#67E8F980', marginTop: 4 }}>{result.daysOffClause}</Text>
              </View>
              <View style={{ padding: 16 }}>
                <ResultRow label="Minimum duration" value={formatHM(minHours)} isDark={isDark} />
                {fleet === 'wb' && 'coeffBankCredit' in result && (result as any).coeffBankCredit > 0 && (
                  <ResultRow label="Coefficient bank credit" value={`+${(result as any).coeffBankCredit}`} isDark={isDark} />
                )}
                {fleet === 'wb' && (
                  <ResultRow label="Coefficient value" value={String((result as any).coefficient ?? '—')} isDark={isDark} />
                )}
                {fleet === 'a320' && (
                  <ResultRow label="Operational minimum" value={formatHM((result as any).operationalMinimumHours)} isDark={isDark} />
                )}
                <Text style={{ fontSize: 12, color: sub, marginTop: 10, lineHeight: 18 }}>{result.notes}</Text>
              </View>
            </View>

            <SectionHeader title={fleet === 'wb' ? 'Planned Minimum Hours (§2.5.1)' : 'Planning Minimum Hours (§1.6)'} />
            <View style={{ backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
              {[1, 2, 3, 4].map((n, i) => {
                const h = fleet === 'wb' ? getWBDayOffMinHours(n) : getA320DayOffMinHours(n);
                return (
                  <View key={n} style={{
                    flexDirection: 'row', padding: 14,
                    borderBottomWidth: i < 3 ? 0.5 : 0, borderBottomColor: border,
                    backgroundColor: n === daysOff ? '#0E4B5A08' : 'transparent',
                  }}>
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: n === daysOff ? '700' : '400', color: n === daysOff ? '#0E4B5A' : text }}>
                      {n} day{n !== 1 ? 's' : ''} off
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: n === daysOff ? '700' : '400', color: n === daysOff ? '#0E4B5A' : sub }}>
                      {formatHM(h)} min
                    </Text>
                  </View>
                );
              })}
            </View>
            {/* §2.5.5 — 46h outstation coeff bank reduction */}
            {fleet === 'wb' && (
              <View style={{ backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border, padding: 16, marginTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Info size={15} color="#5B4FA8" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#5B4FA8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    §2.5.5 — Extended Outstation Stay
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: text, lineHeight: 20 }}>
                  If a pilot remains at an outstation for <Text style={{ fontWeight: '700' }}>46 hours or more</Text>, the coefficient bank credit for that duty is reduced by 1.
                </Text>
                <Text style={{ fontSize: 12, color: sub, marginTop: 6, lineHeight: 18 }}>
                  This reduction can occur at most once per roster period and up to 10 times per year. The number of days off due is unaffected — only the bank credit changes.
                </Text>
              </View>
            )}

            {/* §2.5.13 — West coast Shannon routing rule */}
            {fleet === 'wb' && isWestCoast && (
              <View style={{ backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border, padding: 16, marginTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Info size={15} color="#2E6DB4" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#2E6DB4', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    §2.5.13 — West Coast via Shannon
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: text, lineHeight: 20, marginBottom: 6 }}>
                  West coast duties that route through Shannon (SNN) have specific rules:
                </Text>
                {[
                  { label: 'Total duty ≤14.5h via Shannon', value: '4 days off' },
                  { label: 'Unable to reach Dublin — overnight SNN', value: '3 days off + OWC' },
                ].map((row) => (
                  <View key={row.label} style={{
                    flexDirection: 'row', paddingVertical: 10,
                    borderTopWidth: 0.5, borderTopColor: border,
                  }}>
                    <Text style={{ flex: 1, fontSize: 13, color: sub, lineHeight: 18 }}>{row.label}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: text }}>{row.value}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* §2.5.16 — Max 5 consecutive two-day TAs */}
            {fleet === 'wb' && (
              <View style={{ backgroundColor: '#D4840A08', borderRadius: 14, borderWidth: 1, borderColor: '#D4840A40', padding: 16, marginTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <AlertTriangle size={15} color="#D4840A" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#D4840A', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    §2.5.16 — Consecutive Two-Day Turnarounds
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: text, lineHeight: 20 }}>
                  No more than <Text style={{ fontWeight: '700' }}>5 consecutive two-day turnarounds</Text> may be rostered. After the 5th, a minimum of <Text style={{ fontWeight: '700' }}>3 days off</Text> must follow before the next two-day turnaround.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
