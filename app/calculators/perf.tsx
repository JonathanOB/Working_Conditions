import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, useColorScheme, TextInput,
} from 'react-native';
import { FleetBadge } from '../../components/FleetBadge';
import { SectionHeader } from '../../components/SectionHeader';
import { useFleet } from '../../hooks/useFleet';
import { Award, Info, ChevronDown, ChevronUp } from 'lucide-react-native';

type Position = 'cadet' | 'ntr' | 'fo' | 'nbCapt' | 'capt';
type Tab = 'rp' | 'yearly' | 'quick';

const POSITIONS: { value: Position; label: string }[] = [
  { value: 'cadet',  label: 'Cadet'        },
  { value: 'ntr',    label: 'NTR Co-Pilot' },
  { value: 'fo',     label: 'Co-Pilot'     },
  { value: 'nbCapt', label: 'NB Captain'   },
  { value: 'capt',   label: 'Captain'      },
];

const PERF_HR: Record<Position, number> = {
  cadet: 83.34, ntr: 83.34, fo: 83.34, nbCapt: 119.08, capt: 119.08,
};
const THRESHOLD: Record<'wb' | 'a320', number> = { wb: 65, a320: 70 };
const WC_REF: Record<'wb' | 'a320', string> = { wb: '§2.28 WC 2025', a320: '§2.25 WC May 2018' };

function formatEUR(n: number) {
  return '€' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function NumInput({ value, onChange, placeholder, isDark, large }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; isDark: boolean; large?: boolean;
}) {
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';
  return (
    <TextInput
      value={value}
      onChangeText={t => onChange(t.replace(/[^0-9.]/g, ''))}
      keyboardType="decimal-pad"
      placeholder={placeholder ?? '0'}
      placeholderTextColor={sub}
      style={{
        backgroundColor: card, borderRadius: large ? 12 : 8,
        borderWidth: 1, borderColor: border,
        paddingVertical: large ? 14 : 9,
        paddingHorizontal: large ? 16 : 10,
        fontSize: large ? 28 : 15,
        fontWeight: '700', color: text,
        textAlign: large ? 'left' : 'right',
        ...(large ? { flex: 1 } : { minWidth: 70 }),
      }}
    />
  );
}

