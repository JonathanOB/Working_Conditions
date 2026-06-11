import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useFleet } from '../hooks/useFleet';

interface ClauseRefProps {
  id: string;
  label?: string;
  color?: string;
}

export function ClauseRef({ id, label, color = '#2E6DB4' }: ClauseRefProps) {
  const router = useRouter();
  const fleet = useFleet();

  const ruleId = fleet === 'a320' && !id.startsWith('a320-') && !id.startsWith('ORO')
    ? `a320-${id}`
    : id;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/rule/${ruleId}`)}
      style={{
        backgroundColor: `${color}18`,
        borderRadius: 5,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderWidth: 0.5,
        borderColor: `${color}60`,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color }}>{label ?? `§${id}`}</Text>
    </TouchableOpacity>
  );
}
