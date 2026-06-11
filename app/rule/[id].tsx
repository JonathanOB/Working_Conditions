import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, useColorScheme, Share,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useFleet } from '../../hooks/useFleet';
import { useIsBookmarked, useToggleBookmark } from '../../hooks/useBookmarks';
import { getRuleById } from '../../lib/search';
import { ClauseRef } from '../../components/ClauseRef';
import {
  Bookmark, BookmarkCheck, FileText, Tag, Hash,
  Calculator, ChevronRight, AlertTriangle, Info,
} from 'lucide-react-native';
import { useEffect } from 'react';

const CALCULATOR_LINKS: Array<{
  label: string;
  route: string;
  matchTags: string[];
  fleets?: ('wb' | 'a320')[];
}> = [
  { label: 'FDP Calculator', route: '/calculators/fdp', matchTags: ['fdp', 'easa-table-1'] },
  { label: 'Rest Checker', route: '/calculators/rest', matchTags: ['rest', 'minimum-rest'] },
  { label: 'Days Off', route: '/calculators/days-off', matchTags: ['days-off', 'free-days'] },
  { label: 'Standby Decoder', route: '/calculators/standby', matchTags: ['standby', 'stbh', 'stbb', 'stba', 'k-duty'] },
  { label: 'Delay Tool', route: '/calculators/delay', matchTags: ['delay', 'owc'] },
  { label: 'Route Lookup', route: '/calculators/route', matchTags: ['stick-time', 'coefficient', 'augmented'], fleets: ['wb'] },
  { label: 'Coefficient Bank', route: '/calculators/coefficient', matchTags: ['coefficient', 'coefficient-bank'], fleets: ['wb'] },
];

function SourceBadge({ source, isDark }: { source: 'easa' | 'wb' | 'a320'; isDark: boolean }) {
  const configs = {
    easa: { bg: '#1E3A5F', text: '#93C5FD', label: 'EASA ORO.FTL' },
    wb: { bg: '#0F2B5B', text: '#60A5FA', label: 'A330 · WC 2025' },
    a320: { bg: '#0E4B5A', text: '#67E8F9', label: 'A320/Neo · WC May 2018' },
  };
  const c = configs[source];
  return (
    <View style={{
      backgroundColor: c.bg, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
    }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: c.text, letterSpacing: 0.4 }}>{c.label}</Text>
    </View>
  );
}

function TagChip({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <View style={{
      backgroundColor: isDark ? '#1E293B' : '#EFF6FF',
      borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3,
      borderWidth: 0.5, borderColor: isDark ? '#334155' : '#BFDBFE',
    }}>
      <Text style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#3B82F6' }}>{label}</Text>
    </View>
  );
}

