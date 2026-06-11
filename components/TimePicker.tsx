import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList,
  useColorScheme, Platform, StatusBar,
} from 'react-native';
import { Clock, X } from 'lucide-react-native';

interface TimePickerProps {
  label: string;
  hour: number;
  onHourChange: (h: number) => void;
  highlightWOCL?: boolean;
}

export function TimePicker({ label, hour, onHourChange, highlightWOCL }: TimePickerProps) {
  const isDark = useColorScheme() === 'dark';
  const [open, setOpen] = useState(false);

  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';
  const modalBg = isDark ? '#0A1628' : '#F7F8FA';

  const isWOCL = highlightWOCL && hour >= 2 && hour < 6;

  return (
    <>
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: sub }}>{label}</Text>
        <TouchableOpacity
          onPress={() => setOpen(true)}
          style={{
            backgroundColor: card, borderRadius: 10, borderWidth: 1,
            borderColor: isWOCL ? '#B91C1C60' : border,
            padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
          }}
        >
          <Clock size={16} color={isWOCL ? '#FCA5A5' : '#2E6DB4'} />
          <Text style={{ flex: 1, fontSize: 22, fontWeight: '700', color: isWOCL ? '#FCA5A5' : text }}>
            {hour.toString().padStart(2, '0')}:00
          </Text>
          <Text style={{ fontSize: 12, color: sub }}>tap to change</Text>
        </TouchableOpacity>
        {highlightWOCL && isWOCL && (
          <Text style={{ fontSize: 11, color: '#FCA5A5' }}>⚠ WOCL hour — reduced FDP may apply</Text>
        )}
      </View>

      <Modal visible={open} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={{ flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: modalBg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
            maxHeight: '75%',
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
              data={Array.from({ length: 24 }, (_, i) => i)}
              keyExtractor={i => String(i)}
              contentContainerStyle={{ paddingBottom: 32 }}
              renderItem={({ item: h }) => {
                const selected = h === hour;
                const wocl = highlightWOCL && h >= 2 && h < 6;
                return (
                  <TouchableOpacity
                    onPress={() => { onHourChange(h); setOpen(false); }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14,
                      backgroundColor: selected ? '#2E6DB420' : 'transparent',
                    }}
                  >
                    <Text style={{
                      flex: 1, fontSize: 20, fontWeight: selected ? '700' : '400',
                      color: selected ? '#2E6DB4' : wocl ? '#FCA5A5' : text,
                    }}>
                      {h.toString().padStart(2, '0')}:00
                    </Text>
                    {wocl && <Text style={{ fontSize: 11, color: '#FCA5A580' }}>WOCL</Text>}
                    {selected && (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2E6DB4', marginLeft: 10 }} />
                    )}
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
