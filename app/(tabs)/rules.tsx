import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, useColorScheme, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFleet } from '../../hooks/useFleet';
import { SearchBar } from '../../components/SearchBar';
import { FleetBadge } from '../../components/FleetBadge';
import { getAllRules, getRulesBySection, searchRules, type SearchableRule } from '../../lib/search';
import { ChevronRight, Info } from 'lucide-react-native';

type BrowseTab = 'section' | 'topic' | 'easa';

const TOPICS = [
  { tag: 'fdp',              label: 'Flight Duty Period' },
  { tag: 'rest',             label: 'Rest Periods' },
  { tag: 'days-off',         label: 'Days Off & Free Time' },
  { tag: 'standby',          label: 'Standby' },
  { tag: 'landings',         label: 'Landing Limits' },
  { tag: 'annual-limits',    label: 'Annual Limits' },
  { tag: 'delays',           label: 'Delays & Disruption' },
  { tag: 'compensation',     label: 'Compensation / OWC' },
  { tag: 'wocl',             label: 'WOCL' },
  { tag: 'ttn',              label: 'Through-the-Night' },
  { tag: 'extended-duties',  label: 'Extended Duties' },
  { tag: 'coefficient',      label: 'Coefficient & Days Off', wbOnly: true },
];

function RuleRow({ rule, onPress, isDark }: { rule: SearchableRule; onPress: () => void; isDark: boolean }) {
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';
  const sourceColor = rule.fleet === 'easa' ? '#2E6DB4' : '#5B4FA8';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: card, borderRadius: 12, borderWidth: 1, borderColor: border,
        padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8,
      }}
    >
      <View style={{
        width: 36, height: 36, borderRadius: 8,
        backgroundColor: `${sourceColor}18`,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Text style={{ fontSize: 9, fontWeight: '700', color: sourceColor }}>
          {rule.fleet === 'easa' ? 'EASA' : 'WC'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: text }} numberOfLines={1}>{rule.title}</Text>
        <Text style={{ fontSize: 11, color: sub, marginTop: 2 }}>{rule.id}</Text>
      </View>
      <ChevronRight size={14} color={sub} />
    </TouchableOpacity>
  );
}

export default function RulesScreen() {
  const isDark = useColorScheme() === 'dark';
  const fleet = useFleet();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BrowseTab>('section');
  const [query, setQuery] = useState('');
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const bg = isDark ? '#0A1628' : '#F7F8FA';
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';

  const searchResults = useMemo(() => {
    if (query.trim().length < 2) return [];
    return searchRules(query, fleet);
  }, [query, fleet]);

  const isSearching = query.trim().length >= 2;

  const sec1 = useMemo(() => getRulesBySection(1, fleet), [fleet]);
  const sec2 = useMemo(() => getRulesBySection(2, fleet), [fleet]);
  const sec3 = useMemo(() => getRulesBySection(3, fleet), [fleet]);

  const allRules = useMemo(() => getAllRules(fleet), [fleet]);
  const easaRules = useMemo(() => allRules.filter(r => r.fleet === 'easa'), [allRules]);

  const topicRules = (tag: string) => allRules.filter(r => r.fleet !== 'easa' && r.tags?.includes(tag));

  const navigate = (id: string) => router.push(`/rule/${id}`);

  const TabButton = ({ id, label }: { id: BrowseTab; label: string }) => (
    <TouchableOpacity
      onPress={() => setActiveTab(id)}
      style={{
        flex: 1, paddingVertical: 8, alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: activeTab === id ? '#2E6DB4' : 'transparent',
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: activeTab === id ? '700' : '500', color: activeTab === id ? '#2E6DB4' : sub }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const SectionGroup = ({ title, rules }: { title: string; rules: SearchableRule[] }) => (
    <View style={{ marginBottom: 4 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: sub, textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 16, paddingVertical: 6 }}>
        {title} ({rules.length})
      </Text>
      <View style={{ paddingHorizontal: 16 }}>
        {rules.map(r => <RuleRow key={r.id} rule={r} onPress={() => navigate(r.id)} isDark={isDark} />)}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Search + fleet badge */}
      <View style={{ padding: 16, gap: 10, borderBottomWidth: 0.5, borderBottomColor: border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: text }}>
            {fleet === 'wb' ? 'Widebody WC 2025' : 'A320 WC May 2018'}
          </Text>
          <FleetBadge fleet={fleet} size="sm" />
        </View>
        <SearchBar value={query} onChangeText={setQuery} onClear={() => setQuery('')} />
      </View>

      {!isSearching && (
        <View style={{ flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: border, backgroundColor: card }}>
          <TabButton id="section" label="By Section" />
          <TabButton id="topic"   label="By Topic" />
          <TabButton id="easa"    label="EASA FTL" />
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {isSearching ? (
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 12, color: sub, marginBottom: 10 }}>{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{query}"</Text>
            {searchResults.map(({ item }) => (
              <RuleRow key={item.id} rule={item} onPress={() => { setQuery(''); navigate(item.id); }} isDark={isDark} />
            ))}
            {searchResults.length === 0 && (
              <Text style={{ color: sub, textAlign: 'center', paddingVertical: 24 }}>No results found.</Text>
            )}
          </View>
        ) : activeTab === 'section' ? (
          <>
            <SectionGroup title={fleet === 'wb' ? 'Section 1 — Definitions' : 'Section 1 — Definitions'} rules={sec1} />
            <SectionGroup title="Section 2 — Planning Limitations" rules={sec2} />
            <SectionGroup title="Section 3 — Operating Limitations" rules={sec3} />
          </>
        ) : activeTab === 'topic' ? (
          <View style={{ padding: 16 }}>
            {TOPICS.filter(t => !t.wbOnly || fleet === 'wb').map(topic => {
              const rules = topicRules(topic.tag);
              const isExpanded = expandedTopic === topic.tag;
              return (
                <View key={topic.tag} style={{ marginBottom: 8 }}>
                  <TouchableOpacity
                    onPress={() => setExpandedTopic(isExpanded ? null : topic.tag)}
                    style={{
                      backgroundColor: card, borderRadius: 12, borderWidth: 1, borderColor: border,
                      padding: 14, flexDirection: 'row', alignItems: 'center',
                    }}
                  >
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: text }}>{topic.label}</Text>
                    <Text style={{ fontSize: 12, color: sub, marginRight: 8 }}>{rules.length}</Text>
                    <ChevronRight size={14} color={sub} style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }} />
                  </TouchableOpacity>
                  {isExpanded && rules.map(r => (
                    <View key={r.id} style={{ marginTop: 6 }}>
                      <RuleRow rule={r} onPress={() => navigate(r.id)} isDark={isDark} />
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={{ padding: 16 }}>
            <View style={{
              backgroundColor: '#2E6DB418', borderRadius: 10, borderWidth: 1, borderColor: '#2E6DB440',
              padding: 12, flexDirection: 'row', gap: 10, marginBottom: 16,
            }}>
              <Info size={16} color="#2E6DB4" style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: 12, color: '#2E6DB4', lineHeight: 18 }}>
                EASA ORO.FTL is the regulatory floor. Your Working Conditions impose stricter limits where applicable.
              </Text>
            </View>
            {easaRules.map(r => <RuleRow key={r.id} rule={r} onPress={() => navigate(r.id)} isDark={isDark} />)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
