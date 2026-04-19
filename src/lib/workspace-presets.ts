import { WorkspacePreset } from '@/types';

export const WORKSPACE_LAYOUT_STORAGE_KEY = 'flow.dockview-layout.v1';
export const WORKSPACE_PRESETS_STORAGE_KEY = 'flow.workspace-presets.v1';
export const ACTIVE_WORKSPACE_PRESET_STORAGE_KEY = 'flow.active-workspace-preset-id.v1';

const isClient = typeof window !== 'undefined';

interface SerializedWorkspacePreset extends Omit<WorkspacePreset, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

const isValidDate = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value));

export const serializeWorkspacePresets = (presets: WorkspacePreset[]): string => {
  const payload: SerializedWorkspacePreset[] = presets.map((preset) => ({
    ...preset,
    createdAt: preset.createdAt.toISOString(),
    updatedAt: preset.updatedAt.toISOString(),
  }));

  return JSON.stringify(payload);
};

export const deserializeWorkspacePresets = (value: string): WorkspacePreset[] => {
  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is SerializedWorkspacePreset => {
        return (
          typeof entry?.id === 'string'
          && typeof entry?.name === 'string'
          && entry?.layout !== undefined
          && isValidDate(entry?.createdAt)
          && isValidDate(entry?.updatedAt)
          && typeof entry?.isReadonly === 'boolean'
          && (entry?.scope === 'global' || entry?.scope === 'project')
          && (entry?.projectId === undefined || typeof entry?.projectId === 'string')
        );
      })
      .map((entry) => ({
        ...entry,
        createdAt: new Date(entry.createdAt),
        updatedAt: new Date(entry.updatedAt),
      }));
  } catch (error) {
    console.error('Failed to deserialize workspace presets:', error);
    return [];
  }
};

export const loadWorkspacePresets = (): WorkspacePreset[] => {
  if (!isClient) return [];

  const raw = localStorage.getItem(WORKSPACE_PRESETS_STORAGE_KEY);
  if (!raw) return [];

  return deserializeWorkspacePresets(raw);
};

export const saveWorkspacePresets = (presets: WorkspacePreset[]) => {
  if (!isClient) return;

  localStorage.setItem(WORKSPACE_PRESETS_STORAGE_KEY, serializeWorkspacePresets(presets));
};

export const loadActiveWorkspacePresetId = (): string | null => {
  if (!isClient) return null;

  return localStorage.getItem(ACTIVE_WORKSPACE_PRESET_STORAGE_KEY);
};

export const saveActiveWorkspacePresetId = (presetId: string | null) => {
  if (!isClient) return;

  if (!presetId) {
    localStorage.removeItem(ACTIVE_WORKSPACE_PRESET_STORAGE_KEY);
    return;
  }

  localStorage.setItem(ACTIVE_WORKSPACE_PRESET_STORAGE_KEY, presetId);
};

export const loadDraftLayout = (): unknown | null => {
  if (!isClient) return null;

  const raw = localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse workspace draft layout:', error);
    return null;
  }
};

export const saveDraftLayout = (layout: unknown | null) => {
  if (!isClient) return;

  if (layout === null) {
    localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY);
    return;
  }

  localStorage.setItem(WORKSPACE_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
};
