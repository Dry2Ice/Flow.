import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { AppState } from './types';
import { createSessionsSlice, DEFAULT_SESSION_ID, rehydrateDefaultSessionMessages } from './slices/sessions';
import { createProjectsSlice } from './slices/projects';
import { createAIQueueSlice } from './slices/ai-queue';
import { createGitSlice } from './slices/git';
import { createSettingsSlice, saveActivePresetId, savePromptPresets } from './slices/settings';
import { createEmbeddingSlice } from './slices/embedding';

const isClient = typeof window !== 'undefined';

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    ...createSessionsSlice(set as any, get as any),
    ...createProjectsSlice(set as any, get as any),
    ...createAIQueueSlice(set as any, get as any),
    ...createGitSlice(set as any, get as any),
    ...createSettingsSlice(set as any, get as any),
    ...createEmbeddingSlice(set as any, get as any),
  }))
);

rehydrateDefaultSessionMessages((updater) => useAppStore.setState(updater));

if (isClient) {
  useAppStore.subscribe(
    (state) => state.promptPresets,
    (promptPresets) => savePromptPresets(promptPresets)
  );

  useAppStore.subscribe(
    (state) => state.activePreset?.id ?? null,
    (activePresetId) => saveActivePresetId(activePresetId)
  );
}

export * from './types';
export { DEFAULT_SESSION_ID };
