import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, useColorScheme,
  Alert, TextInput,
} from 'react-native';
import { useFleet } from '../../hooks/useFleet';
import { FleetBadge } from '../../components/FleetBadge';
import { SectionHeader } from '../../components/SectionHeader';
import { useCoefficientStore, useCoeffBalance, type CoefficientEntry } from '../../hooks/useCoefficient';
import { TrendingUp, Plus, Trash2, Info } from 'lucide-react-native';

const DEST_COEFFICIENTS: Record<string, number> = {
  JFK: 2.6, EWR: 2.6, BOS: 2.6, ORD: 2.6, MIA: 2.6, IAD: 2.6, BWI: 2.6, YYZ: 2.6,
  MCO: 3.5, MSP: 3.3,
  LAX: 4.0, SFO: 4.0, SEA: 4.0, DEN: 4.0, LAS: 4.0, CUN: 4.0,
};

const DEST_OPTIONS = [
  { iata: 'JFK', label: 'JFK — New York JFK (2.6)' },
  { iata: 'EWR', label: 'EWR — New York EWR (2.6)' },
  { iata: 'BOS', label: 'BOS — Boston (2.6)' },
  { iata: 'ORD', label: 'ORD — Chicago (2.6)' },
  { iata: 'MIA', label: 'MIA — Miami (2.6)' },
  { iata: 'IAD', label: 'IAD — Washington (2.6)' },
  { iata: 'BWI', label: 'BWI — Baltimore (2.6)' },
  { iata: 'YYZ', label: 'YYZ — Toronto (2.6)' },
  { iata: 'MCO', label: 'MCO — Orlando (3.5)' },
  { iata: 'MSP', label: 'MSP — Minneapolis (3.3)' },
  { iata: 'LAX', label: 'LAX — Los Angeles (4.0)' },
  { iata: 'SFO', label: 'SFO — San Francisco (4.0)' },
  { iata: 'SEA', label: 'SEA — Seattle (4.0)' },
  { iata: 'DEN', label: 'DEN — Denver (4.0)' },
  { iata: 'LAS', label: 'LAS — Las Vegas (4.0)' },
  { iata: 'CUN', label: 'CUN — Cancun (4.0)' },
];

