import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, BackHandler } from 'react-native';
import { useNavigation, useFocusEffect } from 'expo-router';
import { useFleet } from '../../hooks/useFleet';
import { FleetBadge } from '../../components/FleetBadge';
import { SectionHeader } from '../../components/SectionHeader';
import { ClauseRef } from '../../components/ClauseRef';
import { formatHM } from '../../lib/calculators-easa';
import { MapPin, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react-native';

const destinations = require('../../data/wb/destinations.json');

const REGIONS: Record<string, string> = {
  'transatlantic-core': 'Transatlantic Core',
  'west-coast': 'West Coast (Augmented)',
  'special': 'Special Routes',
};

function InfoRow({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: border }}>
      <Text style={{ flex: 1, fontSize: 14, color: sub }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: text }}>{value}</Text>
    </View>
  );
}

export default function RouteScreen() {
  const isDark = useColorScheme() === 'dark';
  const fleet = useFleet();
  const [selected, setSelected] = useState<any>(null);
  const navigation = useNavigation();

  // Override header back button when a destination is selected (iOS)
  useEffect(() => {
    if (selected) {
      navigation.setOptions({
        title: selected.iata,
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => setSelected(null)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingRight: 8 }}
          >
            <ChevronLeft size={20} color="#2E6DB4" />
            <Text style={{ color: '#2E6DB4', fontSize: 16 }}>Routes</Text>
          </TouchableOpacity>
        ),
      });
    } else {
      navigation.setOptions({ title: 'Route Lookup', headerLeft: undefined });
    }
  }, [selected]);

  // Intercept Android hardware back when detail is open
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (selected) { setSelected(null); return true; }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [selected])
  );

  const bg = isDark ? '#0A1628' : '#F7F8FA';
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';

  if (fleet !== 'wb') {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <MapPin size={48} color={sub} />
        <Text style={{ fontSize: 17, fontWeight: '700', color: text, marginTop: 16, textAlign: 'center' }}>
          Widebody Only
        </Text>
        <Text style={{ fontSize: 14, color: sub, marginTop: 8, textAlign: 'center', lineHeight: 21 }}>
          Route lookup is only available for the A330 widebody fleet. Switch fleets in Settings.
        </Text>
      </View>
    );
  }

  const byRegion = destinations.reduce((acc: any, d: any) => {
    if (!acc[d.region]) acc[d.region] = [];
    acc[d.region].push(d);
    return acc;
  }, {});

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MapPin size={20} color='#1B6B3A' />
            <Text style={{ fontSize: 17, fontWeight: '700', color: text }}>Route Lookup</Text>
          </View>
          <FleetBadge fleet={fleet} size="sm" />
        </View>

        {/* Destination grid */}
        {!selected && Object.entries(byRegion).map(([region, dests]: [string, any]) => (
          <View key={region}>
            <SectionHeader title={REGIONS[region] ?? region} />
            <View style={{ paddingHorizontal: 16, gap: 8 }}>
              {dests.map((d: any) => (
                <TouchableOpacity
                  key={d.iata}
                  onPress={() => setSelected(d)}
                  style={{
                    backgroundColor: card, borderRadius: 12, borderWidth: 1, borderColor: border,
                    padding: 14, flexDirection: 'row', alignItems: 'center',
                  }}
                >
                  <View style={{
                    width: 48, height: 36, borderRadius: 8,
                    backgroundColor: d.crewType === 'augmented' ? '#D4840A20' : '#2E6DB420',
                    alignItems: 'center', justifyContent: 'center', marginRight: 12,
                  }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: d.crewType === 'augmented' ? '#D4840A' : '#2E6DB4' }}>
                      {d.iata}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: text }}>{d.name}</Text>
                    <Text style={{ fontSize: 11, color: sub, marginTop: 1 }}>
                      {d.crewType === 'augmented' ? 'AUGMENTED · ' : ''}
                      Coeff {d.coefficient} · {d.daysOff} days off
                    </Text>
                  </View>
                  <ChevronRight size={14} color={sub} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Detail view */}
        {selected && (
          <View style={{ padding: 16 }}>
            <TouchableOpacity
              onPress={() => setSelected(null)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}
            >
              <ChevronRight size={16} color='#2E6DB4' style={{ transform: [{ rotate: '180deg' }] }} />
              <Text style={{ fontSize: 14, color: '#2E6DB4', fontWeight: '600' }}>All Routes</Text>
            </TouchableOpacity>

            {/* Header */}
            <View style={{
              backgroundColor: selected.crewType === 'augmented' ? '#D4840A' : '#1E3A5F',
              borderRadius: 16, padding: 20, marginBottom: 12,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 32, fontWeight: '800', color: '#FFFFFF' }}>{selected.iata}</Text>
                  <Text style={{ fontSize: 15, color: '#FFFFFF80', marginTop: 2 }}>{selected.name}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={{ backgroundColor: '#FFFFFF20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                      {selected.crewType === 'augmented' ? 'AUGMENTED' : 'STANDARD'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Details */}
            <View style={{ backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border, padding: 16 }}>
              <InfoRow label="Max FDP" value={`${selected.maxFDPHours}h`} isDark={isDark} />
              <InfoRow label="Days off required" value={`${selected.daysOff} days`} isDark={isDark} />
              <InfoRow label="Coefficient" value={String(selected.coefficient)} isDark={isDark} />
              {selected.coeffBankCredit > 0 && (
                <InfoRow label="Coefficient bank credit" value={`+${selected.coeffBankCredit}`} isDark={isDark} />
              )}
              <InfoRow label="Min outstation rest" value={`${selected.outstationRestMin}h`} isDark={isDark} />
              <InfoRow label="Max landings (standard)" value={String(selected.maxLandings.standard ?? selected.maxLandings.augmented ?? '—')} isDark={isDark} />
              <InfoRow label="Max landings (eastbound)" value={String(selected.maxLandings.eastbound)} isDark={isDark} />

              {/* Stick time */}
              {selected.stickTime && (
                <>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#2E6DB4', textTransform: 'uppercase', marginTop: 12, marginBottom: 6 }}>Stick Time</Text>
                  {selected.stickTime.wbSingle && <InfoRow label="Single sector WB" value={`${selected.stickTime.wbSingle}h`} isDark={isDark} />}
                  {selected.stickTime.ebSingle && <InfoRow label="Single sector EB" value={`${selected.stickTime.ebSingle}h`} isDark={isDark} />}
                  {selected.stickTime.wbMulti && <InfoRow label="Multi-sector WB" value={`${selected.stickTime.wbMulti}h`} isDark={isDark} />}
                  {selected.stickTime.ebMulti && <InfoRow label="Multi-sector EB" value={`${selected.stickTime.ebMulti}h`} isDark={isDark} />}
                  {selected.stickTime.note && (
                    <Text style={{ fontSize: 11, color: sub, marginTop: 4, lineHeight: 17 }}>{selected.stickTime.note}</Text>
                  )}
                </>
              )}

              {/* Notes & special rules */}
              {selected.notes && (
                <Text style={{ fontSize: 13, color: sub, marginTop: 12, lineHeight: 19 }}>{selected.notes}</Text>
              )}

              {selected.specialRules?.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  <Text style={{ fontSize: 12, color: sub, marginRight: 4 }}>Special clauses:</Text>
                  {selected.specialRules.map((r: string) => (
                    <ClauseRef key={r} id={r} />
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
