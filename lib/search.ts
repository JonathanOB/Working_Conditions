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
    ? (require('../data/wb/working-conditions.json') as any[]).map((c: any) => ({ ...c, fleet: 'wb' as const }))
    : (require('../data/a320/working-conditions.json') as any[]).map((c: any) => ({ ...c, fleet: 'a320' as const }));

  const easaData: SearchableRule[] = (require('../data/wb/easa-ftl.json') as any[]).map((a: any) => ({ ...a, fleet: 'easa' as const }));

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

export function searchRules(query: string, fleet: Fleet): Array<{ item: SearchableRule; score: number }> {
  if (query.trim().length < 2) return [];
  return buildSearchIndex(fleet).search(query.trim()).map(r => ({ item: r.item, score: r.score ?? 1 }));
}

export function getRuleById(id: string, fleet: Fleet): SearchableRule | undefined {
  const all = getAllRules(fleet);
  return all.find(r => r.id === id);
}

export function getAllRules(fleet: Fleet): SearchableRule[] {
  const wc: SearchableRule[] = fleet === 'wb'
    ? (require('../data/wb/working-conditions.json') as any[]).map((c: any) => ({ ...c, fleet: 'wb' as const }))
    : (require('../data/a320/working-conditions.json') as any[]).map((c: any) => ({ ...c, fleet: 'a320' as const }));
  const easa: SearchableRule[] = (require('../data/wb/easa-ftl.json') as any[]).map((a: any) => ({ ...a, fleet: 'easa' as const }));
  return [...wc, ...easa];
}

export function getRulesByTag(tag: string, fleet: Fleet): SearchableRule[] {
  return getAllRules(fleet).filter(r => r.tags.includes(tag));
}

export function getRulesBySection(section: number, fleet: Fleet): SearchableRule[] {
  const wc: SearchableRule[] = fleet === 'wb'
    ? (require('../data/wb/working-conditions.json') as any[]).map((c: any) => ({ ...c, fleet: 'wb' as const }))
    : (require('../data/a320/working-conditions.json') as any[]).map((c: any) => ({ ...c, fleet: 'a320' as const }));
  return wc.filter(r => r.section === section);
}
