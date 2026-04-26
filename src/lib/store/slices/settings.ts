import { PromptPreset } from '@/types';
import { embeddingService } from '@/lib/embedding-service';
import { SettingsSlice, StoreGet, StoreSet } from '../types';

const PROMPT_PRESETS_STORAGE_KEY = 'flow-prompt-presets';
const ACTIVE_PRESET_STORAGE_KEY = 'flow-active-preset-id';
const isClient = typeof window !== 'undefined';

const DEFAULT_PROMPT_PRESETS: PromptPreset[] = [
  {
    id: 'debug',
    name: 'Bug Detection & Fixing',
    description: 'Search for bugs, analyze code issues, and suggest fixes',
    systemPrompt: `You are an expert software engineer specializing in debugging and code quality. Your task is to:\n\n1. Analyze the provided code and project files for potential bugs, security issues, and code quality problems\n2. Identify specific problems with line numbers and explanations\n3. Suggest concrete fixes with code examples\n4. Explain the reasoning behind each suggested change\n5. Prioritize critical issues that could cause runtime errors or security vulnerabilities\n\nWhen analyzing the project, consider:\n- Logic errors and edge cases\n- Type safety issues\n- Performance bottlenecks\n- Security vulnerabilities\n- Code maintainability\n- Best practices compliance\n\nProvide actionable recommendations that can be implemented immediately.`,
  },
  {
    id: 'analyze',
    name: 'Analysis',
    description: 'Deep project analysis and planning',
    systemPrompt: `You are an expert software architect performing a deep code review.\nAnalyze the provided codebase thoroughly and return a structured analysis.\nYour response MUST be valid JSON matching this schema exactly:\n{\n  "summary": "string",\n  "architecture": "string",\n  "framework": "string",\n  "complexity": "low|medium|high|very_high",\n  "keyComponents": ["string"],\n  "dependencies": ["string"],\n  "patterns": ["string"],\n  "insights": ["string"],\n  "recommendations": ["string"],\n  "suggestedTasks": [{ "title": "string", "description": "string", "priority": "high|medium|low" }]\n}\nReturn ONLY the JSON object, no markdown, no preamble.`,
  },
  {
    id: 'develop',
    name: 'Active Development',
    description: 'Implement features, make changes, and enhance functionality',
    systemPrompt: `You are a skilled software developer ready to implement features and make code changes. Your task is to:\n\n1. Understand the user's requirements and current codebase context\n2. Implement requested features with clean, maintainable code\n3. Follow existing code patterns and conventions\n4. Ensure type safety and error handling\n5. Provide complete, working solutions that integrate well with existing code\n6. Create appropriate tests when needed\n7. Update documentation if necessary\n\nWhen making changes:\n- Preserve existing functionality\n- Follow the established architecture and patterns\n- Write self-documenting code with clear variable names\n- Handle edge cases and error conditions\n- Optimize for performance where appropriate\n- Ensure compatibility with existing dependencies\n\nDeliver production-ready code that solves the user's problem effectively.`,
  },
];

const loadPromptPresets = (): PromptPreset[] => {
  if (!isClient) return DEFAULT_PROMPT_PRESETS;
  const saved = localStorage.getItem(PROMPT_PRESETS_STORAGE_KEY);
  if (!saved) return DEFAULT_PROMPT_PRESETS;

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return DEFAULT_PROMPT_PRESETS;

    return parsed.filter((preset): preset is PromptPreset => (
      typeof preset?.id === 'string'
      && typeof preset?.name === 'string'
      && typeof preset?.description === 'string'
      && typeof preset?.systemPrompt === 'string'
    ));
  } catch (error) {
    console.error('Failed to parse saved prompt presets:', error);
    return DEFAULT_PROMPT_PRESETS;
  }
};

const loadActivePresetId = (): string | null => {
  if (!isClient) return null;
  return localStorage.getItem(ACTIVE_PRESET_STORAGE_KEY);
};

export const savePromptPresets = (promptPresets: PromptPreset[]) => {
  if (!isClient) return;
  localStorage.setItem(PROMPT_PRESETS_STORAGE_KEY, JSON.stringify(promptPresets));
};

export const saveActivePresetId = (presetId: string | null) => {
  if (!isClient) return;
  if (presetId) {
    localStorage.setItem(ACTIVE_PRESET_STORAGE_KEY, presetId);
    return;
  }
  localStorage.removeItem(ACTIVE_PRESET_STORAGE_KEY);
};

const initialPromptPresets = loadPromptPresets();
const initialActivePresetId = loadActivePresetId();
const initialActivePreset = initialPromptPresets.find((preset) => preset.id === initialActivePresetId) ?? null;

export const createSettingsSlice = (set: StoreSet, get: StoreGet): SettingsSlice => ({
  promptPresets: initialPromptPresets,
  activePreset: initialActivePreset,
  embeddingConfig: null,
  ultraModeActive: false,

  setActivePreset: (preset) => set({ activePreset: preset }),

  updatePromptPreset: (presetId, patch) => {
    set((state) => {
      const nextPromptPresets = state.promptPresets.map((preset) => (preset.id === presetId ? { ...preset, ...patch } : preset));
      const nextActivePreset = state.activePreset?.id === presetId
        ? nextPromptPresets.find((preset) => preset.id === presetId) ?? state.activePreset
        : state.activePreset;

      return { promptPresets: nextPromptPresets, activePreset: nextActivePreset };
    });
  },

  setEmbeddingConfig: (config) => {
    if (config) embeddingService.setConfig(config);
    set({ embeddingConfig: config });
  },
});
