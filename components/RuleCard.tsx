import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AlertTriangle, Info } from 'lucide-react-native';

interface RuleCardProps {
  easaValue: string;
  easaRef: string;
  wcValue: string;
  wcRef: string;
  bindingSource: 'easa' | 'wc';
  warnings?: string[];
  onPressEasa?: () => void;
  onPressWC?: () => void;
}

export function RuleCard({ easaValue, easaRef, wcValue, wcRef, bindingSource, warnings = [], onPressEasa, onPressWC }: RuleCardProps) {
  const bindingValue = bindingSource === 'easa' ? easaValue : wcValue;
  const bindingRef   = bindingSource === 'easa' ? easaRef   : wcRef;

  return (
    <View style={{ gap: 8 }}>
      {/* Two-column layer cards */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {/* EASA card */}
        <TouchableOpacity
          onPress={onPressEasa}
          disabled={!onPressEasa}
          activeOpacity={onPressEasa ? 0.7 : 1}
          style={{
            flex: 1, borderRadius: 12, padding: 12, gap: 4,
            backgroundColor: bindingSource === 'easa' ? '#2E6DB418' : '#2E6DB408',
            borderWidth: bindingSource === 'easa' ? 1.5 : 0.5,
            borderColor: '#2E6DB4',
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#2E6DB4', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              EASA
            </Text>
            {onPressEasa && <Info size={12} color="#2E6DB4" />}
          </View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#2E6DB4' }}>{easaValue}</Text>
          <Text style={{ fontSize: 11, color: '#60A5FA', lineHeight: 16 }} numberOfLines={2}>{easaRef}</Text>
        </TouchableOpacity>

        {/* WC card */}
        <TouchableOpacity
          onPress={onPressWC}
          disabled={!onPressWC}
          activeOpacity={onPressWC ? 0.7 : 1}
          style={{
            flex: 1, borderRadius: 12, padding: 12, gap: 4,
            backgroundColor: bindingSource === 'wc' ? '#5B4FA818' : '#5B4FA808',
            borderWidth: bindingSource === 'wc' ? 1.5 : 0.5,
            borderColor: '#5B4FA8',
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#5B4FA8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Working Conditions
            </Text>
            {onPressWC && <Info size={12} color="#5B4FA8" />}
          </View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#5B4FA8' }}>{wcValue}</Text>
          <Text style={{ fontSize: 11, color: '#A78BFA', lineHeight: 16 }} numberOfLines={2}>{wcRef}</Text>
        </TouchableOpacity>
      </View>

      {/* Amber binding banner */}
      <View style={{
        borderRadius: 10, padding: 12,
        backgroundColor: '#D4840A18',
        borderWidth: 1, borderColor: '#D4840A',
      }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: '#D4840A', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Binding — {bindingSource === 'easa' ? 'EASA' : 'Working Conditions'}
        </Text>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#D4840A', marginTop: 2 }}>{bindingValue}</Text>
        <Text style={{ fontSize: 11, color: '#D4840A80', marginTop: 2 }}>{bindingRef}</Text>
      </View>

      {/* Warnings */}
      {warnings.map((w, i) => (
        <View key={i} style={{
          flexDirection: 'row', alignItems: 'flex-start', gap: 8,
          backgroundColor: '#7C2D1218', borderRadius: 8, padding: 10,
          borderWidth: 0.5, borderColor: '#B91C1C50',
        }}>
          <AlertTriangle size={14} color="#FCA5A5" style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontSize: 13, color: '#FCA5A5', lineHeight: 19 }}>{w}</Text>
        </View>
      ))}
    </View>
  );
}
