import React from 'react';
import { View, Text, useColorScheme } from 'react-native';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  accent?: string;
}

export function SectionHeader({ title, subtitle, accent }: SectionHeaderProps) {
  const isDark = useColorScheme() === 'dark';
  const color = accent ?? (isDark ? '#93C5FD' : '#2E6DB4');

  return (
    <View style={{ marginTop: 24, marginBottom: 8, paddingHorizontal: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ fontSize: 12, color: isDark ? '#64748B' : '#94A3B8', marginTop: 2 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
