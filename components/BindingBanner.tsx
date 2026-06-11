import React from 'react';
import { View, Text } from 'react-native';

interface BindingBannerProps {
  value: string;
  ref_: string;
  source: 'easa' | 'wc';
  label?: string;
}

export function BindingBanner({ value, ref_, source, label }: BindingBannerProps) {
  return (
    <View style={{
      borderRadius: 10, padding: 12,
      backgroundColor: '#D4840A18',
      borderWidth: 1, borderColor: '#D4840A',
    }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#D4840A', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label ?? `Binding — ${source === 'easa' ? 'EASA' : 'Working Conditions'}`}
      </Text>
      <Text style={{ fontSize: 26, fontWeight: '800', color: '#D4840A', marginTop: 2 }}>{value}</Text>
      <Text style={{ fontSize: 11, color: '#D4840A80', marginTop: 2 }}>{ref_}</Text>
    </View>
  );
}
