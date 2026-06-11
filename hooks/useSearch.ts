import { useState, useCallback } from 'react';
import { searchRules, type SearchableRule } from '../lib/search';
import { useFleet } from './useFleet';

export interface SearchResult {
  item: SearchableRule;
  score: number;
}

export function useSearch() {
  const fleet = useFleet();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  const search = useCallback(
    (q: string) => {
      setQuery(q);
      if (q.trim().length < 2) {
        setResults([]);
        return;
      }
      const found = searchRules(q, fleet);
      setResults(found);
    },
    [fleet]
  );

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  return { query, results, search, clear };
}