export default function CoefficientScreen() {
  const isDark = useColorScheme() === 'dark';
  const fleet = useFleet();
  const { entries, addEntry, removeEntry, reset } = useCoefficientStore();
  const balance = useCoeffBalance();

  const [showAdd, setShowAdd] = useState(false);
  const [selectedIATA, setSelectedIATA] = useState('JFK');
  const [daysRostered, setDaysRostered] = useState(2);
  const [notes, setNotes] = useState('');

  const bg = isDark ? '#0A1628' : '#F7F8FA';
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';

  if (fleet !== 'wb') {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <TrendingUp size={48} color={sub} />
        <Text style={{ fontSize: 17, fontWeight: '700', color: text, marginTop: 16, textAlign: 'center' }}>
          Widebody Only
        </Text>
        <Text style={{ fontSize: 14, color: sub, marginTop: 8, textAlign: 'center', lineHeight: 21 }}>
          The coefficient bank is only used on the A330 widebody fleet. Switch fleets in Settings.
        </Text>
      </View>
    );
  }

  function handleAddEntry() {
    const dest = DEST_OPTIONS.find(d => d.iata === selectedIATA);
    if (!dest) return;
    addEntry({
      date: new Date().toISOString(),
      destination: dest.label,
      iata: selectedIATA,
      coefficient: DEST_COEFFICIENTS[selectedIATA] ?? 2.6,
      daysOffRostered: daysRostered,
      notes,
    });
    setShowAdd(false);
    setNotes('');
  }

  function handleDelete(id: string) {
    Alert.alert('Remove Entry', 'Remove this coefficient entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeEntry(id) },
    ]);
  }

  const balanceColor = balance > 0 ? '#1B6B3A' : balance < 0 ? '#B91C1C' : sub;
  const balanceBg = balance > 0 ? '#1B6B3A18' : balance < 0 ? '#B91C1C18' : '#2E6DB418';

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={20} color='#D4840A' />
            <Text style={{ fontSize: 17, fontWeight: '700', color: text }}>Coefficient Bank</Text>
          </View>
          <FleetBadge fleet={fleet} size="sm" />
        </View>

        {/* Balance */}
        <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <View style={{
            backgroundColor: balanceBg, borderRadius: 16, borderWidth: 1,
            borderColor: `${balanceColor}40`, padding: 20, alignItems: 'center',
          }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: balanceColor, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Running Balance
            </Text>
            <Text style={{ fontSize: 52, fontWeight: '900', color: balanceColor, marginTop: 4 }}>
              {balance > 0 ? `+${balance.toFixed(1)}` : balance.toFixed(1)}
            </Text>
            <Text style={{ fontSize: 13, color: `${balanceColor}80`, marginTop: 4 }}>
              {entries.length} {entries.length === 1 ? 'duty' : 'duties'} logged
            </Text>
          </View>
        </View>

        {/* Rules info */}
        <View style={{ marginHorizontal: 16, marginBottom: 4, gap: 8 }}>
          {/* Formula */}
          <View style={{
            backgroundColor: card, borderRadius: 12, borderWidth: 1, borderColor: '#D4840A40',
            padding: 12, flexDirection: 'row', gap: 10,
          }}>
            <Info size={14} color="#D4840A" style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 11, color: sub, lineHeight: 17 }}>
              Balance = Σ(coefficient) − Σ(days off rostered). Positive = days owed to you; Negative = company owes fewer days.
            </Text>
          </View>

          {/* §2.5.15.6/7 — Section structure and carry-over */}
          <View style={{ backgroundColor: card, borderRadius: 12, borderWidth: 1, borderColor: border, padding: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#D4840A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              §2.5.15.6/7 — Year Sections & Carry-Over
            </Text>
            {[
              { section: 'Section 1', rps: 'RP 1–3' },
              { section: 'Section 2', rps: 'RP 4–6' },
              { section: 'Section 3', rps: 'RP 7–10' },
              { section: 'Section 4', rps: 'RP 11–13' },
            ].map((row, i, arr) => (
              <View key={row.section} style={{
                flexDirection: 'row', paddingVertical: 7,
                borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: border,
              }}>
                <Text style={{ flex: 1, fontSize: 12, color: sub }}>{row.section}</Text>
                <Text style={{ fontSize: 12, color: text, fontWeight: '600' }}>{row.rps}</Text>
              </View>
            ))}
            <Text style={{ fontSize: 11, color: sub, marginTop: 8, lineHeight: 17 }}>
              At each section boundary, carry-over is capped at <Text style={{ fontWeight: '700' }}>±8 days</Text>. Any balance beyond ±8 is forfeited.
            </Text>
          </View>

          {/* §2.5.15.5 — Year-end rules */}
          <View style={{ backgroundColor: card, borderRadius: 12, borderWidth: 1, borderColor: border, padding: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#5B4FA8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              §2.5.15.5 — Year-End (RP 13 Close)
            </Text>
            <Text style={{ fontSize: 12, color: text, lineHeight: 18 }}>
              <Text style={{ fontWeight: '700' }}>Positive balance {'>'} +2:</Text> excess converts to annual leave.{'\n'}
              <Text style={{ fontWeight: '700' }}>Negative balance:</Text> written off — no clawback.
            </Text>
          </View>
        </View>

        {/* Add Entry button */}
        <View style={{ paddingHorizontal: 16, marginBottom: 4 }}>
          <SectionHeader title="Log a Duty" />
          {!showAdd ? (
            <TouchableOpacity
              onPress={() => setShowAdd(true)}
              style={{
                backgroundColor: '#D4840A', borderRadius: 12, padding: 14,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>Add Duty</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16, gap: 14 }}>
              {/* Destination picker */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: sub }}>Destination</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {DEST_OPTIONS.map(d => (
                    <TouchableOpacity
                      key={d.iata}
                      onPress={() => setSelectedIATA(d.iata)}
                      style={{
                        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                        backgroundColor: selectedIATA === d.iata ? '#D4840A' : bg,
                        borderWidth: 1, borderColor: selectedIATA === d.iata ? '#D4840A' : border,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: selectedIATA === d.iata ? '#FFFFFF' : text }}>
                        {d.iata}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={{ fontSize: 12, color: '#D4840A' }}>
                  Coefficient: {DEST_COEFFICIENTS[selectedIATA]}
                </Text>
              </View>

              {/* Days off rostered */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: sub }}>Days off rostered</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity onPress={() => setDaysRostered(Math.max(1, daysRostered - 1))} style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: bg, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20, color: text, lineHeight: 22 }}>−</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: text, width: 24, textAlign: 'center' }}>{daysRostered}</Text>
                  <TouchableOpacity onPress={() => setDaysRostered(Math.min(7, daysRostered + 1))} style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: bg, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20, color: text, lineHeight: 22 }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Notes */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: sub }}>Notes (optional)</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="e.g. Called off standby"
                  placeholderTextColor={sub}
                  style={{ backgroundColor: bg, borderRadius: 8, borderWidth: 1, borderColor: border, padding: 10, fontSize: 13, color: text }}
                />
              </View>

              {/* Preview */}
              <View style={{ backgroundColor: '#D4840A10', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#D4840A30' }}>
                <Text style={{ fontSize: 12, color: '#D4840A', fontWeight: '600' }}>
                  Effect: Coeff {DEST_COEFFICIENTS[selectedIATA]} − {daysRostered} days rostered = {(DEST_COEFFICIENTS[selectedIATA] - daysRostered).toFixed(1)} change to balance
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setShowAdd(false)}
                  style={{ flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: border }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: sub }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddEntry}
                  style={{ flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: '#D4840A' }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Save Entry</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Entry log */}
        {entries.length > 0 && (
          <>
            <SectionHeader title={`Log (${entries.length} entries)`} />
            <View style={{ paddingHorizontal: 16, gap: 8 }}>
              {[...entries].reverse().map((entry: CoefficientEntry) => {
                const effect = entry.coefficient - entry.daysOffRostered;
                const effectColor = effect > 0 ? '#1B6B3A' : effect < 0 ? '#B91C1C' : sub;
                return (
                  <View key={entry.id} style={{
                    backgroundColor: card, borderRadius: 12, borderWidth: 1, borderColor: border,
                    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
                  }}>
                    <View style={{
                      width: 44, height: 44, borderRadius: 10,
                      backgroundColor: '#D4840A20', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#D4840A' }}>{entry.iata}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: text }} numberOfLines={1}>{entry.destination}</Text>
                      <Text style={{ fontSize: 11, color: sub, marginTop: 2 }}>
                        Coeff {entry.coefficient} · {entry.daysOffRostered} days off rostered
                      </Text>
                      {entry.notes ? <Text style={{ fontSize: 11, color: sub, marginTop: 1 }}>{entry.notes}</Text> : null}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: effectColor }}>
                        {effect > 0 ? `+${effect.toFixed(1)}` : effect.toFixed(1)}
                      </Text>
                      <TouchableOpacity onPress={() => handleDelete(entry.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Trash2 size={14} color={sub} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {entries.length === 0 && !showAdd && (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: sub, textAlign: 'center', lineHeight: 21 }}>
              No duties logged yet. Tap "Add Duty" to start tracking your coefficient balance.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
