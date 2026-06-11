# PilotRules

An unofficial reference tool for Air ******* pilots covering EASA ORO.FTL flight time limitations and fleet-specific Working Conditions agreements. Built as a mobile-first React Native app using Expo.

> **Disclaimer:** This app is an unofficial reference tool for informational purposes only. It is not a substitute for the official Working Conditions agreements, EASA ORO.FTL regulations, or advice from (union). Always verify against the current official documents. In the event of any discrepancy between this app and the official documents, the official documents prevail.

---

## Features

### Fleet Support

Two fleet profiles, switchable at any time in Settings:

| Fleet | Working Conditions |
|---|---|
| A330 Widebody | WC 2025 (signed 10/09/2025) |
| A320/321/(Neo) Narrowbody | WC May 2018 |

All calculators and the rules browser update automatically on fleet switch.

### Calculators

| Calculator | Description |
|---|---|
| **FDP** | Maximum flight duty period from report time, sectors, duty type, and rest facility. Computes the binding limit from `min(EASA, WC)` with full clause references. |
| **Rest** | Minimum rest periods for all scenario types — pre-duty, post-duty, outstation turnarounds, standby. Shows EASA floor and WC requirement separately. |
| **Standby Decoder** | Decodes STBH, STBA, STBB, and K-duty standby. Given a standby start, call time, and report time, automatically calculates the max FDP (no manual entry required), FDP credit consumed, remaining FDP, and latest finish time. |
| **Delay** | Disruption impact calculator. Determines effective FDP start time after a delay, maximum FDP ceiling, and any compensation entitlements. |
| **Days Off** | Days off entitlement and coefficient bank credit for widebody destinations, including west coast, Florida, and South Africa rules. |
| **Route** | Destination lookup for widebody-specific rest and days-off rules. |
| **Coefficient** | Running coefficient bank balance tracker across the roster year. |
| **OWC** | Outside Working Conditions payment calculator — free days, gash days, agreed duties, and short rest infringements. |
| **Performance Pay** | Three-tab calculator (13 Roster Periods · Yearly Total · Quick Check). Automatically takes the greater of the roster-period and annual calculation methods. |

### Rules Browser

Full searchable browser of EASA ORO.FTL and fleet Working Conditions clauses, navigable by section, topic, or regulation source. Individual clauses are bookmarkable and deep-linkable from calculators.

### Documents

In-app PDF viewer for the Working Conditions agreements, with bookmarks to key sections.

---

## Tech Stack

- **Framework:** [Expo](https://expo.dev) SDK 54 (managed workflow)
- **Navigation:** expo-router v6 (file-based)
- **Language:** TypeScript (strict)
- **State:** Zustand
- **Search:** Fuse.js
- **UI:** React Native (no UI library — all custom components)

---

## Project Structure

```
app/
  (tabs)/         # Bottom tab screens (Home, Calculators, Rules, Document, Settings)
  calculators/    # Individual calculator screens
  rule/           # Deep-linked rule detail screen
lib/
  calculators-easa.ts   # EASA ORO.FTL shared logic (Table B FDP, rest minima, WOCL)
  calculators-wb.ts     # A330 widebody calculator logic
  calculators-a320.ts   # A320 narrowbody calculator logic
  fleet.ts              # Fleet type definitions and labels
  search.ts             # Fuse.js search index
components/       # Shared UI components (FleetBadge, SectionHeader, TimePicker, …)
hooks/            # useFleet, useCoefficient, useBookmarks, useSearch
```

---

## Regulatory Basis

- **EASA:** Commission Regulation (EU) No 965/2012 as amended by (EU) No 83/2014 — Annex III (ORO), Subpart FTL
- **Widebody WC:** Air ******* / Union Widebody Working Conditions
- **Narrowbody WC:** Air ******* / Union Narrowbody Working Conditions

Calculations implement the binding limit as `min(EASA maximum, WC maximum)` — the more restrictive of the two always applies.

---

## Getting Started

```bash
npm install
npx expo start
```

Requires Node 18+ and the Expo Go app or a local simulator.

---

## License

Private — not for distribution.
