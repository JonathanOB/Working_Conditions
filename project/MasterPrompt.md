# PilotRules — Master Prompt (v3 — COMPLETE)

## Project Overview

**PilotRules** is an offline-first mobile reference and calculation tool for Aer Lingus pilots.
It covers two fleets, each with its own working conditions document, and always shows the
EASA regulatory floor alongside the locally-agreed working conditions limit, with the binding
(more restrictive) rule highlighted in amber.

| Fleet | Document | PDF asset |
|---|---|---|
| A330/A350 Widebody | Widebody Consolidated Working Conditions 2025 (signed 10/09/2025) | `assets/docs/330.pdf` |
| A320/A321/(Neo) Narrowbody | A320/321/(Neo) Working Conditions May 2018 | `assets/docs/320.pdf` |

The pilot selects their fleet once in Settings. That choice persists via MMKV and gates every
screen — rules, calculators, PDF viewer, and bookmarks all update automatically.

---

## Tech Stack

| Layer | Package |
|---|---|
| Framework | Expo SDK 54 (managed workflow) |
| Styling | NativeWind v4 (Tailwind CSS for RN) |
| Navigation | Expo Router v3 (file-based) |
| State | Zustand 4 |
| Persistence | react-native-mmkv |
| PDF viewer | react-native-pdf + react-native-blob-util |
| Search | fuse.js v7 |
| Icons | lucide-react-native |
| Platform | iOS + Android |

All rule data is bundled JSON — zero network calls, fully offline.

---

## Asset Paths

```
assets/
└── docs/
    ├── 320.pdf     ← A320/321/(Neo) Working Conditions May 2018
    └── 330.pdf     ← Widebody Consolidated Working Conditions 2025
```

Register both in `app.json`:
```json
{
  "expo": {
    "plugins": [
      ["expo-asset", {
        "assets": ["assets/docs/320.pdf", "assets/docs/330.pdf"]
      }]
    ]
  }
}
```

Access in code:
```typescript
import { Asset } from 'expo-asset';
const wb  = Asset.fromModule(require('../../assets/docs/330.pdf'));
const nb  = Asset.fromModule(require('../../assets/docs/320.pdf'));
await wb.downloadAsync();   // caches to localUri
await nb.downloadAsync();
```

---

## Full Project Structure

```
pilot-rules-app/
├── MasterPrompt.md
├── app.json                          ← expo-asset plugin registers both PDFs
├── tailwind.config.js                ← custom colour tokens
├── assets/
│   └── docs/
│       ├── 320.pdf
│       └── 330.pdf
├── app/
│   ├── _layout.tsx                   ← Root layout + tab navigator
│   ├── (tabs)/
│   │   ├── index.tsx                 ← Home / dashboard
│   │   ├── calculators.tsx           ← Calculator hub
│   │   ├── rules.tsx                 ← Rules browser (fleet-aware)
│   │   ├── document.tsx              ← PDF viewer (fleet-aware)
│   │   └── settings.tsx              ← Settings + fleet selector
│   ├── calculators/
│   │   ├── fdp.tsx                   ← FDP calculator
│   │   ├── rest.tsx                  ← Rest period checker
│   │   ├── days-off.tsx              ← Days off checker
│   │   ├── route.tsx                 ← Route lookup (WB only)
│   │   ├── standby.tsx               ← Standby decoder
│   │   ├── delay.tsx                 ← Delay / disruption tool
│   │   └── coefficient.tsx           ← Coefficient bank (WB only)
│   └── rule/
│       └── [id].tsx                  ← Rule detail page
├── components/
│   ├── RuleCard.tsx                  ← Dual-layer EASA/WC display card
│   ├── BindingBanner.tsx             ← Amber binding-rule banner
│   ├── FleetBadge.tsx                ← Fleet chip shown in headers
│   ├── SectionHeader.tsx             ← Consistent section headings
│   ├── ClauseRef.tsx                 ← Tappable clause reference chip
│   └── SearchBar.tsx                 ← Fuzzy search input
├── data/
│   ├── wb/
│   │   ├── working-conditions.json   ← All WB clauses (see §Data below)
│   │   ├── easa-ftl.json             ← EASA ORO.FTL articles
│   │   └── destinations.json         ← WB route metadata
│   └── a320/
│       └── working-conditions.json   ← All A320 clauses (see §Data below)
├── lib/
│   ├── calculators-wb.ts             ← Widebody pure calculation functions
│   ├── calculators-a320.ts           ← A320 pure calculation functions
│   ├── calculators-easa.ts           ← Shared EASA FTL functions
│   └── search.ts                     ← Fleet-aware fuse.js index builder
└── hooks/
    ├── useFleet.ts                   ← Fleet preference (MMKV-persisted)
    ├── useSearch.ts                  ← Fuse.js search hook
    ├── useBookmarks.ts               ← Saved clauses (MMKV-persisted)
    └── useCoefficient.ts             ← WB coefficient bank (MMKV-persisted)
```

---

## Fleet System

### Type definition

```typescript
// lib/fleet.ts
export type Fleet = 'wb' | 'a320';
```

### `hooks/useFleet.ts`

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'pilot-fleet' });

const mmkvStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};

interface FleetStore {
  fleet: Fleet;
  setFleet: (f: Fleet) => void;
}

export const useFleetStore = create<FleetStore>()(
  persist(
    (set) => ({
      fleet: 'wb',
      setFleet: (fleet) => set({ fleet }),
    }),
    { name: 'fleet', storage: createJSONStorage(() => mmkvStorage) }
  )
);

export const useFleet = () => useFleetStore((s) => s.fleet);
export const useSetFleet = () => useFleetStore((s) => s.setFleet);
```

### Fleet-aware data loading pattern

```typescript
// Used in every screen that needs rule data
const fleet = useFleet();

const wcRules = fleet === 'wb'
  ? require('../../data/wb/working-conditions.json')
  : require('../../data/a320/working-conditions.json');

const pdfSource = fleet === 'wb'
  ? { uri: Asset.fromModule(require('../../assets/docs/330.pdf')).uri, cache: true }
  : { uri: Asset.fromModule(require('../../assets/docs/320.pdf')).uri, cache: true };
```

---

## `components/FleetBadge.tsx`

```tsx
import React from 'react';
import { View, Text } from 'react-native';
import type { Fleet } from '../lib/fleet';

export function FleetBadge({ fleet }: { fleet: Fleet }) {
  const isWB = fleet === 'wb';
  return (
    <View style={{
      backgroundColor: isWB ? '#1E3A5F' : '#0E4B5A',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    }}>
      <Text style={{
        color: isWB ? '#93C5FD' : '#67E8F9',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
      }}>
        {isWB ? 'A330/A350 · WB' : 'A320/Neo · NB'}
      </Text>
    </View>
  );
}
```

---

## `components/RuleCard.tsx`

Shown on every calculator result screen. Renders the EASA limit, the WC limit,
and the amber binding banner.

```tsx
import React from 'react';
import { View, Text } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

interface RuleCardProps {
  easaValue: string;      // e.g. "13h 00m"
  easaRef: string;        // e.g. "ORO.FTL.205(b) Table 1"
  wcValue: string;        // e.g. "12h 00m"
  wcRef: string;          // e.g. "§2.15.1"
  bindingSource: 'easa' | 'wc';
  warnings?: string[];
}

