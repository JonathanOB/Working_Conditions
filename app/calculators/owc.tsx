import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { FleetBadge } from '../../components/FleetBadge';
import { SectionHeader } from '../../components/SectionHeader';
import { useFleet } from '../../hooks/useFleet';
import { DollarSign, Info } from 'lucide-react-native';

const PAY_DATA: Array<Record<string, number | null | string>> = require('../../data/pay/pay.json');

type Position = 'cadet' | 'ntr' | 'fo' | 'nbCapt' | 'capt';
type OWCType = 'free_day' | 'gash_day' | 'agreed' | 'short_rest';

const POSITIONS: { value: Position; label: string; description: string }[] = [
  { value: 'cadet',  label: 'Cadet',              description: 'Cadet pilot' },
  { value: 'ntr',    label: 'NTR Co-Pilot',        description: 'Non Type Rated Co-Pilot' },
  { value: 'fo',     label: 'Co-Pilot',            description: 'First Officer' },
  { value: 'nbCapt', label: 'Narrow Body Captain', description: 'A320/Neo Captain' },
  { value: 'capt',   label: 'Captain',             description: 'A330 Captain' },
];

const OWC_TYPES: { value: OWCType; label: string; rate: number; description: string }[] = [
  { value: 'free_day',   label: 'Working on a Free Day',    rate: 0.0057, description: '§3.14.1(a) — a rostered day off' },
  { value: 'gash_day',   label: 'Working on a Gash Day',    rate: 0.0038, description: '§3.14.1(b) — an unforeseen extra duty' },
  { value: 'agreed',     label: 'Agreed OWC Duty',          rate: 0.0019, description: '§3.14.1(c) — agreed additional duty' },
  { value: 'short_rest', label: 'Short Rest Infringement',  rate: 0.0019, description: '§3.14.1(d) — rest less than minimum (excl. first 30 min)' },
];

function getBasicPay(position: Position, yearKey: string): number | null {
  const row = PAY_DATA.find(r => r.year === yearKey);
  if (!row) return null;
  const v = row[position];
  if (v === null || v === undefined) return null;
  return typeof v === 'number' ? v : null;
}

function getYearOptions(position: Position) {
  return PAY_DATA
    .filter(r => r.year !== 'Perf_Hr' && r[position] !== null && r[position] !== undefined)
    .map(r => {
      const key = String(r.year);
      let label = '';
      if (/^\d+$/.test(key)) {
        label = `Year ${key}`;
      } else if (key === 'LSI_1_23') {
        label = 'LSI Increment 1 (2023)';
      } else if (key === 'LSI_1_2_24') {
        label = 'LSI Increments 1+2 (2024)';
      } else if (key === 'LSI_1_2_25') {
        label = 'LSI Increments 1+2 (2025)';
      } else if (key === 'LSI_1_2_3_26') {
        label = 'LSI Increments 1+2+3 (2026)';
      } else {
        label = key;
      }
      return { value: key, label };
    });
}

