import React from 'react';
import { View, TextInput, TouchableOpacity, useColorScheme } from 'react-native';
import { Search, X } from 'lucide-react-native';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchBar({ value, onChangeText, onClear, placeholder = 'Search rules, clauses…', autoFocus }: SearchBarProps) {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const textColor = isDark ? '#F1F5F9' : '#0A1628';
  const placeholderColor = isDark ? '#64748B' : '#94A3B8';

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: bg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
    }}>
      <Search size={16} color={placeholderColor} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        style={{ flex: 1, fontSize: 15, color: textColor, padding: 0 }}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={16} color={placeholderColor} />
        </TouchableOpacity>
      )}
    </View>
  );
}
