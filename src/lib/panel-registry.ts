export interface PanelRegistryEntry {
  id: string;
  defaultTitle: string;
  componentKey: string;
  icon: string;
  isSystem: boolean;
}

export interface SerializedDockviewPanel {
  id: string;
  title: string;
  contentComponent: string;
  tabComponent?: string;
  params?: Record<string, unknown>;
}

export type SerializedDockviewPanels = Record<string, SerializedDockviewPanel>;

export const PANEL_REGISTRY: Record<string, PanelRegistryEntry> = {
  files: {
    id: 'files',
    defaultTitle: '📁 Files',
    componentKey: 'files',
    icon: '📁',
    isSystem: true,
  },
  projects: {
    id: 'projects',
    defaultTitle: '🗂 Projects',
    componentKey: 'projects',
    icon: '🗂',
    isSystem: true,
  },
  editor: {
    id: 'editor',
    defaultTitle: '✏️ Editor',
    componentKey: 'editor',
    icon: '✏️',
    isSystem: true,
  },
  preview: {
    id: 'preview',
    defaultTitle: '👁 Preview',
    componentKey: 'preview',
    icon: '👁',
    isSystem: true,
  },
  chat: {
    id: 'chat',
    defaultTitle: '💬 AI Chat',
    componentKey: 'chat',
    icon: '💬',
    isSystem: true,
  },
  logs: {
    id: 'logs',
    defaultTitle: '📋 Logs',
    componentKey: 'logs',
    icon: '📋',
    isSystem: true,
  },
  plan: {
    id: 'plan',
    defaultTitle: '🎯 Dev Plan',
    componentKey: 'plan',
    icon: '🎯',
    isSystem: true,
  },
};

const toTrimmedTitle = (value: string): string => value.trim();

export function normalizeUniqueTitles(
  panels: SerializedDockviewPanels
): SerializedDockviewPanels {
  const titleCount = new Map<string, number>();
  const normalizedPanels: SerializedDockviewPanels = {};

  for (const [key, panel] of Object.entries(panels)) {
    const baseTitle = toTrimmedTitle(panel.title) || panel.id;
    const currentCount = titleCount.get(baseTitle) ?? 0;
    const nextCount = currentCount + 1;
    titleCount.set(baseTitle, nextCount);

    normalizedPanels[key] = {
      ...panel,
      title: nextCount === 1 ? baseTitle : `${baseTitle} (${nextCount})`,
    };
  }

  return normalizedPanels;
}