function formatEUR(amount: number): string {
  return '€' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function OWCScreen() {
  const isDark = useColorScheme() === 'dark';
  const fleet = useFleet();

  const [position, setPosition] = useState<Position>('fo');
  const [yearKey, setYearKey] = useState('5');
  const [owcType, setOwcType] = useState<OWCType>('free_day');
  const [events, setEvents] = useState(1);

  const bg = isDark ? '#0A1628' : '#F7F8FA';
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';

  const yearOptions = getYearOptions(position);
  const validYear = yearOptions.find(y => y.value === yearKey) ? yearKey : (yearOptions[0]?.value ?? '1');
  const basicPay = getBasicPay(position, validYear);
  const owcInfo = OWC_TYPES.find(o => o.value === owcType)!;
  const owcPerEvent = basicPay !== null ? basicPay * owcInfo.rate : null;
  const owcTotal = owcPerEvent !== null ? owcPerEvent * events : null;

  const perfHourRow = PAY_DATA.find(r => r.year === 'Perf_Hr');
  const perfHour = perfHourRow ? Number(perfHourRow[position]) : null;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <DollarSign size={20} color="#1B6B3A" />
            <Text style={{ fontSize: 17, fontWeight: '700', color: text }}>OWC Calculator</Text>
          </View>
          <FleetBadge fleet={fleet} size="sm" />
        </View>

        {/* Position picker */}
        <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16, gap: 14 }}>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: sub }}>Position</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {POSITIONS.map(p => (
                <TouchableOpacity
                  key={p.value}
                  onPress={() => {
                    setPosition(p.value);
                    const opts = getYearOptions(p.value);
                    if (opts.length > 0 && !opts.find(y => y.value === yearKey)) {
                      setYearKey(opts[0].value);
                    }
                  }}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10,
                    backgroundColor: position === p.value ? '#1B6B3A' : bg,
                    borderWidth: 1, borderColor: position === p.value ? '#1B6B3A' : border,
                    minWidth: '47%', flex: 1,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', textAlign: 'center', color: position === p.value ? '#FFFFFF' : text }}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Year picker */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: sub }}>Seniority Year</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {yearOptions.map(y => (
                <TouchableOpacity
                  key={y.value}
                  onPress={() => setYearKey(y.value)}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
                    backgroundColor: validYear === y.value ? '#1B6B3A' : bg,
                    borderWidth: 1, borderColor: validYear === y.value ? '#1B6B3A' : border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: validYear === y.value ? '#FFFFFF' : text }}>
                    {y.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Basic pay display */}
          <View style={{ backgroundColor: '#1B6B3A18', borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: '#1B6B3A40' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1B6B3A', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Annual Basic Pay
            </Text>
            <Text style={{ fontSize: 26, fontWeight: '800', color: '#1B6B3A', marginTop: 4 }}>
              {basicPay !== null ? formatEUR(basicPay) : '—'}
            </Text>
            {perfHour !== null && (
              <Text style={{ fontSize: 12, color: '#1B6B3A80', marginTop: 4 }}>
                Performance hour rate: {formatEUR(perfHour)}/hr
              </Text>
            )}
          </View>
        </View>

        <SectionHeader title="OWC Type" subtitle="Outside Working Conditions (§3.14.1)" />
        <View style={{ gap: 8 }}>
          {OWC_TYPES.map(type => (
            <TouchableOpacity
              key={type.value}
              onPress={() => setOwcType(type.value)}
              style={{
                backgroundColor: card, borderRadius: 12, borderWidth: owcType === type.value ? 1.5 : 1,
                borderColor: owcType === type.value ? '#1B6B3A' : border, padding: 14,
                flexDirection: 'row', alignItems: 'center', gap: 12,
              }}
            >
              <View style={{
                width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                borderColor: owcType === type.value ? '#1B6B3A' : sub,
                backgroundColor: owcType === type.value ? '#1B6B3A' : 'transparent',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {owcType === type.value && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' }} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: text }}>{type.label}</Text>
                <Text style={{ fontSize: 11, color: sub, marginTop: 2 }}>{type.description}</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1B6B3A' }}>
                {(type.rate * 100).toFixed(2)}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader title="Number of Events" />
        <View style={{ backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: text }}>OWC events</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <TouchableOpacity onPress={() => setEvents(Math.max(1, events - 1))} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: bg, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22, color: text, lineHeight: 24 }}>−</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 22, fontWeight: '800', color: text, width: 36, textAlign: 'center' }}>{events}</Text>
              <TouchableOpacity onPress={() => setEvents(Math.min(20, events + 1))} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: bg, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22, color: text, lineHeight: 24 }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <SectionHeader title="Result" />
        <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
          <View style={{ backgroundColor: '#1B6B3A', padding: 20, gap: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#BBF7D0', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {owcInfo.label}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View>
                <Text style={{ fontSize: 11, color: '#BBF7D080', marginBottom: 2 }}>Per event</Text>
                <Text style={{ fontSize: 32, fontWeight: '900', color: '#FFFFFF' }}>
                  {owcPerEvent !== null ? formatEUR(owcPerEvent) : '—'}
                </Text>
              </View>
              {events > 1 && owcTotal !== null && (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, color: '#BBF7D080', marginBottom: 2 }}>{events} events total</Text>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#BBF7D0' }}>{formatEUR(owcTotal)}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={{ padding: 16, gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: sub }}>OWC rate</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: text }}>{(owcInfo.rate * 100).toFixed(2)}% of basic pay</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: sub }}>Basic pay used</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: text }}>{basicPay !== null ? formatEUR(basicPay) : '—'}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: sub }}>Reference</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: text }}>{owcInfo.description.split(' — ')[0]}</Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 16, backgroundColor: '#2E6DB410', borderRadius: 10, borderWidth: 0.5, borderColor: '#2E6DB440', padding: 12, flexDirection: 'row', gap: 8 }}>
          <Info size={13} color="#2E6DB4" style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontSize: 11, color: sub, lineHeight: 17 }}>
            OWC payments are based on contracted basic pay only. All amounts are indicative — verify with your payslip or HR. Perf hours are excluded from OWC calculations.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
