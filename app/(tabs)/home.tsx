import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, useColorScheme,
  StyleSheet, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFleet } from '../../hooks/useFleet';
import { useSearch } from '../../hooks/useSearch';
import { FleetBadge } from '../../components/FleetBadge';
import { SearchBar } from '../../components/SearchBar';
import {
  Calculator, Clock, Calendar, MapPin, Radio, Zap, TrendingUp,
  AlertTriangle, BookOpen, FileText, ChevronRight, DollarSign, Award,
} from 'lucide-react-native';

const CALCULATORS_WB = [
  { id: 'fdp',         label: 'FDP',          subtitle: 'Max flight duty',        icon: Clock,        color: '#2E6DB4' },
  { id: 'rest',        label: 'Rest',          subtitle: 'Min rest periods',       icon: Calendar,     color: '#5B4FA8' },
  { id: 'days-off',    label: 'Days Off',      subtitle: 'Days off & coefficient', icon: Calendar,     color: '#0E4B5A' },
  { id: 'route',       label: 'Route',         subtitle: 'WB destinations',        icon: MapPin,       color: '#1B6B3A' },
  { id: 'standby',     label: 'Standby',       subtitle: 'STBH / STBB',            icon: Radio,        color: '#7C2D12' },
  { id: 'delay',       label: 'Delay',         subtitle: 'Disruption impact',      icon: Zap,          color: '#B91C1C' },
  { id: 'coefficient', label: 'Coefficient',   subtitle: 'Running balance',        icon: TrendingUp,   color: '#D4840A' },
  { id: 'owc',         label: 'OWC',           subtitle: 'Outside WC payment',     icon: DollarSign,   color: '#1B6B3A' },
  { id: 'perf',        label: 'Perf Pay',      subtitle: 'Performance hours',      icon: Award,        color: '#0369A1' },
];
const CALCULATORS_A320 = CALCULATORS_WB.filter(c => !['route', 'coefficient'].includes(c.id));

const QUICK_REFS = [
  { label: 'WOCL Window', clause: '02:00–05:59 local', tag: 'wocl' },
  { label: 'Max FDP (WB Std)', clause: '§2.15.1 — 12h', tag: 'fdp' },
  { label: 'Pre-Intercontinental Rest', clause: '§2.22.2 — 15h', tag: 'rest' },
  { label: 'OWC Rates', clause: '§3.14.1', tag: 'compensation' },
];

export default function HomeScreen() {
  const isDark = useColorScheme() === 'dark';
  const fleet = useFleet();
  const router = useRouter();
  const { query, results, search, clear } = useSearch();
  const [inWOCL, setInWOCL] = useState(false);

  useEffect(() => {
    const check = () => {
      const h = new Date().getHours();
      setInWOCL(h >= 2 && h < 6);
    };
    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, []);

  const calculators = fleet === 'wb' ? CALCULATORS_WB : CALCULATORS_A320;
  const bg = isDark ? '#0A1628' : '#F7F8FA';
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* WOCL Banner */}
      {inWOCL && (
        <View style={{ backgroundColor: '#B91C1C', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} color="#FEF2F2" />
          <Text style={{ color: '#FEF2F2', fontWeight: '700', fontSize: 13 }}>WOCL ACTIVE — 02:00–05:59 local</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: text }}>PilotRules</Text>
              <Text style={{ fontSize: 13, color: sub, marginTop: 1 }}>
                {fleet === 'wb' ? 'WC 2025 · A330 Widebody' : 'WC May 2018 · A320/321/(Neo)'}
              </Text>
            </View>
            <FleetBadge fleet={fleet} />
          </View>

          <SearchBar value={query} onChangeText={search} onClear={clear} />

          {/* Search results */}
          {results.length > 0 && (
            <View style={{ backgroundColor: card, borderRadius: 12, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
              {results.slice(0, 8).map(({ item }, i) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => { clear(); router.push(`/rule/${item.id}`); }}
                  style={{
                    padding: 12, borderBottomWidth: i < Math.min(results.length, 8) - 1 ? 0.5 : 0,
                    borderBottomColor: border, flexDirection: 'row', alignItems: 'center', gap: 10,
                  }}
                >
                  <View style={{
                    width: 32, height: 32, borderRadius: 6,
                    backgroundColor: item.fleet === 'easa' ? '#2E6DB418' : '#5B4FA818',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: item.fleet === 'easa' ? '#2E6DB4' : '#5B4FA8' }}>
                      {item.fleet === 'easa' ? 'EASA' : 'WC'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: text }} numberOfLines={1}>{item.title}</Text>
                    <Text style={{ fontSize: 11, color: sub, marginTop: 1 }} numberOfLines={1}>{item.id}</Text>
                  </View>
                  <ChevronRight size={14} color={sub} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          {query.length >= 2 && results.length === 0 && (
            <Text style={{ color: sub, fontSize: 13, textAlign: 'center', paddingVertical: 8 }}>No results for "{query}"</Text>
          )}
        </View>

        {/* Calculator grid */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#2E6DB4', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
            Calculators
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {calculators.map(calc => {
              const Icon = calc.icon;
              return (
                <TouchableOpacity
                  key={calc.id}
                  onPress={() => router.push(`/calculators/${calc.id}` as any)}
                  style={{
                    width: '47%', backgroundColor: card, borderRadius: 14,
                    borderWidth: 1, borderColor: border, padding: 14, gap: 8,
                  }}
                >
                  <View style={{
                    width: 38, height: 38, borderRadius: 10,
                    backgroundColor: `${calc.color}20`, alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={20} color={calc.color} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: text }}>{calc.label}</Text>
                    <Text style={{ fontSize: 11, color: sub, marginTop: 1 }}>{calc.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Quick reference */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#2E6DB4', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
            Quick Reference
          </Text>
          <View style={{ backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
            {QUICK_REFS.map((ref, i) => (
              <View key={ref.tag} style={{
                flexDirection: 'row', alignItems: 'center', padding: 14,
                borderBottomWidth: i < QUICK_REFS.length - 1 ? 0.5 : 0,
                borderBottomColor: border,
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: text }}>{ref.label}</Text>
                  <Text style={{ fontSize: 12, color: '#2E6DB4', marginTop: 1 }}>{ref.clause}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => router.push('/document')}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 }}
            >
              <FileText size={16} color='#2E6DB4' />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#2E6DB4' }}>
                View {fleet === 'wb' ? 'WC 2025 PDF' : 'WC May 2018 PDF'}
              </Text>
              <ChevronRight size={14} color='#2E6DB4' style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <Text style={{ textAlign: 'center', color: sub, fontSize: 11, marginTop: 24, paddingHorizontal: 16 }}>
          {fleet === 'wb'
            ? 'Widebody WC 2025 · signed 10/09/2025'
            : 'A320/321/(Neo) WC May 2018'}
          {' · EASA EU 965/2012'}
        </Text>
      </ScrollView>
    </View>
  );
}
