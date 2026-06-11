import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, useColorScheme, Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFleet, useSetFleet } from '../../hooks/useFleet';
import { useCoefficientStore } from '../../hooks/useCoefficient';
import { useBookmarkStore } from '../../hooks/useBookmarks';
import { FleetBadge } from '../../components/FleetBadge';
import { SectionHeader } from '../../components/SectionHeader';
import { ChevronRight, FileText, BookOpen, Info, AlertTriangle } from 'lucide-react-native';
import type { Fleet } from '../../lib/fleet';

function Row({
  label, value, onPress, isDark, danger, chevron = true,
}: {
  label: string; value?: string; onPress?: () => void; isDark: boolean; danger?: boolean; chevron?: boolean;
}) {
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';
  const labelColor = danger ? '#EF4444' : text;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 0.5, borderBottomColor: border,
      }}
    >
      <Text style={{ flex: 1, fontSize: 15, color: labelColor }}>{label}</Text>
      {value ? <Text style={{ fontSize: 14, color: sub, marginRight: chevron ? 8 : 0 }}>{value}</Text> : null}
      {chevron && onPress ? <ChevronRight size={16} color={sub} /> : null}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const isDark = useColorScheme() === 'dark';
  const fleet = useFleet();
  const setFleet = useSetFleet();
  const resetCoeff = useCoefficientStore(s => s.reset);
  const clearBookmarks = useBookmarkStore(s => s.clear);
  const router = useRouter();

  const bg = isDark ? '#0A1628' : '#F7F8FA';
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';

  function handleFleetSelect(f: Fleet) {
    if (f !== fleet) {
      setFleet(f);
    }
  }

  function handleResetCoeff() {
    Alert.alert(
      'Reset Coefficient Bank',
      'This will clear all coefficient log entries. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: resetCoeff },
      ]
    );
  }

  function handleClearBookmarks() {
    Alert.alert(
      'Clear All Bookmarks',
      'Remove all bookmarked clauses?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearBookmarks },
      ]
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Fleet selector */}
        <SectionHeader title="Your Fleet" />
        <View style={{ paddingHorizontal: 16 }}>
          <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
            <View style={{ padding: 16, gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {/* WB option */}
                <TouchableOpacity
                  onPress={() => handleFleetSelect('wb')}
                  style={{
                    flex: 1, borderRadius: 12, borderWidth: 2,
                    borderColor: fleet === 'wb' ? '#1E3A5F' : border,
                    backgroundColor: fleet === 'wb' ? '#1E3A5F10' : 'transparent',
                    padding: 14, alignItems: 'center', gap: 4,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '800', color: fleet === 'wb' ? '#1E3A5F' : text }}>A330</Text>
                  <Text style={{ fontSize: 12, color: fleet === 'wb' ? '#1E3A5F' : sub, fontWeight: '600' }}>Widebody</Text>
                  <Text style={{ fontSize: 11, color: fleet === 'wb' ? '#1E3A5F80' : sub }}>WC 2025</Text>
                  {fleet === 'wb' && (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#1E3A5F', marginTop: 4 }} />
                  )}
                </TouchableOpacity>

                {/* A320 option */}
                <TouchableOpacity
                  onPress={() => handleFleetSelect('a320')}
                  style={{
                    flex: 1, borderRadius: 12, borderWidth: 2,
                    borderColor: fleet === 'a320' ? '#0E4B5A' : border,
                    backgroundColor: fleet === 'a320' ? '#0E4B5A10' : 'transparent',
                    padding: 14, alignItems: 'center', gap: 4,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '800', color: fleet === 'a320' ? '#0E4B5A' : text }}>A320/Neo</Text>
                  <Text style={{ fontSize: 12, color: fleet === 'a320' ? '#0E4B5A' : sub, fontWeight: '600' }}>Narrowbody</Text>
                  <Text style={{ fontSize: 11, color: fleet === 'a320' ? '#0E4B5A80' : sub }}>WC May 2018</Text>
                  {fleet === 'a320' && (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#0E4B5A', marginTop: 4 }} />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 12, color: sub, textAlign: 'center' }}>
                All rules and calculators update automatically when you switch.
              </Text>
            </View>
          </View>
        </View>

        {/* Documents */}
        <SectionHeader title="Documents" />
        <View style={{ paddingHorizontal: 16 }}>
          <View style={{ backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
            <Row
              label="Widebody WC 2025 (A330)"
              value="Open PDF"
              onPress={() => router.push('/document')}
              isDark={isDark}
            />
            <Row
              label="A320/Neo WC May 2018"
              value="Open PDF"
              onPress={() => router.push('/document')}
              isDark={isDark}
            />
            <Row
              label="EASA ORO.FTL Reference"
              value="Rules browser"
              onPress={() => router.push('/rules')}
              isDark={isDark}
            />
          </View>
        </View>

        {/* Preferences */}
        <SectionHeader title="Preferences" />
        <View style={{ paddingHorizontal: 16 }}>
          <View style={{ backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: border }}>
              <Text style={{ flex: 1, fontSize: 15, color: text }}>Theme</Text>
              <Text style={{ fontSize: 14, color: sub }}>System</Text>
            </View>
            {fleet === 'wb' && (
              <Row label="Reset Coefficient Bank" onPress={handleResetCoeff} isDark={isDark} danger />
            )}
            <Row
              label="Clear All Bookmarks"
              onPress={handleClearBookmarks}
              isDark={isDark}
              danger
            />
          </View>
        </View>

        {/* About */}
        <SectionHeader title="About" />
        <View style={{ paddingHorizontal: 16 }}>
          <View style={{ backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
            <Row label="App version" value="1.0.0" isDark={isDark} chevron={false} />
            <Row label="Widebody WC" value="2025 (signed 10/09/2025)" isDark={isDark} chevron={false} />
            <Row label="A320 WC" value="May 2018" isDark={isDark} chevron={false} />
            <Row label="EASA regulation" value="EU 965/2012 (EU 83/2014)" isDark={isDark} chevron={false} />
          </View>
        </View>

        {/* Disclaimer */}
        <View style={{ margin: 16, marginTop: 20 }}>
          <View style={{
            backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: '#D4840A40',
            padding: 16, gap: 8,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} color="#D4840A" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#D4840A' }}>Disclaimer</Text>
            </View>
            <Text style={{ fontSize: 12, color: sub, lineHeight: 19 }}>
              This app is an unofficial reference tool for informational purposes only. It is not a substitute
              for the official Working Conditions agreements, EASA ORO.FTL regulations, or advice from IALPA.
              Always verify against the current official documents. In the event of any discrepancy between
              this app and the official working conditions or EASA regulations, the official documents prevail.
            </Text>
            <Text style={{ fontSize: 11, color: sub, lineHeight: 17 }}>
              A330 Widebody Working Conditions 2025 (signed 10/09/2025) ·
              A320/321/(Neo) Working Conditions May 2018 ·
              EASA EU 965/2012 as amended by EU 83/2014.
            </Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
