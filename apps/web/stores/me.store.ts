import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface MeState {
  // User Sessions state
  sessionsPage: number;
  sessionsLimit: number;
  sessionsSearch: string;

  // Actions - User Sessions
  setSessionsPage: (page: number) => void;
  setSessionsLimit: (limit: number) => void;
  setSessionsSearch: (search: string) => void;

  // Reset
  resetSessionsState: () => void;
}

export const useMeStore = create<MeState>()(
  devtools(
    (set) => ({
      // Initial state - User Sessions
      sessionsPage: 1,
      sessionsLimit: 10,
      sessionsSearch: '',

      // Actions - User Sessions
      setSessionsPage: (page) => set({ sessionsPage: page }),
      setSessionsLimit: (limit) => set({ sessionsLimit: limit, sessionsPage: 1 }),
      setSessionsSearch: (search) => set({ sessionsSearch: search, sessionsPage: 1 }),

      // Reset
      resetSessionsState: () =>
        set({
          sessionsPage: 1,
          sessionsLimit: 10,
          sessionsSearch: '',
        }),
    }),
    { name: 'grant-me-store' }
  )
);
