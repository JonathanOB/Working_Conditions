import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BookmarkStore {
  bookmarked: string[];    // clause IDs
  toggle: (id: string) => void;
  isBookmarked: (id: string) => boolean;
  clear: () => void;
}

export const useBookmarkStore = create<BookmarkStore>()(
  persist(
    (set, get) => ({
      bookmarked: [],
      toggle: (id) =>
        set((s) => ({
          bookmarked: s.bookmarked.includes(id)
            ? s.bookmarked.filter((x) => x !== id)
            : [...s.bookmarked, id],
        })),
      isBookmarked: (id) => get().bookmarked.includes(id),
      clear: () => set({ bookmarked: [] }),
    }),
    {
      name: 'pilot-bookmarks',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export const useBookmarks = () => useBookmarkStore((s) => s.bookmarked);
export const useToggleBookmark = () => useBookmarkStore((s) => s.toggle);
export const useIsBookmarked = (id: string) => useBookmarkStore((s) => s.bookmarked.includes(id));