export function RuleCard({ easaValue, easaRef, wcValue, wcRef, bindingSource, warnings = [] }: RuleCardProps) {
  const bindingValue  = bindingSource === 'easa' ? easaValue : wcValue;
  const bindingRef    = bindingSource === 'easa' ? easaRef   : wcRef;

  return (
    <View style={{ gap: 8 }}>
      {/* Two-column layer cards */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {/* EASA card */}
        <View style={{
          flex: 1, borderRadius: 12, padding: 12, gap: 4,
          backgroundColor: bindingSource === 'easa' ? '#2E6DB418' : '#2E6DB408',
          borderWidth: bindingSource === 'easa' ? 1.5 : 0.5,
          borderColor: '#2E6DB4',
        }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#2E6DB4', textTransform: 'uppercase', letterSpacing: 0.5 }}>EASA</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#2E6DB4' }}>{easaValue}</Text>
          <Text style={{ fontSize: 11, color: '#60A5FA' }} numberOfLines={2}>{easaRef}</Text>
        </View>
        {/* WC card */}
        <View style={{
          flex: 1, borderRadius: 12, padding: 12, gap: 4,
          backgroundColor: bindingSource === 'wc' ? '#5B4FA818' : '#5B4FA808',
          borderWidth: bindingSource === 'wc' ? 1.5 : 0.5,
          borderColor: '#5B4FA8',
        }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#5B4FA8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Working Conditions</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#5B4FA8' }}>{wcValue}</Text>
          <Text style={{ fontSize: 11, color: '#A78BFA' }} numberOfLines={2}>{wcRef}</Text>
        </View>
      </View>

      {/* Amber binding banner */}
      <View style={{
        borderRadius: 10, padding: 12,
        backgroundColor: '#D4840A18',
        borderWidth: 1, borderColor: '#D4840A',
        flexDirection: 'row', alignItems: 'center', gap: 10,
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#D4840A', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Binding — {bindingSource === 'easa' ? 'EASA' : 'Working Conditions'}
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#D4840A', marginTop: 2 }}>{bindingValue}</Text>
          <Text style={{ fontSize: 11, color: '#D4840A', marginTop: 2 }}>{bindingRef}</Text>
        </View>
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
```

---

## Colour Tokens (`tailwind.config.js`)

```javascript
module.exports = {
  content: ['./app/**/*.tsx', './components/**/*.tsx'],
  theme: {
    extend: {
      colors: {
        // Fleet primaries
        'wb-navy':    '#0A1628',
        'wb-blue':    '#1E3A5F',
        'nb-teal':    '#0E4B5A',
        'nb-blue':    '#0C6E8A',
        // Rule layers
        'easa':       '#2E6DB4',
        'wc':         '#5B4FA8',
        'binding':    '#D4840A',
        'ok':         '#1B6B3A',
        'warn':       '#B91C1C',
        // Neutral
        surface:      '#F7F8FA',
        border:       '#E2E4EA',
      }
    }
  },
  plugins: [],
};
```

---

## Tab Navigator (`app/_layout.tsx`)

```tsx
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Calculator, BookOpen, FileText, Home, Settings } from 'lucide-react-native';
import { useColorScheme, Platform } from 'react-native';

export default function RootLayout() {
  const isDark = useColorScheme() === 'dark';
  const active = '#2E6DB4';
  const inactive = isDark ? '#64748B' : '#94A3B8';
  const headerBg = isDark ? '#0A1628' : '#FFFFFF';
  const tabBg    = isDark ? '#0A1628' : '#FFFFFF';

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Tabs screenOptions={{
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor: inactive,
        tabBarStyle: {
          backgroundColor: tabBg,
          borderTopColor: isDark ? '#1E3A5F' : '#E2E4EA',
          borderTopWidth: 0.5,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        headerStyle: { backgroundColor: headerBg },
        headerTitleStyle: { color: isDark ? '#F1F5F9' : '#0A1628', fontSize: 17, fontWeight: '600' },
        headerTintColor: active,
      }}>
        <Tabs.Screen name="(tabs)/index"       options={{ title: 'Home',        tabBarIcon: ({ color, size }) => <Home       size={size} color={color} />, headerTitle: 'PilotRules' }} />
        <Tabs.Screen name="(tabs)/calculators" options={{ title: 'Calculators', tabBarIcon: ({ color, size }) => <Calculator size={size} color={color} />, headerTitle: 'Calculators' }} />
        <Tabs.Screen name="(tabs)/rules"       options={{ title: 'Rules',       tabBarIcon: ({ color, size }) => <BookOpen   size={size} color={color} />, headerTitle: 'Working Conditions' }} />
        <Tabs.Screen name="(tabs)/document"    options={{ title: 'Document',    tabBarIcon: ({ color, size }) => <FileText   size={size} color={color} />, headerTitle: 'Document' }} />
        <Tabs.Screen name="(tabs)/settings"    options={{ title: 'Settings',    tabBarIcon: ({ color, size }) => <Settings   size={size} color={color} />, headerTitle: 'Settings' }} />
      </Tabs>
    </>
  );
}
```

---

## Home Screen (`app/(tabs)/index.tsx`)

- Live WOCL banner when current time is 02:00–05:59 local
- FleetBadge showing active fleet in top-right of header
- Global search bar (fuse.js, searches active fleet's rules + EASA)
- Live results list (tap → `/rule/[id]`)
- Calculator quick-access grid — shows only fleet-appropriate tools
  - WB: FDP, Rest, Days Off, Route Lookup, Standby, Delay, Coefficient Bank
  - A320: FDP, Rest, Days Off, Standby, Delay (no Route / Coefficient)
- Quick reference links: WOCL definition, FDP limit, pre-IC rest, OWC rates, View PDF
- Footer: active WC version string

WOCL banner trigger logic:
```typescript
const now   = new Date();
const hour  = now.getHours();
const inWOCL = hour >= 2 && hour < 6;
```

---

## Settings Screen (`app/(tabs)/settings.tsx`)

### Fleet selector (top section, most prominent)
```
┌─ Your fleet ───────────────────────────────────────┐
│                                                    │
│   ┌─────────────────┐   ┌─────────────────┐       │
│   │  A330 / A350    │   │  A320 / Neo     │       │
│   │  Widebody       │   │  Narrowbody     │       │
│   │  WC 2025        │   │  WC May 2018    │       │
│   └─────────────────┘   └─────────────────┘       │
│                                                    │
│  All rules and calculators update automatically.   │
└────────────────────────────────────────────────────┘
```
On fleet switch: reset calculator form state, retain bookmarks.

### Documents section
- "Widebody WC 2025" → opens PDF viewer at `assets/docs/330.pdf`
- "A320/Neo WC May 2018" → opens PDF viewer at `assets/docs/320.pdf`
- "EASA ORO.FTL reference" → opens rules browser filtered to EASA tab

### Preferences section
- Theme: System / Light / Dark (MMKV-persisted)
- Coefficient bank: [Reset] button with confirmation alert (WB only, hidden for A320)
- Bookmarks: [Clear all] button with confirmation alert

### About section
- App version: 1.0.0
- Widebody WC: 2025 (signed 10/09/2025)
- A320 WC: May 2018
- EASA regulation: EU 965/2012 (amended EU 83/2014)
- Disclaimer (full text — see §Disclaimer section)

---

## Rules Browser (`app/(tabs)/rules.tsx`)

### Layout
- Persistent search bar at top (fuse.js, min 2 chars to trigger)
- When not searching: three tab buttons — **By Section** / **By Topic** / **EASA FTL**
- When searching: results list grouped by source (WC first, then EASA)

### By Section tab

**Widebody sections:**
```
Section 1 — Definitions              §1.1–1.36
Section 2 — Planning Limitations     §2.1–2.29
  2.2   Consecutive duties / annual limits
  2.4   Customs clearance / post-flight
  2.5   Days off & free time
  2.5.15 Coefficient values
  2.6   Positioning
  2.9   Extended duties (relief pilot)
  2.11  Extended positioning
  2.12  Flight preparation
  2.13  Landings — intercontinental
  2.14  Landings — continental
  2.15  Max FDP intercontinental
  2.19  Peremptory requests
  2.20  Annual leave
  2.21  Standby duties (STBH / STBB)
  2.22  Rest periods (planning)
  2.23  North/South duties
  2.24  South Africa
  2.25  Rosters & Friday changes
  2.27  Stick time
Section 3 — Operating Limitations    §3.1–3.20
  3.4   Delayed flights
  3.7   Delayed flights intercontinental
  3.8   Delayed flights continental
  3.10  Max flight duty (delays)
  3.13  Minimum rest periods
  3.14  Outside working conditions (OWC)
  3.16  Standby duty
```

**A320 sections:**
```
Section 1 — Definitions              §1.0–1.23
Section 2 — Planning Limitations     §2.1–2.23
  2.2   Consecutive duties
  2.3   Customs clearance / post-flight
  2.4   Days off
  2.7   Flight preparation
  2.9   Landings
  2.10  Length of duty day (FDP limits)
  2.11  Extended duties
  2.14  Night flight duties
  2.16  Standby duties
  2.17  Rest periods
  2.20  Through-the-night flights
  2.21  Volunteer TTN groups
  2.22  Turnarounds at Dublin Airport
  2.23  5/3 Flex roster planning rules
Section 3 — Operating Limitations    §3.1–3.19
  3.2   Change of duty
  3.3   Days off (operating)
  3.4   Delayed flights
  3.11  Maximum flight duty time
  3.12  Maximum landings — eastbound
  3.14  Minimum rest periods
  3.15  Night flight duties
  3.17  Standby duty at home base
  3.18  Through-the-night
Appendix A — 5/3 Operating Rules
  Rules 1–21
  Operating Environment Policies A–G
```

### By Topic tab (both fleets, uses tag matching)
- Flight duty period
- Rest periods
- Days off & free time
- Standby
- Landing limits
- Annual limits
- Delays & disruption
- Compensation / OWC
- WOCL
- Through-the-night
- Extended duties
- Coefficient & days off (WB only — hidden for A320)

### EASA FTL tab
- ORO.FTL.105 Definitions
- ORO.FTL.205(b) Basic maximum FDP (Table 1)
- ORO.FTL.205(d) FDP extension without in-flight rest
- ORO.FTL.205(e) FDP extension — augmented crew
- ORO.FTL.210 Rest period
- ORO.FTL.215 Cumulative limits
- ORO.FTL.225 Standby
- ORO.FTL.230 Commander's discretion

Note banner: "EASA ORO.FTL is the regulatory floor. Your Working Conditions impose stricter limits."

---

## Document Viewer (`app/(tabs)/document.tsx`)

```typescript
// PDF source switches with fleet
const fleet = useFleet();
const [currentPage, setCurrentPage] = useState(1);
const [showBookmarks, setShowBookmarks] = useState(false);

const pdfSource = fleet === 'wb'
  ? { uri: Asset.fromModule(require('../../assets/docs/330.pdf')).uri, cache: true }
  : { uri: Asset.fromModule(require('../../assets/docs/320.pdf')).uri, cache: true };
```

### Features
- Full native PDF render via `react-native-pdf`
- Toolbar: [Sections] button · page counter · page-jump input + Go button
- Bookmarks drawer (modal sheet): tap any section → jumps to that page
- Pinch-to-zoom, vertical scroll
- Persistent last-read page per fleet (MMKV key: `lastPage-wb` / `lastPage-a320`)

### WB PDF bookmark map (`assets/docs/330.pdf`) — 41 pages

```
Cover & agreement                     → p.1
Contents                              → p.2
Section 1 — Definitions              → p.4
  1.5  Continental Duty              → p.4
  1.6  Days Off / Free Days          → p.4
  1.11 Flight Duty Period            → p.4
  1.16 Intercontinental              → p.5
  1.18 Local Night                   → p.5
  1.31 Acclimatised                  → p.6
  1.32 Through-The-Night             → p.6
  1.35 WOCL                          → p.6
Section 2 — Planning Limitations     → p.7
  2.2  Consecutive duties            → p.7
  2.4  Customs clearance             → p.7
  2.5  Days off & free time          → p.8
  2.5.15 Coefficients                → p.10
  2.6  Positioning                   → p.16
  2.9  Extended duties               → p.17
  2.11 Extended positioning          → p.19
  2.12 Flight preparation            → p.19
  2.13 Landings intercontinental     → p.19
  2.15 Max FDP intercontinental      → p.20
  2.19 Peremptory requests           → p.21
  2.20 Annual leave                  → p.22
  2.21 Standby duties                → p.23
  2.22 Rest periods                  → p.24
  2.23 North/South duties            → p.25
  2.24 South Africa                  → p.25
  2.25 Rosters                       → p.25
  2.27 Stick time                    → p.26
Section 3 — Operating Limitations    → p.28
  3.4  Delayed flights               → p.31
  3.7  Delayed flights intercont.    → p.35
  3.10 Max flight duty (delays)      → p.36
  3.13 Minimum rest periods          → p.37
  3.14 OWC compensation              → p.38
  3.16 Standby duty                  → p.38
Signatures                           → p.41
```

### A320 PDF bookmark map (`assets/docs/320.pdf`) — 37 pages

```
Cover                                → p.1
Contents (Section 1 list)            → p.2
Section 1 — Definitions             → p.3
  1.6  Days Off                      → p.3
  1.10 Flight Duty Time              → p.4
  1.11 Intercontinental              → p.4
  1.22 Through-The-Night             → p.5
  1.23 Y Duty                        → p.5
Section 2 — Planning Limitations    → p.6
  2.2  Consecutive duties            → p.7
  2.3  Customs clearance             → p.7
  2.4  Days off                      → p.7
  2.7  Flight preparation            → p.9
  2.9  Landings                      → p.10
  2.10 Length of duty day            → p.10
  2.11 Extended duties               → p.11
  2.14 Night flight duties           → p.14
  2.16 Standby duties                → p.15
  2.17 Rest periods                  → p.16
  2.20 Through-the-night             → p.19
  2.23 5/3 Flex roster               → p.20
Section 3 — Operating Limitations   → p.21
  3.2  Change of duty                → p.22
  3.3  Days off (operating)          → p.24
  3.4  Delayed flights               → p.25
  3.11 Max flight duty time          → p.27
  3.14 Minimum rest periods          → p.28
  3.17 Standby at home base          → p.29
  3.18 Through-the-night             → p.32
Appendix A — 5/3 Rules              → p.32
  Operating Env. Policies            → p.35
```

---

## Calculator Hub (`app/(tabs)/calculators.tsx`)

Grid of cards. WB fleet shows all 7. A320 fleet hides Route Lookup and Coefficient Bank.

| ID | Label | Description | Route | WB | A320 |
|---|---|---|---|---|---|
| fdp | FDP Calculator | Max flight duty period | /calculators/fdp | ✓ | ✓ |
| rest | Rest Checker | Pre/post duty minimums | /calculators/rest | ✓ | ✓ |
| days-off | Days Off | Days off + coefficient | /calculators/days-off | ✓ | ✓ |
| route | Route Lookup | All rules by destination | /calculators/route | ✓ | ✗ |
| standby | Standby Decoder | STBH / STBB / STBA / K-duty | /calculators/standby | ✓ | ✓ |
| delay | Delay Tool | Delay impact & compensation | /calculators/delay | ✓ | ✓ |
| coefficient | Coefficient Bank | Running balance tracker | /calculators/coefficient | ✓ | ✗ |

---

## FDP Calculator (`app/calculators/fdp.tsx`)

### Inputs (both fleets)
- Report time: hour picker (0–23), WOCL hours (02–05) highlighted red
- Number of sectors: stepper 1–9
- Fleet-specific duty type selector (see below)
- Acclimatisation state: Acclimatised / Unknown (EASA only)

### WB-specific inputs
- Duty type: Standard · Eastbound · Through-the-Night · Augmented · Heavy
- If Augmented or Heavy:
  - Rest facility: Class 1 (bunk) · Class 2 · Class 3 · None
  - Extra crew: +1 pilot · +2 pilots

### A320-specific inputs
- Duty type: Standard · Early (0100–0619) · Night (TTN) · Intercontinental · Extended
- Direction (intercontinental only): Westbound · Eastbound

### WB calculation logic (`lib/calculators-wb.ts`)

**EASA Table 1 lookup:**
```typescript
// reportHour 0–23, sectors 1–9+, acclimatised boolean
function getEasaTable1(reportHour: number, sectors: number, acclimatised: boolean): number {
  // Bucket by start time
  const bucket =
    (reportHour >= 6  && reportHour <= 13) ? 'A' :  // 13:00 base
    (reportHour >= 14 && reportHour <= 16) ? 'B' :  // 12:00 base
    (reportHour >= 17 && reportHour <= 21) ? 'B' :  // 12:00 base
    'C';                                             // 22:00–05:59 → 11:00 base

  const sectorKey = sectors <= 2 ? '1-2' : sectors === 3 ? '3' : sectors === 4 ? '4' : sectors === 5 ? '5' : '6+';

  const TABLE: Record<string, Record<string, number>> = {
    'A': { '1-2': 13.0, '3': 12.5, '4': 12.0, '5': 11.5, '6+': 11.0 },
    'B': { '1-2': 12.0, '3': 11.5, '4': 11.0, '5': 10.5, '6+': 10.0 },
    'C': { '1-2': 11.0, '3': 10.5, '4': 10.0, '5':  9.5, '6+':  9.0 },
  };

  let base = TABLE[bucket][sectorKey];
  if (!acclimatised) base = Math.max(base - 1, 9.0);
  return base;
}
```

**WC FDP limits:**
```
Standard 2-pilot:             12h   §2.15.1
Eastbound TA / TTN N-S:       11h   §2.15.2
Augmented (outside WOCL):     15h   §2.15.3
Augmented (no cockpit rest):  14h west / 13h east   §2.15.4
Heavy crew:                   17h   §2.15.5
```

**WOCL reduction for augmented (§2.15.3):**
```typescript
// Start encroachment: 100% deducted (max 2h)
// End encroachment:    50% deducted (max 2h)
// Total max reduction: 2h
function woclReduction(startEncroachMin: number, endEncroachMin: number): number {
  const startR = Math.min(startEncroachMin / 60, 2);
  const endR   = Math.min((endEncroachMin / 60) * 0.5, 2);
  return Math.min(startR + endR, 2);
}
```

**Binding result:** `binding = Math.min(easaMax, wcMax)`

### A320 calculation logic (`lib/calculators-a320.ts`)

**Planning maximums (§2.10):**
```typescript
function getA320PlanningFDP(reportHour: number, reportMin: number, sectors: number): { value: number; ref: string } {
  const t = reportHour + reportMin / 60;

  if (t >= 1   && t < 5)    return { value: 10 + 10/60, ref: '§2.10.4(a) — 0100–0459' };
  if (t >= 5   && t < 5.5)  {
    if (sectors === 2)       return { value: 11.0,       ref: '§2.10.4(b) — 2-sector 0500–0549' };
    if (sectors > 2)         return { value: 10 + 10/60, ref: '§2.10.4(c) — 3+ sectors 0500–0549' };
    return                          { value: 11.0,       ref: '§2.10.4(b)' };
  }
  if (t >= 5.5 && t < 6.33) return { value: 11 + 10/60, ref: '§2.10.4(d) — 0550–0619' };
  // 0620–0059
  return                            { value: 12.0,       ref: '§2.10.4(e) — 0620–0059' };
}
```

**Intercontinental (§2.10.5):**
```
Any intercontinental:  12h  §2.10.5(a)
Eastbound TA:          12h  §2.10.5(b)
Augmented EB TA:       13h  §2.10.5(c)
EI840-822 coupling:    11h 15m  §2.10.3   (delayed to 0600+: 12h)
```

**Operational maximums on delays (§3.11.1):**
```
Starts 0100–0549 or terminates 0200–0634:   11h 30m
Starts 0550–0619:                           12h 00m
Falls entirely 0620–0159:                   13h 00m
  Reduction: −30m per sector from 3rd, max −2h total
Intercontinental delay max:                 14h
Eastbound TA delay max:                     12h
```

**Extended duties (§2.11.1):** +1h, 8×/year, not TTN, ≥7 days apart (day); ≥14 days apart (if either is night). Max 2 night extended/year.

**EASA floor:** Same Table 1 lookup as WB. Binding = min(EASA, A320 WC).

### Result display
Both fleets: `RuleCard` component with EASA value, WC value, amber binding banner.
Warning chips: WOCL encroachment · max landings reminder · extended duty quota warning.

---

## Rest Checker (`app/calculators/rest.tsx`)

### Inputs
- Duty type selector (fleet-appropriate)
- Location: Base / Outstation
- For post-duty: actual FDP duration (hour + minute pickers)
- For post-intercontinental: standard time difference (integer hours)
- Preceded by standby: toggle (affects pre-IC minimum)

### WB rest rules (`lib/calculators-wb.ts`)

```typescript
// Pre-duty
pre_intercontinental_standard:     15h   §2.22.2 / §3.13.1
pre_intercontinental_after_stby:   13h   §3.13.1
pre_north_south:      preceding duty + 4h, min 14h   §2.23.1

// Post-duty
post_IC_base:         actual FDP + std time diff, min 18h   §3.13.2
post_IC_outstation_EB: actual duty + std time diff, min 14h §3.13.5
post_continental_base:      actual duty + 2h, min 12h   §3.13.7.1
post_continental_outstation: actual duty + 2h, min 11h  §3.13.7.2
post_ttn_continental:        actual duty + 4h, min 14h  §3.13.7.3
post_north_south_base:       actual duty + 4h, min 15h  §2.23.3
post_north_south_outstation: actual duty + 4h, min 14h  §2.23.2
post_south_africa:    40h OR 2 local nights — whichever greater   §2.24.1
```

EASA floor (ORO.FTL.210):
```
Base:       max(actualFDP, 12h)
Outstation: max(actualFDP, 14h)
```
Binding = max(EASA min, WC min).

Formula string shown in UI, e.g.:
`"Actual FDP (11.5h) + std time diff (5h) = 16.5h → min 18h → 18h 00m"`

### A320 rest rules (`lib/calculators-a320.ts`)

```typescript
post_continental_base:      actual duty + 2h, min 12h   §3.14.1(a) / §2.17.1(a)
post_continental_outstation: actual duty + 2h, min 11h  §3.14.1(b) / §2.17.1(c)
post_ttn_continental:        actual duty + 4h, min 14h  §3.14.1(c) / §2.20.9
post_WB_transatlantic:       actual duty + std time diff, min 18h   §3.14.2(b) / §2.17.2(a)
post_EB_TA_outstation:       actual duty + std time diff, min 14h   §3.14.2(e) / §2.17.2(e)
pre_intercontinental:        15h   §3.14.2(a)
  (if planned <15h → prior duty capped at 10h)
turnaround_WB_to_EB:         18h free of all duty   §2.17.2(a)
unscheduled_overnight:       normal min rest; may reduce 1h if meal within 3h prior   §3.14.4
post_standby_no_duty:        12h   §3.17.5(a)
post_standby_duty_assigned:  actual duty + 2h, min 12h   §3.17.5(b)
```

---

## Days Off Checker (`app/calculators/days-off.tsx`)

### WB: coefficient-based system

**Inputs:** destination · night stops (0/1/2+) · service frequency (A320 augmented)
· called off standby toggle

**Coefficient table (§2.5.15.2):**
```
Core (JFK / BOS / ORD / IAD / BWI / YYZ):    2.6  →  2 days off post-duty
MCO (Florida):                                3.5  →  2 days off post-duty
US West Coast (LAX / SFO / SEA / YVR):       4.0  →  see augmented rules §2.5.10–2.5.13
SP US West Coast:                             5.0  →  see §2.5.13
Minneapolis (MSP):                            3.3  →  2 days off post-duty
```

**West coast / augmented days off:**
```
Single nightstop, service 6–7×/week:   4 days off + 1 coeff bank   §2.5.10
Single nightstop, service ≤5×/week:    3 days off + 2 coeff bank   §2.5.12
2+ nightstops:                         3 days off + 1 coeff bank   §2.5.14
Called off standby:                    3 days off + 2 coeff bank   §2.5.14
```

**Planned minimum hours (§2.5.1):**
```
1 day off:   40h
2 days off:  61h
3 days off:  85h
4 days off:  109h
```

Section carry-over: ±8 days maximum per section boundary (§2.5.15.7).
Year-end: positive balance >2 converts to leave (§2.5.15.5).
RP13 write-off: negative balance written off at RP13 close.

**Output:** days off required · coefficient generated · bank credit/debit · running balance reminder · clause reference.

### A320: overnight-count-based system

**Inputs:** nights away · called from standby toggle · back-to-back TA toggle

**Rules (§2.4):**
```
After EB transatlantic:              ≥2 days off at base   §2.4.4
Back-to-back TA (2 trips):           ≥4 consecutive days after 2nd trip   §2.4.4
4 nights away:                       2 days off on return   §2.4.5
5–6 nights away:                     3 days off on return   §2.4.5
7 nights away:                       4 days off on return   §2.4.5
(continues +1 day off per night, max 14 days off)
Standby — 4 consecutive nights:      3 free days on return   §2.4.3
```

**Minimum day-off durations (§1.6):**
```
1 day off:    ≥36h 50m   (single week: ≥40h, starts ≤2100, ends ≥0820)
2 days off:   ≥60h 50m
3 days off:   ≥80h 50m
4 days off:   ≥104h 50m
Days off must commence ≤2200, end ≥0750 next day   §1.6.4
```

**Operational minimums (§3.3.2):**
```
1 day = 34h (incl. 1 local night)
2 days = 58h
3 days = 79h
4 days = 101h
```

---

## Standby Decoder (`app/calculators/standby.tsx`)

### WB inputs
- Standby type: STBH / STBB
- Standby start time
- Was duty assigned? If yes: call time + FDP duration

### WB rules
```
STBH:
  50% of expired standby counts as FDP   §3.16.4
  Max STBB duration: 10h per duty   §2.21.13
  Max STBB blocks per year: 6   §2.21.9
  Rest after standby (any type): 13h   §3.16.10
  Pre-22:00 standby cannot cover 00:00–07:59 IC departures   §3.16.9
  Report within 2h of call   §2.21.11
```

### A320 inputs
- Standby type: STBH / STBA / K-duty (pre-flight / post-flight / specified)
- Was duty assigned?
- Call time + resulting FDP duration

### A320 rules (§2.16 / §3.17)
```
STBH:
  Counts as half duty time   §2.16.2(b)
  Max 10h   §2.16.2
  Max 2/week   §2.16.2
  Report within 1h of call   §3.17.2(a)
  50% of expired = FDP   §3.17.2(c)
  Total elapsed limits from standby start:
    Duty 0630–0059:        16h total   §3.17.2(e)
    Duty enters 0100–0629: 13h total   §3.17.2(e)
    Intercontinental:      14h total   §3.17.2(f)
  Rest after (no duty): 12h   §3.17.5(a)
  Rest after (duty assigned): duty + 2h or 12h   §3.17.5(b)

STBA:
  Counts as full duty time   §2.16.1(b)
  Max 9h   §2.16.1(c)
  Max duty time per §3.11 from actual STBA report time   §3.17.1(b)

K-duty (pre-flight):
  Time before reporting: 50% duty   §2.16.3(c) / §3.17.4(a)
  Time from reporting: full duty
K-duty (post-flight):
  Available for further duty within K period   §2.16.3(d)
  K terminates 60min after ATA of preceding flight   §2.16.3(e)
K-duty (specified/standalone):
  Counts as 75% duty time   §2.16.3(h)
  Max 10h
```

### Output for both fleets
- FDP credit already consumed (from standby)
- Remaining FDP available
- Coverage restriction warning if applicable
- Rest required after

---

## Delay Tool (`app/calculators/delay.tsx`)

### Inputs
- Rostered report time
- Delay duration (minute stepper or time picker)
- Duty type: Intercontinental / Continental (A320 only)
- Rostered days off following: count + planned hours

### WB delay rules

**FDP recalculation:**
```
IC delay < 4h:   FDP calculated from actual report time   §3.7.1
IC delay ≥ 4h:   FDP from rostered report + 4h   §3.7.2
Extended delay:  +1h operational extension available, max 16h absolute   §3.10.1
Augmented delay: +2h extension (WOCL encroachment: +1h only)   §3.10.2
```

**Days off infringement compensation (§3.4):**
```
IC delayed ≤2h: nil
IC delayed >2h: 1 day off or Blue Sheet   §3.4.1
```

**OWC rates (§3.14.1):**
```
Working on free day:    0.57% of basic pay
Working on gash day:    0.38%
Agreed OWC duty:        0.19%
Short rest:             0.19%
```

### A320 delay rules

**FDP recalculation (§3.4.3 / §3.4.4):**
```
IC delay < 4h:   from actual report   §3.4.3(a)
IC delay ≥ 4h:   from rostered report + 4h   §3.4.3(b)
Cont delay < 2h: from actual report   §3.4.4(a)
Cont delay ≥ 2h: from rostered report + 2h   §3.4.4(b)
```

**TTN triggers (§3.4.1 / §3.4.2 / §3.18):**
```
Rostered to finish before 0100, delayed past 0130 → night duty
Rostered not to encompass 0300, delayed past 0330 → TTN
```

**Compensation (§3.3.1):**
```
Continental finish 0–60m late:    nil
Continental finish 61–120m late:  0.19% OWC
Continental finish >2h late:      1 day off or Blue Sheet
IC finish 0–2h late:              nil
IC finish >2h late:               1 day off or Blue Sheet
```

---

## Route Lookup (`app/calculators/route.tsx`) — WIDEBODY ONLY

Destination picker grouped by region. On selection, shows a full rule summary card.

### Destinations (`data/wb/destinations.json`)

```json
[
  { "iata": "JFK", "name": "New York JFK",       "region": "transatlantic-core",  "crewType": "two-pilot",  "coefficient": 2.6, "maxFDPHours": 12, "maxFDPClause": "2.15.1", "stickTime": { "wbSingle": 9.0, "ebSingle": 8.0, "wbMulti": 9.5, "ebMulti": 8.5 }, "maxLandings": { "standard": 4, "eastbound": 2 }, "outstationRestMin": 18, "outstationRestClause": "3.13.2", "daysOff": 2, "daysOffClause": "2.5.3", "specialRules": [], "notes": "Core duty. Post-duty: actual FDP + std time diff, min 18h." },
  { "iata": "BOS", "name": "Boston Logan",        "region": "transatlantic-core",  "crewType": "two-pilot",  "coefficient": 2.6, "maxFDPHours": 12, "maxFDPClause": "2.15.1", "stickTime": { "wbSingle": 9.0, "ebSingle": 8.0, "wbMulti": 9.5, "ebMulti": 8.5 }, "maxLandings": { "standard": 4, "eastbound": 2 }, "outstationRestMin": 18, "outstationRestClause": "3.13.2", "daysOff": 2, "daysOffClause": "2.5.3", "specialRules": [], "notes": "Core duty." },
  { "iata": "ORD", "name": "Chicago O'Hare",      "region": "transatlantic-core",  "crewType": "two-pilot",  "coefficient": 2.6, "maxFDPHours": 12, "maxFDPClause": "2.15.1", "stickTime": { "wbSingle": 9.0, "ebSingle": 8.0, "wbMulti": 9.5, "ebMulti": 8.5 }, "maxLandings": { "standard": 4, "eastbound": 2 }, "outstationRestMin": 18, "outstationRestClause": "3.13.2", "daysOff": 2, "daysOffClause": "2.5.3", "specialRules": [], "notes": "Core duty." },
  { "iata": "IAD", "name": "Washington Dulles",   "region": "transatlantic-core",  "crewType": "two-pilot",  "coefficient": 2.6, "maxFDPHours": 12, "maxFDPClause": "2.15.1", "stickTime": { "wbSingle": 9.0, "ebSingle": 8.0, "wbMulti": 9.5, "ebMulti": 8.5 }, "maxLandings": { "standard": 4, "eastbound": 2 }, "outstationRestMin": 18, "outstationRestClause": "3.13.2", "daysOff": 2, "daysOffClause": "2.5.3", "specialRules": [], "notes": "Core duty." },
  { "iata": "BWI", "name": "Baltimore Washington", "region": "transatlantic-core", "crewType": "two-pilot",  "coefficient": 2.6, "maxFDPHours": 12, "maxFDPClause": "2.15.1", "stickTime": { "wbSingle": 9.0, "ebSingle": 8.0, "wbMulti": 9.5, "ebMulti": 8.5 }, "maxLandings": { "standard": 4, "eastbound": 2 }, "outstationRestMin": 18, "outstationRestClause": "3.13.2", "daysOff": 2, "daysOffClause": "2.5.3", "specialRules": [], "notes": "Core duty." },
  { "iata": "YYZ", "name": "Toronto Pearson",     "region": "transatlantic-core",  "crewType": "two-pilot",  "coefficient": 2.6, "maxFDPHours": 12, "maxFDPClause": "2.15.1", "stickTime": { "wbSingle": 9.0, "ebSingle": 8.0, "wbMulti": 9.5, "ebMulti": 8.5 }, "maxLandings": { "standard": 4, "eastbound": 2 }, "outstationRestMin": 18, "outstationRestClause": "3.13.2", "daysOff": 2, "daysOffClause": "2.5.3", "specialRules": [], "notes": "Core duty." },
  { "iata": "MCO", "name": "Orlando Florida",     "region": "special",             "crewType": "two-pilot",  "coefficient": 3.5, "maxFDPHours": 12, "maxFDPClause": "2.15.1", "stickTime": { "wbSingle": 9.75, "ebSingle": 8.75, "wbMulti": 9.75, "ebMulti": 8.75, "note": "Florida §2.27.4: 9h45m outside WOCL / 8h45m into WOCL" }, "maxLandings": { "standard": 4, "eastbound": 2 }, "outstationRestMin": 18, "outstationRestClause": "3.13.2", "daysOff": 2, "daysOffClause": "2.5.3", "specialRules": ["2.27.4"], "notes": "Florida stick time rule (§2.27.4). Coefficient 3.5." },
  { "iata": "LAX", "name": "Los Angeles",         "region": "west-coast",          "crewType": "augmented",  "coefficient": 4.0, "maxFDPHours": 15, "maxFDPClause": "2.15.3", "stickTime": { "wbSingle": 9.0, "ebSingle": 8.0 }, "maxLandings": { "augmented": 1, "eastbound": 2 }, "outstationRestMin": 18, "outstationRestClause": "3.13.2", "daysOff": 4, "daysOffClause": "2.5.10", "coeffBankCredit": 1, "specialRules": ["2.13.5", "2.5.10", "2.5.11", "2.5.13"], "notes": "AUGMENTED. DUB-LAX-DUB: 1 planned landing only (§2.13.5). 4 days off + 1 coeff bank (single nightstop, service 6-7/wk)." },
  { "iata": "SFO", "name": "San Francisco",       "region": "west-coast",          "crewType": "augmented",  "coefficient": 4.0, "maxFDPHours": 15, "maxFDPClause": "2.15.3", "stickTime": { "wbSingle": 9.0, "ebSingle": 8.0 }, "maxLandings": { "augmented": 2, "eastbound": 2 }, "outstationRestMin": 18, "outstationRestClause": "3.13.2", "daysOff": 4, "daysOffClause": "2.5.10", "coeffBankCredit": 1, "specialRules": ["2.5.10", "2.5.13"], "notes": "AUGMENTED. West coast coefficient 4.0." },
  { "iata": "SEA", "name": "Seattle-Tacoma",      "region": "west-coast",          "crewType": "augmented",  "coefficient": 4.0, "maxFDPHours": 15, "maxFDPClause": "2.15.3", "stickTime": { "wbSingle": 9.0, "ebSingle": 8.0 }, "maxLandings": { "augmented": 2, "eastbound": 2 }, "outstationRestMin": 18, "outstationRestClause": "3.13.2", "daysOff": 4, "daysOffClause": "2.5.10", "coeffBankCredit": 1, "specialRules": ["2.5.10", "2.5.13"], "notes": "AUGMENTED. West coast coefficient 4.0." },
  { "iata": "MSP", "name": "Minneapolis–St. Paul","region": "special",             "crewType": "two-pilot",  "coefficient": 3.3, "maxFDPHours": 12, "maxFDPClause": "2.15.1", "stickTime": { "wbSingle": 9.0, "ebSingle": 8.0, "wbMulti": 9.5, "ebMulti": 8.5 }, "maxLandings": { "standard": 4, "eastbound": 2 }, "outstationRestMin": 18, "outstationRestClause": "3.13.2", "daysOff": 2, "daysOffClause": "2.5.3", "specialRules": [], "notes": "Coefficient 3.3." }
]
```

### Route card output
- Crew type badge · Max FDP · Stick time limits (WB / EB)
- Max landings (standard / EB / augmented)
- Days off required + coefficient value
- Outstation rest minimum
- Pre-IC rest minimum (15h / 13h from standby)
- Any special rules (with tappable clause chips)
- Deep link to relevant calculators

---

## Coefficient Bank (`app/calculators/coefficient.tsx`) — WIDEBODY ONLY

### Features
- Log duties: destination picker → auto-fills coefficient
- Running balance displayed prominently
- Section breakdown (4 sections per year, each ~3 RPs):
  - Section 1: RP01–RP03
  - Section 2: RP04–RP06
  - Section 3: RP07–RP10
  - Section 4: RP11–RP13
- Carry-over limit: ±8 days per section boundary (§2.5.15.7)
- Year-end: positive balance >2 → converts to leave (§2.5.15.5)
- RP13 close: negative balance → written off
- Persistent storage: MMKV key `wb-coefficient-log`

### `hooks/useCoefficient.ts`

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'wb-coefficient' });

export interface CoefficientEntry {
  id: string;
  date: string;        // ISO
  destination: string;
  coefficient: number;
  daysOffRostered: number;
  notes?: string;
}

interface CoefficientStore {
  entries: CoefficientEntry[];
  addEntry: (e: Omit<CoefficientEntry, 'id'>) => void;
  removeEntry: (id: string) => void;
  reset: () => void;
}

export const useCoefficientStore = create<CoefficientStore>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (e) => set((s) => ({ entries: [...s.entries, { ...e, id: Date.now().toString() }] })),
      removeEntry: (id) => set((s) => ({ entries: s.entries.filter(x => x.id !== id) })),
      reset: () => set({ entries: [] }),
    }),
    { name: 'coefficient', storage: createJSONStorage(() => ({
      getItem:    (k) => storage.getString(k) ?? null,
      setItem:    (k, v) => storage.set(k, v),
      removeItem: (k) => storage.delete(k),
    }))}
  )
);
```

---

## Rule Detail Page (`app/rule/[id].tsx`)

- Source badge (EASA blue / WC purple)
- Clause ID + title
- Full clause body text
- Key numeric values as visual cards (value + unit + condition)
- PDF page link → tapping opens document viewer at correct page
- Related EASA article (for WC clauses that have `easaRef`)
- Related WC clauses (for EASA articles that have `relatedWCClauses`)
- Applicable calculators (tag-based deep links)
- Tag chips

---

## `lib/search.ts` — Fleet-aware search

```typescript
import Fuse from 'fuse.js';
import type { Fleet } from './fleet';

export interface SearchableRule {
  id: string;
  fleet: Fleet | 'easa';
  section?: number;
  title: string;
  body: string;
  tags: string[];
  pdfPage?: number;
  easaRef?: string;
  relatedClauses?: string[];
  numericValues?: { hours?: number; minutes?: number; unit?: string; condition?: string }[];
}

let currentFleet: Fleet | null = null;
let searchIndex: Fuse<SearchableRule> | null = null;

export function buildSearchIndex(fleet: Fleet): Fuse<SearchableRule> {
  if (fleet === currentFleet && searchIndex) return searchIndex;

  const wcData: SearchableRule[] = fleet === 'wb'
    ? (require('../data/wb/working-conditions.json') as any[]).map(c => ({ ...c, fleet: 'wb' as const }))
    : (require('../data/a320/working-conditions.json') as any[]).map(c => ({ ...c, fleet: 'a320' as const }));

  const easaData: SearchableRule[] = (require('../data/wb/easa-ftl.json') as any[]).map(a => ({ ...a, fleet: 'easa' as const }));

  currentFleet = fleet;
  searchIndex = new Fuse([...wcData, ...easaData], {
    keys: [
      { name: 'id',    weight: 0.35 },
      { name: 'title', weight: 0.30 },
      { name: 'body',  weight: 0.20 },
      { name: 'tags',  weight: 0.15 },
    ],
    threshold: 0.38,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
  return searchIndex;
}

export function searchRules(query: string, fleet: Fleet) {
  if (query.trim().length < 2) return [];
  return buildSearchIndex(fleet).search(query.trim()).map(r => ({ item: r.item, score: r.score ?? 1 }));
}

export function getRuleById(id: string, fleet: Fleet): SearchableRule | undefined {
  buildSearchIndex(fleet);
  const all = getAllRules(fleet);
  return all.find(r => r.id === id);
}

export function getAllRules(fleet: Fleet): SearchableRule[] {
  buildSearchIndex(fleet);
  const wc: SearchableRule[] = fleet === 'wb'
    ? (require('../data/wb/working-conditions.json') as any[]).map(c => ({ ...c, fleet: 'wb' as const }))
    : (require('../data/a320/working-conditions.json') as any[]).map(c => ({ ...c, fleet: 'a320' as const }));
  const easa: SearchableRule[] = (require('../data/wb/easa-ftl.json') as any[]).map(a => ({ ...a, fleet: 'easa' as const }));
  return [...wc, ...easa];
}
```

---

## Data Schemas

### WB clauses (`data/wb/working-conditions.json`)

All clause IDs are plain numbers, e.g. `"2.15.1"`. Full data already exists in the project.
Key clauses with all fields populated:

```typescript
interface WBClause {
  id: string;
  section: 1 | 2 | 3;
  title: string;
  body: string;
  numericValues?: { hours?: number; minutes?: number; unit?: string; condition?: string }[];
  tags: string[];
  easaRef?: string;
  relatedClauses?: string[];
  pdfPage?: number;
}
```

The existing `data/working-conditions.json` (already built) contains all key WB clauses.
When migrating to the final structure, move it to `data/wb/working-conditions.json`.

### A320 clauses (`data/a320/working-conditions.json`)

IDs prefixed `a320-` to prevent search collisions. Same interface as WB.
Key clauses to include (all sourced from A320/321/(Neo) WC May 2018):

```
a320-1.3   Back to Back TA definition
a320-1.5   Continental definition
a320-1.6   Days Off (1 day = 36h50m; §1.6.1–1.6.5)
a320-1.7   Deadheading = full FDT
a320-1.10  Flight Duty Time definition
a320-1.11  Intercontinental (block >6h or >3 time zones)
a320-1.22  Through-The-Night (encompasses 0300)
a320-1.23  Y Duty definition
a320-2.2   Max 7 consecutive flight duties (§2.2)
a320-2.3.1 Customs continental: 20 min (§2.3.1)
a320-2.3.2 Customs intercontinental: 20 min (§2.3.2)
a320-2.4.3 Standby 4 consec nights → 3 free days (§2.4.3)
a320-2.4.4 Intercontinental: min 2 days off after EB TA (§2.4.4)
a320-2.4.4 Back-to-back TA: 4 free days after 2nd trip (§2.4.4)
a320-2.4.5 Series of overnights days-off schedule (§2.4.5)
a320-2.7.1 Flight prep continental: 55 min (§2.7.1)
a320-2.7.2 Flight prep intercontinental: 75 min WB / 60 min EB (§2.7.2)
a320-2.9.1 Continental landings: 6 max; 7 if 3 sectors each <1h (§2.9.1)
a320-2.9.2 IC landings: 4 max; 2 max EB (§2.9.2)
a320-2.10.1 Max 5 consecutive duty days (§2.10.1)
a320-2.10.3 EI840-822: 11h15m; delayed to 0600+: 12h (§2.10.3)
a320-2.10.4a FDP 0100–0459: 10h10m (§2.10.4a)
a320-2.10.4b FDP 2-sector 0500–0549: 11h (§2.10.4b)
a320-2.10.4c FDP 3+ sectors 0500–0549: 10h10m (§2.10.4c)
a320-2.10.4d FDP 0550–0619: 11h10m (§2.10.4d)
a320-2.10.4e FDP 0620–0059: 12h (§2.10.4e)
a320-2.10.5a IC max: 12h (§2.10.5a)
a320-2.10.5b EB TA max: 12h; augmented: 13h (§2.10.5b/c)
a320-2.10.7 Back-to-back: max 6 consecutive duty days (§2.10.7)
a320-2.11.1 Extended continental: +1h, 8×/year (§2.11.1)
a320-2.11.2 Extended deadhead continental: 14h max; operate ≤11h (§2.11.2)
a320-2.11.3 Extended IC: to 13h, 5×/year; not EB TA (§2.11.3)
a320-2.11.4 Extended deadhead IC: 16h; EB TA: 14h; operate ≤11h (§2.11.4)
a320-2.14.1 Up to 5 consecutive duties 0200–0659 (§2.14.1)
a320-2.16.1 STBA: full FDT; max 9h (§2.16.1)
a320-2.16.2 STBH: half FDT; max 10h; max 2/week (§2.16.2)
a320-2.16.3 K-duty rules (§2.16.3)
a320-2.17.1 Continental rest: duty+2h, min 12h base / 11h outstation (§2.17.1)
a320-2.17.2 Intercontinental rest rules (§2.17.2)
a320-2.20.1 Max 2 TTN in succession, once per 14 days (§2.20.1)
a320-2.20.2 2× TTN aggregate: 14h30m (§2.20.2)
a320-2.20.3 Second TTN max: 7h15m (§2.20.3)
a320-2.20.7 TTN max landings: 4 (§2.20.7)
a320-2.20.9 Post-TTN rest: duty+4h, min 14h (§2.20.9)
a320-3.2.3 Continental duty change rules (§3.2.3)
a320-3.2.4 Intercontinental duty change rules (§3.2.4)
a320-3.3.1 Duty termination compensation (§3.3.1)
a320-3.3.2 Minimum duration of days off (§3.3.2)
a320-3.4.1 Delayed flight → night duty trigger (§3.4.1)
a320-3.4.2 Delayed flight → TTN trigger (§3.4.2)
a320-3.4.3 IC delay rules (§3.4.3)
a320-3.4.4 Continental delay rules (§3.4.4)
a320-3.11.1 Continental operational max FDP (§3.11.1)
a320-3.11.2 IC operational max FDP: 14h; EB: 12h (§3.11.2)
a320-3.12   EB IC max landings: 3 (§3.12)
a320-3.14.1 Continental min rest (operating) (§3.14.1)
a320-3.14.2 IC/TA min rest (operating) (§3.14.2)
a320-3.14.4 Unscheduled overnight rest (§3.14.4)
a320-3.17.2 STBH elapsed limits + FDP credit (§3.17.2)
a320-3.17.5 Rest after standby (§3.17.5)
a320-3.18   Delayed TTN trigger (§3.18)
```

### EASA articles (`data/wb/easa-ftl.json`)

The existing file already contains all 8 articles. Shared between both fleets.

```
ORO.FTL.105   Definitions
ORO.FTL.205(b) Basic max FDP Table 1
ORO.FTL.205(d) Extension without in-flight rest
ORO.FTL.205(e) Extension with in-flight rest (augmented)
ORO.FTL.210   Rest period
ORO.FTL.215   Cumulative limits
ORO.FTL.225   Standby
ORO.FTL.230   Commander's discretion
```

---

## EASA FTL Quick Reference (both fleets)

### Table 1 — Max Basic FDP (acclimatised, ORO.FTL.205(b))

| FDP Start | 1–2 sectors | 3 sectors | 4 sectors | 5 sectors | 6+ sectors |
|---|---|---|---|---|---|
| 06:00–13:59 | 13:00 | 12:30 | 12:00 | 11:30 | 11:00 |
| 14:00–21:59 | 12:00 | 11:30 | 11:00 | 10:30 | 10:00 |
| 22:00–05:59 | 11:00 | 10:30 | 10:00 | 09:30 | 09:00 |

Unknown acclimatisation: −1h throughout.

### Augmented FDP extensions (ORO.FTL.205(e))

| Extra crew | Class 3 | Class 2 | Class 1 (flat bunk) |
|---|---|---|---|
| +1 pilot | 14h | 15h | 16h |
| +2 pilots | 15h | 16h | 17h |

### Annual limits (ORO.FTL.215)
- Flight time: 100h / 28 days · 900h / year · 1000h / 12 months
- Duty: 60h / 7 days · 110h / 14 days · 190h / 28 days
- Days off: ≥7 / month · ≥96 / year

### WOCL
- **02:00–05:59** local
- ≤3 time zones from base: home base time
- >3 time zones: home base time for first 48h, then local time

---

## WB Key Values Complete Reference

### Planning limits
| Rule | Value | Clause |
|---|---|---|
| Max consecutive duty days | 6 | §2.2.1 |
| Max duty days per year | 208 | §2.2.2 |
| Max transatlantic duties per year | 58 | §2.2.3 |
| Min days off per RP | 9 | §2.5.6 |
| Min days off per RP (≥5 AL days) | 8 | §2.5.7 |
| Min days off after IC | 2 | §2.5.3 |
| Min days off after augmented IC | 3 | §2.5.4 |
| Standard 2-pilot FDP | 12h | §2.15.1 |
| Eastbound / TTN N-S FDP | 11h | §2.15.2 |
| Augmented FDP (outside WOCL) | 15h (max −2h WOCL) | §2.15.3 |
| Augmented FDP (no cockpit rest) | 14h WB / 13h EB | §2.15.4 |
| Heavy crew FDP | 17h | §2.15.5 |
| Pre-IC rest | 15h (13h after STBH) | §2.22.2 |
| Flight prep departing Ireland | 75 min | §2.12.1 |
| Flight prep all other | 60 min | §2.12.2 |
| Customs IC | 30 min | §2.4.1 |
| Customs continental | 20 min | §2.4.2 |
| Extended duties / year | 5 (+1h with relief pilot) | §2.9.1 |
| Separation between extended duties | 14 days | §2.9.4 |
| Extended positioning per RP | 1 | §2.11.4 |
| STBB max per year | 6 blocks | §2.21.9 |
| STBB duration | 5–6 days | §2.21.5 |
| STBB max per duty | 10h | §2.21.13 |
| Report from standby | within 2h | §2.21.11 |
| Peremptory requests per year | 3 | §2.19.1 |
| Annual leave | 35 days | §2.20.1 |

### Stick time (§2.27)
| Scenario | Limit |
|---|---|
| Single sector westbound | 9h 00m |
| Single sector eastbound | 8h 00m |
| Multi-sector westbound / N-S day | 9h 30m |
| Multi-sector eastbound / TTN N-S | 8h 30m |
| Florida (single or multi) outside WOCL | 9h 45m |
| Florida (single or multi) into WOCL | 8h 45m |

### Rest minimums
| Scenario | Formula | Min | Clause |
|---|---|---|---|
| Pre-IC | — | 15h | §2.22.2 |
| Pre-IC (preceded by STBH) | — | 13h | §3.13.1 |
| Pre-N/S | preceding duty + 4h | 14h | §2.23.1 |
| Post-IC (base) | actual FDP + std time diff | 18h | §3.13.2 |
| Post-IC (EB outstation) | actual duty + std time diff | 14h | §3.13.5 |
| Post-continental (base) | actual duty + 2h | 12h | §3.13.7.1 |
| Post-continental (outstation) | actual duty + 2h | 11h | §3.13.7.2 |
| Post-TTN continental | actual duty + 4h | 14h | §3.13.7.3 |
| Post-N/S (base) | actual duty + 4h | 15h | §2.23.3 |
| Post-N/S (outstation) | actual duty + 4h | 14h | §2.23.2 |
| South Africa outstation | 2 local nights | 40h | §2.24.1 |
| After standby | — | 13h | §3.16.10 |

### WB compensation rates (§3.14.1)
| Type | Rate |
|---|---|
| Working on a free day | 0.57% |
| Working on a gash day | 0.38% |
| Agreed OWC duty | 0.19% |
| Short rest (less first 30 min) | 0.19% |

---

## A320 Key Values Complete Reference

### Planning limits
| Rule | Value | Clause |
|---|---|---|
| Max consecutive duty days | 5 | §2.10.1 |
| Max consecutive duty days (B2B TA) | 6 | §2.10.7 |
| Max TTN in succession | 2 per 14 days | §2.20.1 |
| 2× TTN aggregate | 14h 30m | §2.20.2 |
| Second TTN max | 7h 15m | §2.20.3 |
| Continental landings | 6 max (7 if 3 sectors <1h each) | §2.9.1 |
| IC landings | 4 max | §2.9.2 |
| EB IC landings (operating max) | 3 | §3.12 |
| EB IC landings (planning) | 2 | §2.9.2 |
| Flight prep continental | 55 min | §2.7.1 |
| Flight prep IC westbound | 75 min | §2.7.2 |
| Flight prep IC eastbound | 60 min | §2.7.2 |
| Customs continental | 20 min | §2.3.1 |
| Customs IC | 20 min | §2.3.2 |
| FDP 0100–0459 | 10h 10m | §2.10.4(a) |
| FDP 2-sector 0500–0549 | 11h 00m | §2.10.4(b) |
| FDP 3+ sectors 0500–0549 | 10h 10m | §2.10.4(c) |
| FDP 0550–0619 | 11h 10m | §2.10.4(d) |
| FDP 0620–0059 | 12h 00m | §2.10.4(e) |
| IC FDP | 12h | §2.10.5(a) |
| EB TA FDP | 12h (augmented: 13h) | §2.10.5(b/c) |
| EI840-822 coupling | 11h 15m (delayed ≥0600: 12h) | §2.10.3 |
| Extended continental per year | 8 (+1h) | §2.11.1(a) |
| Max night extended per year | 2 | §2.11.1(b) |
| Separation cont extended (day) | 7 days | §2.11.1(h) |
| Separation cont extended (night) | 14 days | §2.11.1(i) |
| Extended IC per year | 5 (to 13h) | §2.11.3(a) |
| Separation IC extended | 14 days | §2.11.3(b) |
| Extended deadhead continental | 14h max; operate ≤11h | §2.11.2 |
| Extended deadhead IC | 16h (EB TA: 14h); operate ≤11h | §2.11.4 |
| STBA max | 9h | §2.16.1(c) |
| STBH max | 10h | §2.16.2 |
| STBH max per week | 2 | §2.16.2 |
| Peremptory requests per year | 3 (each reduces AL by 1 day) | §2.15.2(a) |
| Min turnaround at Dublin (same aircraft) | 25 min | §2.22 |

### Operational max FDP on delays (§3.11.1)
| Scenario | Max |
|---|---|
| Starts 0100–0549 or terminates 0200–0634 | 11h 30m |
| Starts 0550–0619 | 12h 00m |
| Falls entirely 0620–0159 | 13h 00m (−30m per sector from 3rd, max −2h) |
| IC delay max | 14h |
| EB TA delay max | 12h |

### A320 rest minimums
| Scenario | Formula | Min | Clause |
|---|---|---|---|
| Post-continental (base) | actual duty + 2h | 12h | §3.14.1(a) |
| Post-continental (outstation) | actual duty + 2h | 11h | §3.14.1(b) |
| Post-TTN (or delayed to 0330) | actual duty + 4h | 14h | §3.14.1(c) |
| Pre-IC | — | 15h | §3.14.2(a) |
| Post-WB TA | actual duty + std time diff | 18h | §3.14.2(b) |
| WB→EB turnaround | — | 18h free of duty | §2.17.2(a) |
| Post-EB TA outstation | actual duty + std time diff | 14h | §3.14.2(e) |
| Post standby (no duty) | — | 12h | §3.17.5(a) |
| Post standby (duty assigned) | actual duty + 2h | 12h | §3.17.5(b) |
| Unscheduled overnight | normal; may −1h if meal in prior 3h | — | §3.14.4 |

### A320 compensation rates (§3.3.1 / §3.2.3)
| Type | Rate |
|---|---|
| OWC agreed duty | 0.19% |
| Finish 61–120m late (continental) | 0.19% OWC |
| Finish >2h late (continental or IC) | 1 day off or Blue Sheet |

---

## Dependencies

```json
{
  "dependencies": {
    "expo": "~54.0.0",
    "expo-router": "~4.0.0",
    "expo-asset": "~10.0.6",
    "expo-status-bar": "~2.0.0",
    "react-native": "0.76.x",
    "nativewind": "^4.0.0",
    "tailwindcss": "^3.4.0",
    "zustand": "^4.5.2",
    "react-native-mmkv": "^2.12.2",
    "react-native-pdf": "^6.7.3",
    "react-native-blob-util": "^0.19.6",
    "fuse.js": "^7.0.0",
    "lucide-react-native": "^0.383.0",
    "react-native-svg": "^15.0.0"
  }
}
```

Install:
```bash
npx expo install react-native-pdf react-native-blob-util expo-asset react-native-svg
npm install fuse.js zustand react-native-mmkv nativewind tailwindcss lucide-react-native
```

---

## Disclaimer

> This app is an unofficial reference tool for informational purposes only. It is not a substitute
> for the official Working Conditions agreements, EASA ORO.FTL regulations, or advice from IALPA.
> Always verify against the current official documents. In the event of any discrepancy between
> this app and the official working conditions or EASA regulations, the official documents prevail.
>
> A330/A350 Widebody Working Conditions 2025 (signed 10/09/2025) ·
> A320/321/(Neo) Working Conditions May 2018 ·
> EASA EU 965/2012 as amended by EU 83/2014.

---

## Build Checklist — Files Still To Create

- [ ] `assets/docs/330.pdf` — copy from `assets/rules.pdf`
- [ ] `assets/docs/320.pdf` — copy from `assets/rules-a320.pdf`
- [ ] `data/wb/working-conditions.json` — move from `data/working-conditions.json`
- [ ] `data/wb/easa-ftl.json` — move from `data/easa-ftl.json`
- [ ] `data/wb/destinations.json` — move from `data/destinations.json`
- [ ] `data/a320/working-conditions.json` — build from A320 clause list above
- [ ] `tailwind.config.js` — colour tokens from §Colour Tokens
- [ ] `app.json` — expo-asset plugin with both PDF paths
- [ ] `hooks/useFleet.ts` — full implementation above
- [ ] `hooks/useCoefficient.ts` — full implementation above
- [ ] `hooks/useBookmarks.ts` — MMKV-persisted bookmarked clause IDs
- [ ] `hooks/useSearch.ts` — wraps buildSearchIndex + fleet
- [ ] `lib/calculators-wb.ts` — all WB functions (FDP/rest/standby/delay/coefficient)
- [ ] `lib/calculators-a320.ts` — all A320 functions
- [ ] `lib/calculators-easa.ts` — shared EASA Table 1 + augmented lookups
- [ ] `lib/search.ts` — full fleet-aware implementation above
- [ ] `components/FleetBadge.tsx` — full implementation above
- [ ] `components/RuleCard.tsx` — full implementation above
- [ ] `components/BindingBanner.tsx`
- [ ] `components/SectionHeader.tsx`
- [ ] `components/ClauseRef.tsx`
- [ ] `components/SearchBar.tsx`
- [ ] `app/_layout.tsx` — update to use FleetBadge in header
- [ ] `app/(tabs)/index.tsx` — fleet-aware home screen
- [ ] `app/(tabs)/calculators.tsx` — calculator hub with fleet-aware visibility
- [ ] `app/(tabs)/rules.tsx` — fleet-aware rules browser (replace existing)
- [ ] `app/(tabs)/document.tsx` — fleet-aware PDF viewer (replace existing)
- [ ] `app/(tabs)/settings.tsx` — fleet selector + preferences + about
- [ ] `app/calculators/fdp.tsx` — fleet-aware (replace existing WB-only version)
- [ ] `app/calculators/rest.tsx`
- [ ] `app/calculators/days-off.tsx`
- [ ] `app/calculators/route.tsx`
- [ ] `app/calculators/standby.tsx`
- [ ] `app/calculators/delay.tsx`
- [ ] `app/calculators/coefficient.tsx`
- [ ] `app/rule/[id].tsx` — already built, verify fleet-awareness

---