export default function PerfPayScreen() {
  const isDark = useColorScheme() === 'dark';
  const fleet = useFleet();
  const threshold = THRESHOLD[fleet] ?? 65;
  const wcRef = WC_REF[fleet];

  const [position, setPosition] = useState<Position>('fo');
  const [tab, setTab] = useState<Tab>('rp');
  const [rpHours, setRpHours] = useState<string[]>(Array(13).fill(''));
  const [yearlyHours, setYearlyHours] = useState('');
  const [quickHours, setQuickHours] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);

  const updateRP = (i: number, val: string) =>
    setRpHours(prev => { const n = [...prev]; n[i] = val; return n; });

  const rate = PERF_HR[position];
  const annualThreshold = threshold * 13;

  const bg = isDark ? '#0A1628' : '#F7F8FA';
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';

  // ── Method A: RP-by-RP (from 13 RPs tab) ─────────────────────────
  const rpValues = rpHours.map(h => parseFloat(h) || 0);
  const rpExcesses = rpValues.map(v => Math.max(0, v - threshold));
  const rpByRpExcess = rpExcesses.reduce((s, e) => s + e, 0);
  const rpByRpPay = rpByRpExcess * rate;
  const totalFromRPs = rpValues.reduce((s, h) => s + h, 0);
  const hasRPInput = rpValues.some(v => v > 0);

  // ── Method B-i: Annual total derived from RP sum ──────────────────
  const annualExcessFromRPs = Math.max(0, totalFromRPs - annualThreshold);
  const annualPayFromRPs = annualExcessFromRPs * rate;

  // ── Method B-ii: Annual total from Yearly tab ─────────────────────
  const yearlyH = parseFloat(yearlyHours) || 0;
  const hasYearlyInput = yearlyH > 0;
  const annualExcessFromYearly = Math.max(0, yearlyH - annualThreshold);
  const annualPayFromYearly = annualExcessFromYearly * rate;

  // ── Combined: take best across all available methods ──────────────
  const hasBothInputs = hasRPInput && hasYearlyInput;
  const bestAnnualPay = Math.max(
    hasRPInput ? annualPayFromRPs : 0,
    hasYearlyInput ? annualPayFromYearly : 0,
  );
  const finalPay = Math.max(hasRPInput ? rpByRpPay : 0, bestAnnualPay);

  // What is the single winning method label?
  const winningLabel: string = (() => {
    if (finalPay === 0) return '';
    if (hasRPInput && rpByRpPay >= bestAnnualPay) return 'RP-by-RP method';
    if (hasYearlyInput && annualPayFromYearly >= annualPayFromRPs) return 'Annual total (yearly input)';
    return 'Annual total (RP sum)';
  })();

  // RP-tab local winner (when yearly not filled)
  const rpTabResult = Math.max(rpByRpPay, annualPayFromRPs);
  const rpTabWinner: 'rp' | 'annual' =
    rpByRpPay >= annualPayFromRPs ? 'rp' : 'annual';

  // Quick tab
  const qHours = parseFloat(quickHours) || 0;
  const qExcess = Math.max(0, qHours - threshold);
  const qPay = qExcess * rate;

  const TABS: { value: Tab; label: string }[] = [
    { value: 'rp',     label: '13 RPs'  },
    { value: 'yearly', label: 'Yearly'  },
    { value: 'quick',  label: 'Quick'   },
  ];

  // Combined summary — inlined where both tabs have data
  const combinedSummary = hasBothInputs ? (
    <View style={{ marginTop: 16 }}>
      <SectionHeader title="Combined Result" subtitle="Greater of all three methods — WC §2.28" />

      {/* Three-method comparison */}
      <View style={{ gap: 6, marginBottom: 10 }}>
        {([
          {
            label: 'RP-by-RP',
            desc: `${rpByRpExcess.toFixed(1)} hrs excess across ${rpValues.filter(v => v > threshold).length} RP(s)`,
            pay: rpByRpPay,
          },
          {
            label: 'Annual total — from 13 RPs',
            desc: `${totalFromRPs.toFixed(1)} h total − ${annualThreshold} h threshold = ${annualExcessFromRPs.toFixed(1)} h excess`,
            pay: annualPayFromRPs,
          },
          {
            label: 'Annual total — yearly hours input',
            desc: `${yearlyH.toFixed(1)} h total − ${annualThreshold} h threshold = ${annualExcessFromYearly.toFixed(1)} h excess`,
            pay: annualPayFromYearly,
          },
        ] as const).map(m => {
          const wins = m.pay === finalPay && m.pay > 0;
          return (
            <View
              key={m.label}
              style={{
                backgroundColor: card, borderRadius: 12, padding: 12,
                borderWidth: wins ? 2 : 1,
                borderColor: wins ? '#0369A1' : border,
                flexDirection: 'row', alignItems: 'center', gap: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: wins ? '#0369A1' : text }}>
                    {m.label}
                  </Text>
                  {wins && (
                    <View style={{ backgroundColor: '#0369A1', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFF' }}>APPLIES</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 11, color: sub, marginTop: 2 }}>{m.desc}</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: wins ? '#0369A1' : text }}>
                {formatEUR(m.pay)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Final result banner */}
      <View style={{
        backgroundColor: finalPay > 0 ? '#0369A1' : (isDark ? '#1E293B' : '#E2E8F0'),
        borderRadius: 16, padding: 20,
      }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: finalPay > 0 ? '#BAE6FD' : sub, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {finalPay > 0 ? 'Performance Pay' : 'No Performance Pay'}
        </Text>
        <Text style={{ fontSize: 42, fontWeight: '900', color: finalPay > 0 ? '#FFFFFF' : sub, marginTop: 4 }}>
          {formatEUR(finalPay)}
        </Text>
        <Text style={{ fontSize: 13, color: finalPay > 0 ? '#BAE6FD' : sub, marginTop: 4 }}>
          {finalPay > 0
            ? winningLabel
            : `All methods below ${annualThreshold}-hr annual threshold`}
        </Text>
      </View>
    </View>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Award size={20} color="#0369A1" />
            <Text style={{ fontSize: 17, fontWeight: '700', color: text }}>Performance Pay</Text>
          </View>
          <FleetBadge fleet={fleet} size="sm" />
        </View>

        {/* Position + rate info */}
        <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16, gap: 12, marginBottom: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: sub }}>Position / Rank</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {POSITIONS.map(p => (
              <TouchableOpacity
                key={p.value}
                onPress={() => setPosition(p.value)}
                style={{
                  flex: 1, minWidth: '30%', paddingVertical: 9, borderRadius: 10,
                  backgroundColor: position === p.value ? '#0369A1' : bg,
                  borderWidth: 1, borderColor: position === p.value ? '#0369A1' : border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: position === p.value ? '#FFF' : text }}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: '#0369A112', borderRadius: 10, padding: 10, borderWidth: 0.5, borderColor: '#0369A130' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#0369A1', textTransform: 'uppercase', letterSpacing: 0.4 }}>Perf rate</Text>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#0369A1', marginTop: 2 }}>{formatEUR(rate)}/hr</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderRadius: 10, padding: 10, borderWidth: 0.5, borderColor: border }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: sub, textTransform: 'uppercase', letterSpacing: 0.4 }}>Threshold</Text>
              <Text style={{ fontSize: 20, fontWeight: '900', color: text, marginTop: 2 }}>{threshold} hrs/RP</Text>
              <Text style={{ fontSize: 10, color: sub, marginTop: 1 }}>{wcRef}</Text>
            </View>
          </View>
        </View>

        {/* Tab bar */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.value}
              onPress={() => setTab(t.value)}
              style={{
                flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
                backgroundColor: tab === t.value ? '#0369A1' : card,
                borderWidth: 1, borderColor: tab === t.value ? '#0369A1' : border,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: tab === t.value ? '#FFF' : text }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ──────────────────────────────────────────────────────────
            TAB 1 — 13 ROSTER PERIODS
        ────────────────────────────────────────────────────────── */}
        {tab === 'rp' && (
          <>
            <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, overflow: 'hidden', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: border, backgroundColor: isDark ? '#0F2B5B' : '#EFF6FF' }}>
                <Text style={{ width: 44, fontSize: 11, fontWeight: '700', color: '#0369A1', textTransform: 'uppercase', letterSpacing: 0.3 }}>RP</Text>
                <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: '#0369A1', textTransform: 'uppercase', letterSpacing: 0.3 }}>Block hrs</Text>
                <Text style={{ width: 100, fontSize: 11, fontWeight: '700', color: '#0369A1', textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'right' }}>Excess → Pay</Text>
              </View>

              {rpHours.map((val, i) => {
                const hrs = parseFloat(val) || 0;
                const excess = Math.max(0, hrs - threshold);
                const pay = excess * rate;
                const over = hrs > threshold;
                const entered = hrs > 0;
                return (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
                      borderBottomWidth: i < 12 ? 0.5 : 0, borderBottomColor: border,
                      backgroundColor: over ? '#0369A108' : 'transparent',
                    }}
                  >
                    <Text style={{ width: 44, fontSize: 14, fontWeight: '700', color: over ? '#0369A1' : sub }}>
                      {i + 1}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <NumInput value={val} onChange={v => updateRP(i, v)} isDark={isDark} />
                    </View>
                    <View style={{ width: 100, alignItems: 'flex-end', gap: 1 }}>
                      {over ? (
                        <>
                          <Text style={{ fontSize: 11, color: '#0369A1', fontWeight: '600' }}>+{excess.toFixed(1)} hrs</Text>
                          <Text style={{ fontSize: 12, color: '#0369A1', fontWeight: '700' }}>{formatEUR(pay)}</Text>
                        </>
                      ) : entered ? (
                        <Text style={{ fontSize: 11, color: sub }}>below</Text>
                      ) : (
                        <Text style={{ fontSize: 13, color: sub }}>—</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {hasRPInput && (
              <>
                <SectionHeader title="Calculation" />

                {/* RP-by-RP method card */}
                <View style={{ gap: 8, marginBottom: 10 }}>
                  <View style={{
                    backgroundColor: card, borderRadius: 14, padding: 14,
                    borderWidth: rpTabWinner === 'rp' && !hasBothInputs ? 2 : 1,
                    borderColor: rpTabWinner === 'rp' && !hasBothInputs ? '#0369A1' : border,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: text }}>RP-by-RP Method</Text>
                      {rpTabWinner === 'rp' && !hasBothInputs && (
                        <View style={{ backgroundColor: '#0369A1', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFF' }}>APPLIES</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 11, color: sub, lineHeight: 16, marginBottom: 8 }}>
                      Each RP assessed independently. Surplus in busy RPs counts; deficit RPs do not offset it.
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, color: sub }}>{rpByRpExcess.toFixed(1)} hrs total excess</Text>
                      <Text style={{ fontSize: 17, fontWeight: '800', color: rpTabWinner === 'rp' && !hasBothInputs ? '#0369A1' : text }}>
                        {formatEUR(rpByRpPay)}
                      </Text>
                    </View>
                  </View>

                  {/* Annual total from RP sum */}
                  <View style={{
                    backgroundColor: card, borderRadius: 14, padding: 14,
                    borderWidth: rpTabWinner === 'annual' && !hasBothInputs ? 2 : 1,
                    borderColor: rpTabWinner === 'annual' && !hasBothInputs ? '#0369A1' : border,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: text }}>Annual Total Method</Text>
                      {rpTabWinner === 'annual' && !hasBothInputs && (
                        <View style={{ backgroundColor: '#0369A1', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFF' }}>APPLIES</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 11, color: sub, lineHeight: 16, marginBottom: 8 }}>
                      Sum of all 13 RPs ({totalFromRPs.toFixed(1)} h) vs annual threshold ({threshold} × 13 = {annualThreshold} h).
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, color: sub }}>
                        {totalFromRPs.toFixed(1)} − {annualThreshold} = {annualExcessFromRPs.toFixed(1)} hrs
                      </Text>
                      <Text style={{ fontSize: 17, fontWeight: '800', color: rpTabWinner === 'annual' && !hasBothInputs ? '#0369A1' : text }}>
                        {formatEUR(annualPayFromRPs)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Result banner — only shown when yearly tab is NOT also filled */}
                {!hasBothInputs && (
                  <View style={{
                    backgroundColor: rpTabResult > 0 ? '#0369A1' : (isDark ? '#1E293B' : '#E2E8F0'),
                    borderRadius: 16, padding: 20, marginBottom: 4,
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: rpTabResult > 0 ? '#BAE6FD' : sub, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {rpTabResult > 0 ? 'Greater of both methods' : 'No Performance Pay'}
                    </Text>
                    <Text style={{ fontSize: 42, fontWeight: '900', color: rpTabResult > 0 ? '#FFF' : sub, marginTop: 4 }}>
                      {formatEUR(rpTabResult)}
                    </Text>
                    <Text style={{ fontSize: 13, color: rpTabResult > 0 ? '#BAE6FD' : sub, marginTop: 4 }}>
                      {rpTabResult > 0
                        ? `${rpTabWinner === 'rp' ? 'RP-by-RP' : 'Annual'} method applies · ${totalFromRPs.toFixed(1)} hrs total`
                        : `${totalFromRPs.toFixed(1)} hrs — below ${annualThreshold}-hr annual threshold`}
                    </Text>
                  </View>
                )}

                {/* Breakdown toggle */}
                <TouchableOpacity
                  onPress={() => setShowBreakdown(v => !v)}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 6 }}
                >
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#0369A1' }}>
                    {showBreakdown ? 'Hide RP breakdown' : 'Show full RP breakdown'}
                  </Text>
                  {showBreakdown ? <ChevronUp size={16} color="#0369A1" /> : <ChevronDown size={16} color="#0369A1" />}
                </TouchableOpacity>

                {showBreakdown && (
                  <View style={{ backgroundColor: card, borderRadius: 12, borderWidth: 1, borderColor: border, overflow: 'hidden', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: border, backgroundColor: isDark ? '#0F2B5B' : '#EFF6FF' }}>
                      <Text style={{ width: 46, fontSize: 11, fontWeight: '700', color: '#0369A1' }}>RP</Text>
                      <Text style={{ flex: 1,  fontSize: 11, fontWeight: '700', color: '#0369A1' }}>Hours</Text>
                      <Text style={{ width: 64, fontSize: 11, fontWeight: '700', color: '#0369A1', textAlign: 'center' }}>Excess</Text>
                      <Text style={{ width: 84, fontSize: 11, fontWeight: '700', color: '#0369A1', textAlign: 'right' }}>Pay</Text>
                    </View>
                    {rpValues.map((v, i) => {
                      const ex = rpExcesses[i];
                      const p = ex * rate;
                      return (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: i < 12 ? 0.5 : 0, borderBottomColor: border }}>
                          <Text style={{ width: 46, fontSize: 13, color: sub }}>RP{i + 1}</Text>
                          <Text style={{ flex: 1, fontSize: 13, color: text }}>{v > 0 ? `${v.toFixed(1)} h` : '—'}</Text>
                          <Text style={{ width: 64, fontSize: 13, color: ex > 0 ? '#0369A1' : sub, textAlign: 'center' }}>{ex > 0 ? `+${ex.toFixed(1)}` : '—'}</Text>
                          <Text style={{ width: 84, fontSize: 13, fontWeight: ex > 0 ? '600' : '400', color: ex > 0 ? text : sub, textAlign: 'right' }}>
                            {ex > 0 ? formatEUR(p) : '—'}
                          </Text>
                        </View>
                      );
                    })}
                    <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: 1, borderTopColor: border, backgroundColor: isDark ? '#0F2B5B' : '#EFF6FF' }}>
                      <Text style={{ width: 46, fontSize: 12, fontWeight: '700', color: '#0369A1' }}>Total</Text>
                      <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#0369A1' }}>{totalFromRPs.toFixed(1)} h</Text>
                      <Text style={{ width: 64, fontSize: 12, fontWeight: '700', color: '#0369A1', textAlign: 'center' }}>+{rpByRpExcess.toFixed(1)}</Text>
                      <Text style={{ width: 84, fontSize: 12, fontWeight: '700', color: '#0369A1', textAlign: 'right' }}>{formatEUR(rpByRpPay)}</Text>
                    </View>
                  </View>
                )}

                {combinedSummary}
              </>
            )}
          </>
        )}

        {/* ──────────────────────────────────────────────────────────
            TAB 2 — YEARLY TOTAL HOURS
        ────────────────────────────────────────────────────────── */}
        {tab === 'yearly' && (
          <>
            <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16, gap: 14 }}>
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: sub }}>Total block hours flown this year</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <NumInput
                    value={yearlyHours}
                    onChange={setYearlyHours}
                    placeholder="e.g. 850"
                    isDark={isDark}
                    large
                  />
                  <Text style={{ fontSize: 15, color: sub }}>hrs</Text>
                </View>
                <Text style={{ fontSize: 11, color: sub, lineHeight: 17 }}>
                  Cumulative block hours across all 13 roster periods. Standby and ground duties excluded.
                </Text>
              </View>

              {/* Threshold breakdown */}
              <View style={{ backgroundColor: isDark ? '#0A1E38' : '#EFF6FF', borderRadius: 10, padding: 12, gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: sub }}>Annual threshold</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: text }}>{threshold} × 13 = {annualThreshold} hrs</Text>
                </View>
                {hasYearlyInput && (
                  <>
                    <View style={{ height: 0.5, backgroundColor: border }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: sub }}>Hours entered</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: text }}>{yearlyH.toFixed(1)} hrs</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: sub }}>Excess above threshold</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: annualExcessFromYearly > 0 ? '#0369A1' : sub }}>
                        {annualExcessFromYearly > 0 ? `+${annualExcessFromYearly.toFixed(1)} hrs` : 'nil'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: sub }}>Annual method result</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: annualPayFromYearly > 0 ? '#0369A1' : sub }}>
                        {formatEUR(annualPayFromYearly)}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>

            {hasYearlyInput && (
              <>
                {/* Result banner — only if RP tab not also filled */}
                {!hasBothInputs && (
                  <>
                    <View style={{
                      backgroundColor: annualPayFromYearly > 0 ? '#0369A1' : (isDark ? '#1E293B' : '#E2E8F0'),
                      borderRadius: 16, padding: 20, marginTop: 10,
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: annualPayFromYearly > 0 ? '#BAE6FD' : sub, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {annualPayFromYearly > 0 ? 'Performance Pay — Annual Method' : 'No Performance Pay'}
                      </Text>
                      <Text style={{ fontSize: 42, fontWeight: '900', color: annualPayFromYearly > 0 ? '#FFF' : sub, marginTop: 4 }}>
                        {formatEUR(annualPayFromYearly)}
                      </Text>
                      <Text style={{ fontSize: 13, color: annualPayFromYearly > 0 ? '#BAE6FD' : sub, marginTop: 4 }}>
                        {annualPayFromYearly > 0
                          ? `${annualExcessFromYearly.toFixed(1)} excess hrs × ${formatEUR(rate)}/hr`
                          : `${yearlyH.toFixed(1)} hrs — ${(annualThreshold - yearlyH).toFixed(1)} hrs short of ${annualThreshold}-hr threshold`}
                      </Text>
                    </View>

                    <View style={{ backgroundColor: '#D4840A08', borderRadius: 10, padding: 12, marginTop: 10, borderWidth: 0.5, borderColor: '#D4840A30', flexDirection: 'row', gap: 8 }}>
                      <Info size={13} color="#D4840A" style={{ marginTop: 1 }} />
                      <Text style={{ flex: 1, fontSize: 11, color: isDark ? '#D4840A80' : '#92400E', lineHeight: 17 }}>
                        Only the annual total method is available here. Fill in all 13 roster periods on the "13 RPs" tab to also check the RP-by-RP method — it may give a higher result.
                      </Text>
                    </View>
                  </>
                )}

                {combinedSummary}
              </>
            )}
          </>
        )}

        {/* ──────────────────────────────────────────────────────────
            TAB 3 — QUICK CHECK (single RP)
        ────────────────────────────────────────────────────────── */}
        {tab === 'quick' && (
          <>
            <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16, gap: 14 }}>
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: sub }}>Block hours this RP</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <NumInput value={quickHours} onChange={setQuickHours} placeholder="e.g. 72" isDark={isDark} large />
                  <Text style={{ fontSize: 15, color: sub }}>hrs</Text>
                </View>
              </View>

              {qHours > 0 && (
                <View style={{ borderRadius: 10, overflow: 'hidden', borderWidth: 0.5, borderColor: border }}>
                  {([
                    { label: 'Hours flown',                                                     value: `${qHours.toFixed(1)} hrs`,        hi: false },
                    { label: `Threshold (${wcRef})`,                                            value: `${threshold} hrs`,                hi: false },
                    { label: 'Excess hours',                                                    value: `${qExcess.toFixed(1)} hrs`,       hi: qExcess > 0 },
                    { label: `Rate (${POSITIONS.find(p => p.value === position)?.label ?? ''})`, value: `${formatEUR(rate)}/hr`,          hi: false },
                    { label: 'Perf pay this RP',                                                value: formatEUR(qPay),                   hi: true },
                  ] as const).map(row => (
                    <View key={row.label} style={{
                      flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12,
                      backgroundColor: row.hi ? '#0369A115' : 'transparent',
                      borderBottomWidth: 0.5, borderBottomColor: border,
                    }}>
                      <Text style={{ flex: 1, fontSize: 13, color: row.hi ? '#0369A1' : sub }}>{row.label}</Text>
                      <Text style={{ fontSize: 13, fontWeight: row.hi ? '800' : '600', color: row.hi ? '#0369A1' : text }}>{row.value}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {qHours > 0 && (
              <View style={{
                backgroundColor: qPay > 0 ? '#0369A1' : (isDark ? '#1E293B' : '#E2E8F0'),
                borderRadius: 16, padding: 20, marginTop: 10,
              }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: qPay > 0 ? '#BAE6FD' : sub, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {qPay > 0 ? 'Performance Pay This RP' : 'No Performance Pay This RP'}
                </Text>
                <Text style={{ fontSize: 42, fontWeight: '900', color: qPay > 0 ? '#FFF' : sub, marginTop: 4 }}>
                  {formatEUR(qPay)}
                </Text>
                <Text style={{ fontSize: 13, color: qPay > 0 ? '#BAE6FD' : sub, marginTop: 4 }}>
                  {qPay > 0
                    ? `${qExcess.toFixed(1)} excess hrs × ${formatEUR(rate)}/hr`
                    : `${qHours.toFixed(1)} hrs — ${(threshold - qHours).toFixed(1)} hrs short of ${threshold}-hr threshold`}
                </Text>
              </View>
            )}
          </>
        )}

        {/* WC citations */}
        <View style={{ marginTop: 16, gap: 8 }}>
          <View style={{ backgroundColor: '#0369A110', borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: '#0369A140', flexDirection: 'row', gap: 8 }}>
            <Info size={13} color="#0369A1" style={{ marginTop: 1 }} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#0369A1' }}>{wcRef}</Text>
              <Text style={{ fontSize: 11, color: sub, lineHeight: 17 }}>
                {fleet === 'wb'
                  ? 'Performance pay is the greater of: (a) sum of excess block hours per RP above threshold, or (b) total annual block hours minus annual threshold (65 × 13 = 845 hrs). Rate: €83.34/hr (Co-Pilot/NTR/Cadet), €119.08/hr (Captain/NB Captain).'
                  : 'Performance pay is the greater of the RP-by-RP or annual total method. Verify your threshold from the A320/Neo WC. Rate: €83.34/hr (FO/NTR/Cadet), €119.08/hr (Captain/NB Captain).'}
              </Text>
            </View>
          </View>
          <View style={{ backgroundColor: '#D4840A08', borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: '#D4840A30', flexDirection: 'row', gap: 8 }}>
            <Info size={13} color="#D4840A" style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 11, color: isDark ? '#D4840A80' : '#92400E', lineHeight: 17 }}>
              Indicative only. Verify current rates and thresholds in your signed WC document. Block hours only — standby and ground duties excluded.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
