import { create } from 'zustand';
import { Settings } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/constants';

interface SettingsState {
  settings: Settings;
  loaded: boolean;
  setSettings: (settings: Settings) => void;
  updateSettings: (updates: Partial<Settings>) => void;
  setLoaded: (loaded: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  setSettings: (settings) => set({ settings, loaded: true }),
  updateSettings: (updates) =>
    set((state) => ({ settings: { ...state.settings, ...updates } })),
  setLoaded: (loaded) => set({ loaded }),
}));
