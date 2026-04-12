export const UI_PREFERENCES_KEY = 'flow-ui-preferences';

export interface UiPreferences {
  autoRefreshSeconds: number;
  showAdvancedStats: boolean;
}

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  autoRefreshSeconds: 30,
  showAdvancedStats: true,
};

const isClient = typeof window !== 'undefined';

export function loadUiPreferences(): UiPreferences {
  if (!isClient) {
    return DEFAULT_UI_PREFERENCES;
  }

  const saved = localStorage.getItem(UI_PREFERENCES_KEY);
  if (!saved) {
    return DEFAULT_UI_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(saved) as Partial<UiPreferences>;

    return {
      autoRefreshSeconds:
        typeof parsed.autoRefreshSeconds === 'number' && parsed.autoRefreshSeconds > 0
          ? parsed.autoRefreshSeconds
          : DEFAULT_UI_PREFERENCES.autoRefreshSeconds,
      showAdvancedStats:
        typeof parsed.showAdvancedStats === 'boolean'
          ? parsed.showAdvancedStats
          : DEFAULT_UI_PREFERENCES.showAdvancedStats,
    };
  } catch (error) {
    console.error('Failed to load UI preferences:', error);
    return DEFAULT_UI_PREFERENCES;
  }
}

export function saveUiPreferences(preferences: UiPreferences) {
  if (!isClient) {
    return;
  }

  localStorage.setItem(UI_PREFERENCES_KEY, JSON.stringify(preferences));
}
