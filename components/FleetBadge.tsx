import React from 'react';
import { View, Text } from 'react-native';
import type { Fleet } from '../lib/fleet';

interface FleetBadgeProps {
  fleet: Fleet;
  size?: 'sm' | 'md';
}

export function FleetBadge({ fleet, size = 'md' }: FleetBadgeProps) {
  const isWB = fleet === 'wb';
  const fontSize = size === 'sm' ? 10 : 11;
  const px = size === 'sm' ? 6 : 8;
  const py = size === 'sm' ? 2 : 3;

  return (
    <View style={{
      backgroundColor: isWB ? '#1E3A5F' : '#0E4B5A',
      borderRadius: 6,
      paddingHorizontal: px,
      paddingVertical: py,
    }}>
      <Text style={{
        color: isWB ? '#93C5FD' : '#67E8F9',
        fontSize,
        fontWeight: '700',
        letterSpacing: 0.5,
      }}>
        {isWB ? 'A330 · WB' : 'A320/Neo · NB'}
      </Text>
    </View>
  );
}
