import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList, useColorScheme,
} from 'react-native';
import { ChevronDown, X, Check } from 'lucide-react-native';

interface Option<T extends string> {
  value: T;
  label: string;
  subtitle?: string;
}

interface DropdownPickerProps<T extends string> {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  accentColor?: string;
}

export function DropdownPicker<T extends string>({
  label, value, options, onChange, accentColor = '#2E6DB4',
}: DropdownPickerProps<T>) {
  const isDark = useColorScheme() === 'dark';
  const [open, setOpen] = useState(false);

  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';
  const modalBg = isDark ? '#0A1628' : '#F7F8FA';

  const selected = options.find(o => o.value === value);

  return (
    <>
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: sub }}>{label}</Text>
        <TouchableOpacity
          onPress={() => setOpen(true)}
          style={{
            backgroundColor: card, borderRadius: 10, borderWidth: 1, borderColor: border,
            padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: text }} numberOfLines={1}>
              {selected?.label ?? value}
            </Text>
            {selected?.subtitle && (
              <Text style={{ fontSize: 11, color: sub, marginTop: 2 }} numberOfLines={1}>{selected.subtitle}</Text>
            )}
          </View>
          <ChevronDown size={18} color={sub} />
        </TouchableOpacity>
      </View>

      <Modal visible={open} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={{ flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: modalBg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
            maxHeight: '80%',
          }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              padding: 20, borderBottomWidth: 0.5, borderBottomColor: border,
            }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: text }}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color={sub} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={o => o.value}
              contentContainerStyle={{ paddingBottom: 32 }}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    onPress={() => { onChange(item.value); setOpen(false); }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15,
                      backgroundColor: isSelected ? `${accentColor}15` : 'transparent',
                      gap: 12,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 15, fontWeight: isSelected ? '700' : '400',
                        color: isSelected ? accentColor : text,
                      }}>
                        {item.label}
                      </Text>
                      {item.subtitle && (
                        <Text style={{ fontSize: 12, color: sub, marginTop: 2 }}>{item.subtitle}</Text>
                      )}
                    </View>
                    {isSelected && <Check size={16} color={accentColor} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}
