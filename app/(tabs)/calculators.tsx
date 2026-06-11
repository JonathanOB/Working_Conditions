import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { useFleet } from '../../hooks/useFleet';
import { FleetBadge } from '../../components/FleetBadge';
import { SectionHeader } from '../../components/SectionHeader';
import {
  Clock, Calendar, MapPin, Radio, Zap, TrendingUp, DollarSign, Award, ChevronRight,
} from 'lucide-react-native';

const TOOLS = [
  {
    id: 'fdp',
    label: 'FDP Calculator',
    description: 'Maximum flight duty period from report time, sectors, and duty type. Shows EASA Table 1 vs Working Conditions binding limit.',
    icon: Clock,
    color: '#2E6DB4',
    fleets: ['wb', 'a320'],
  },
  {
    id: 'rest',
    label: 'Rest Checker',
    description: 'Pre- and post-duty minimum rest periods. Covers intercontinental, continental, TTN, and standby scenarios.',
    icon: Calendar,
    color: '#5B4FA8',
    fleets: ['wb', 'a320'],
  },
  {
    id: 'days-off',
    label: 'Days Off',
    description: 'WB: Coefficient-based days off and bank balance. A320: Overnight-count system with back-to-back TA rules.',
    icon: Calendar,
    color: '#0E4B5A',
    fleets: ['wb', 'a320'],
  },
  {
    id: 'route',
    label: 'Route Lookup',
    description: 'Widebody destination rules: max FDP, stick time, coefficient, days off, and special clauses by destination.',
    icon: MapPin,
    color: '#1B6B3A',
    fleets: ['wb'],
  },
  {
    id: 'standby',
    label: 'Standby Decoder',
    description: 'STBH / STBB / STBA / K-duty rules: FDP credit, elapsed limits, rest required, and coverage restrictions.',
    icon: Radio,
    color: '#7C2D12',
    fleets: ['wb', 'a320'],
  },
  {
    id: 'delay',
    label: 'Delay Tool',
    description: 'Delay impact on FDP recalculation, TTN triggers, days-off infringement, and compensation rates.',
    icon: Zap,
    color: '#B91C1C',
    fleets: ['wb', 'a320'],
  },
  {
    id: 'coefficient',
    label: 'Coefficient Bank',
    description: 'Track your widebody coefficient balance across sections. Log duties, view carry-over limits, and year-end rules.',
    icon: TrendingUp,
    color: '#D4840A',
    fleets: ['wb'],
  },
  {
    id: 'owc',
    label: 'OWC Calculator',
    description: 'Calculate Outside Working Conditions payments — free days, gash days, agreed duties, and short rest infringements.',
    icon: DollarSign,
    color: '#1B6B3A',
    fleets: ['wb', 'a320'],
  },
  {
    id: 'perf',
    label: 'Performance Pay',
    description: 'Calculate performance pay based on block hours flown per roster period against your contracted threshold.',
    icon: Award,
    color: '#0369A1',
    fleets: ['wb', 'a320'],
  },
];

export default function CalculatorsScreen() {
  const isDark = useColorScheme() === 'dark';
  const fleet = useFleet();
  const router = useRouter();

  const bg = isDark ? '#0A1628' : '#F7F8FA';
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';

  const available = TOOLS.filter(t => t.fleets.includes(fleet));
  const wbOnly = TOOLS.filter(t => !t.fleets.includes(fleet));

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, color: sub }}>Active fleet</Text>
          <FleetBadge fleet={fleet} />
        </View>

        <SectionHeader title="Available Tools" />

        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {available.map(tool => {
            const Icon = tool.icon;
            return (
              <TouchableOpacity
                key={tool.id}
                onPress={() => router.push(`/calculators/${tool.id}` as any)}
                style={{
                  backgroundColor: card, borderRadius: 14,
                  borderWidth: 1, borderColor: border,
                  padding: 16, flexDirection: 'row', gap: 14, alignItems: 'center',
                }}
              >
                <View style={{
                  width: 44, height: 44, borderRadius: 12,
                  backgroundColor: `${tool.color}20`,
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={22} color={tool.color} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: text }}>{tool.label}</Text>
                  <Text style={{ fontSize: 12, color: sub, lineHeight: 17 }}>{tool.description}</Text>
                </View>
                <ChevronRight size={16} color={sub} />
              </TouchableOpacity>
            );
          })}
        </View>

        {wbOnly.length > 0 && (
          <>
            <SectionHeader title="Widebody Only" subtitle="Switch to A330 fleet in Settings to enable" />
            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              {wbOnly.map(tool => {
                const Icon = tool.icon;
                return (
                  <View
                    key={tool.id}
                    style={{
                      backgroundColor: card, borderRadius: 14,
                      borderWidth: 1, borderColor: border,
                      padding: 16, flexDirection: 'row', gap: 14, alignItems: 'center',
                      opacity: 0.45,
                    }}
                  >
                    <View style={{
                      width: 44, height: 44, borderRadius: 12,
                      backgroundColor: `${tool.color}20`,
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon size={22} color={tool.color} />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: text }}>{tool.label}</Text>
                      <Text style={{ fontSize: 12, color: sub, lineHeight: 17 }}>{tool.description}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