export default function RuleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useColorScheme() === 'dark';
  const fleet = useFleet();
  const router = useRouter();
  const navigation = useNavigation();

  const rule = id ? getRuleById(id, fleet) : undefined;
  const isBookmarked = useIsBookmarked(id ?? '');
  const toggle = useToggleBookmark();

  const bg = isDark ? '#0A1628' : '#F7F8FA';
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';

  // Update nav title dynamically
  useEffect(() => {
    if (rule) {
      navigation.setOptions({ title: rule.id });
    }
  }, [rule?.id]);

  if (!rule) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Info size={40} color={sub} />
        <Text style={{ fontSize: 16, fontWeight: '700', color: text, marginTop: 16, textAlign: 'center' }}>
          Rule not found
        </Text>
        <Text style={{ fontSize: 13, color: sub, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
          Clause "{id}" was not found in the {fleet === 'wb' ? 'A330' : 'A320/Neo'} data set.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 20, padding: 12, backgroundColor: '#2E6DB4', borderRadius: 10 }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const source = rule.fleet === 'easa' ? 'easa' : fleet === 'wb' ? 'wb' : 'a320';

  const applicableCalculators = CALCULATOR_LINKS.filter(c => {
    if (c.fleets && !c.fleets.includes(fleet as 'wb' | 'a320')) return false;
    return c.matchTags.some(t => rule.tags.includes(t));
  });

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {/* Header card */}
        <View style={{
          backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border,
          padding: 20, gap: 12,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <SourceBadge source={source} isDark={isDark} />
            <TouchableOpacity
              onPress={() => toggle(rule.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                backgroundColor: isBookmarked ? '#D4840A20' : (isDark ? '#1E293B' : '#F1F5F9'),
                borderWidth: 1, borderColor: isBookmarked ? '#D4840A50' : border,
              }}
            >
              {isBookmarked
                ? <BookmarkCheck size={18} color="#D4840A" />
                : <Bookmark size={18} color={sub} />}
            </TouchableOpacity>
          </View>

          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Hash size={14} color={sub} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#2E6DB4', letterSpacing: 0.2 }}>{rule.id}</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: text, lineHeight: 27 }}>
              {rule.title}
            </Text>
          </View>
        </View>

        {/* Body */}
        <View style={{ marginHorizontal: 16, marginTop: 16 }}>
          <View style={{
            backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 18,
          }}>
            <Text style={{ fontSize: 15, color: text, lineHeight: 24 }}>
              {rule.body}
            </Text>
          </View>
        </View>

        {/* Numeric values */}
        {rule.numericValues && rule.numericValues.length > 0 && (
          <View style={{ marginHorizontal: 16, marginTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Calculator size={13} color={sub} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: sub, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Key Limits
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {rule.numericValues.map((v, i) => (
                <View key={i} style={{
                  backgroundColor: '#2E6DB418', borderRadius: 10, borderWidth: 1,
                  borderColor: '#2E6DB440', padding: 12, minWidth: 100, flex: 1,
                }}>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: '#2E6DB4' }}>
                    {v.hours !== undefined ? `${v.hours}h` : v.minutes !== undefined ? `${v.minutes}m` : '—'}
                    {v.unit && v.unit !== 'hours' && v.unit !== 'minutes' ? ` ${v.unit}` : ''}
                  </Text>
                  {v.condition && (
                    <Text style={{ fontSize: 11, color: '#2E6DB4', marginTop: 4, lineHeight: 16 }}>{v.condition}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* PDF page reference */}
        {rule.pdfPage !== undefined && (
          <View style={{ marginHorizontal: 16, marginTop: 16 }}>
            <TouchableOpacity
              onPress={() => router.push(
                `/(tabs)/document?page=${rule.pdfPage}&clause=${encodeURIComponent(rule.id)}` as any
              )}
              style={{
                backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border,
                padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
              }}
            >
              <FileText size={16} color="#2E6DB4" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: text }}>Open in Working Conditions PDF</Text>
                <Text style={{ fontSize: 12, color: sub, marginTop: 1 }}>Jump to page {rule.pdfPage}</Text>
              </View>
              <ChevronRight size={14} color={sub} />
            </TouchableOpacity>
          </View>
        )}

        {/* EASA reference */}
        {rule.easaRef && (
          <View style={{ marginHorizontal: 16, marginTop: 16 }}>
            <View style={{
              backgroundColor: '#1E3A5F20', borderRadius: 12, borderWidth: 1, borderColor: '#1E3A5F50',
              padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8,
            }}>
              <Info size={14} color="#93C5FD" />
              <Text style={{ flex: 1, fontSize: 12, color: '#93C5FD', lineHeight: 18 }}>
                EASA reference: {rule.easaRef}
              </Text>
            </View>
          </View>
        )}

        {/* Related clauses */}
        {rule.relatedClauses && rule.relatedClauses.length > 0 && (
          <View style={{ marginHorizontal: 16, marginTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Hash size={13} color={sub} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: sub, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Related Clauses
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {rule.relatedClauses.map(clauseId => (
                <ClauseRef key={clauseId} id={clauseId} />
              ))}
            </View>
          </View>
        )}

        {/* Tags */}
        {rule.tags && rule.tags.length > 0 && (
          <View style={{ marginHorizontal: 16, marginTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Tag size={13} color={sub} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: sub, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Topics
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {rule.tags.map(t => (
                <TagChip key={t} label={t} isDark={isDark} />
              ))}
            </View>
          </View>
        )}

        {/* Calculator deep links */}
        {applicableCalculators.length > 0 && (
          <View style={{ marginHorizontal: 16, marginTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Calculator size={13} color={sub} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: sub, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Related Calculators
              </Text>
            </View>
            <View style={{ gap: 8 }}>
              {applicableCalculators.map(calc => (
                <TouchableOpacity
                  key={calc.route}
                  onPress={() => router.push(calc.route as any)}
                  style={{
                    backgroundColor: card, borderRadius: 12, borderWidth: 1, borderColor: border,
                    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
                  }}
                >
                  <View style={{
                    width: 34, height: 34, borderRadius: 8, backgroundColor: '#2E6DB420',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Calculator size={16} color="#2E6DB4" />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: text }}>{calc.label}</Text>
                  <ChevronRight size={14} color={sub} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Disclaimer */}
        <View style={{ marginHorizontal: 16, marginTop: 24 }}>
          <View style={{
            backgroundColor: '#D4840A08', borderRadius: 10, borderWidth: 0.5, borderColor: '#D4840A40',
            padding: 12, flexDirection: 'row', gap: 8,
          }}>
            <AlertTriangle size={13} color="#D4840A" style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 11, color: isDark ? '#D4840A80' : '#92400E', lineHeight: 17 }}>
              For reference only. Always verify against the current signed Working Conditions document and applicable EASA regulations.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
