import { CONTRACTS, Contract } from './rules';
import type { Lang } from './i18n';

export interface Settings {
  lang: Lang;
  mode: 'play' | 'watch';
  contract: Contract | 'random';
  every: 1 | 2 | 3;
  showDoubles: boolean;
}

export const DEFAULT_SETTINGS: Settings = { lang: 'en', mode: 'play', contract: 'random', every: 2, showDoubles: true };

const KEY = 'trix-trainer-settings-v1';

/** Reads saved settings. Works even when storage is blocked (private mode). */
export function loadSettings(): Settings {
  const fallback: Settings = {
    ...DEFAULT_SETTINGS,
    lang: typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en',
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const s = JSON.parse(raw) as Partial<Settings>;
    return {
      lang: s.lang === 'ar' || s.lang === 'en' ? s.lang : fallback.lang,
      mode: s.mode === 'watch' ? 'watch' : 'play',
      contract: s.contract === 'random' || CONTRACTS.includes(s.contract as Contract) ? (s.contract as Settings['contract']) : 'random',
      every: s.every === 1 || s.every === 3 ? s.every : 2,
      showDoubles: s.showDoubles !== false,
    };
  } catch {
    return fallback;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable: settings just won't be remembered.
  }
}
