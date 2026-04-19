export const WORKSPACE_STORAGE_VERSION = 3;

export interface GroupData {
  id: string;
  views: string[];
  activeView?: string;
}

export interface BranchNode {
  type: 'branch';
  orientation: 'VERTICAL' | 'HORIZONTAL';
  data: GridNode[];
  size?: number;
  visible?: boolean;
}

export interface LeafNode {
  type: 'leaf';
  data: GroupData;
  size?: number;
  visible?: boolean;
}

export type GridNode = BranchNode | LeafNode;

export interface SerializedDockviewPanel {
  id: string;
  title: string;
  contentComponent: string;
  tabComponent?: string;
  params?: Record<string, unknown>;
}

export interface DockviewLayout {
  grid: {
    root: GridNode;
  };
  panels: Record<string, SerializedDockviewPanel>;
  activeGroup?: string;
}

export interface WorkspacePreset {
  id: string;
  name: string;
  layout: DockviewLayout;
  createdAt: string;
  updatedAt: string;
  isRecovery?: boolean;
}

export interface WorkspacePresetsEnvelope {
  version: number;
  presets: WorkspacePreset[];
  activePresetId: string;
}

interface WorkspaceStorageV2 {
  presets: WorkspacePreset[];
  activePresetId?: string;
}

export interface WorkspaceMigrationResult {
  envelope: WorkspacePresetsEnvelope;
  didRecover: boolean;
}

const PANEL_TITLES = {
  files: '📁 Files',
  projects: '🗂 Projects',
  editor: '✏️ Editor',
  preview: '👁 Preview',
  chat: '💬 AI Chat',
  logs: '📋 Logs',
  plan: '🎯 Dev Plan',
} as const;

const nowIso = () => new Date().toISOString();

const makePresetId = () => `workspace-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const withValidTimestamps = (preset: WorkspacePreset): WorkspacePreset => ({
  ...preset,
  createdAt: preset.createdAt || nowIso(),
  updatedAt: preset.updatedAt || nowIso(),
});

export const DEFAULT_LAYOUT: DockviewLayout = {
  grid: {
    root: {
      type: 'branch',
      orientation: 'VERTICAL',
      data: [
        {
          type: 'branch',
          orientation: 'HORIZONTAL',
          size: 70,
          data: [
            {
              type: 'leaf',
              size: 20,
              data: {
                id: 'left-group',
                views: ['files', 'projects'],
                activeView: 'files',
              },
            },
            {
              type: 'branch',
              orientation: 'HORIZONTAL',
              size: 55,
              data: [
                {
                  type: 'leaf',
                  size: 50,
                  data: {
                    id: 'editor-group',
                    views: ['editor'],
                    activeView: 'editor',
                  },
                },
                {
                  type: 'leaf',
                  size: 50,
                  data: {
                    id: 'preview-group',
                    views: ['preview'],
                    activeView: 'preview',
                  },
                },
              ],
            },
            {
              type: 'leaf',
              size: 25,
              data: {
                id: 'right-group',
                views: ['chat', 'logs'],
                activeView: 'chat',
              },
            },
          ],
        },
        {
          type: 'leaf',
          size: 30,
          data: {
            id: 'bottom-group',
            views: ['plan'],
            activeView: 'plan',
          },
        },
      ],
    },
  },
  panels: {
    files: {
      id: 'files',
      title: PANEL_TITLES.files,
      contentComponent: 'files',
      params: { ariaLabel: 'File browser panel - view and manage project files' },
    },
    projects: {
      id: 'projects',
      title: PANEL_TITLES.projects,
      contentComponent: 'projects',
      params: { ariaLabel: 'Project manager panel - create and switch between projects' },
    },
    editor: {
      id: 'editor',
      title: PANEL_TITLES.editor,
      contentComponent: 'editor',
      params: { ariaLabel: 'Code editor panel - write and edit source code' },
    },
    preview: {
      id: 'preview',
      title: PANEL_TITLES.preview,
      contentComponent: 'preview',
      params: { ariaLabel: 'Code preview panel - view rendered output' },
    },
    chat: {
      id: 'chat',
      title: PANEL_TITLES.chat,
      contentComponent: 'chat',
      params: { ariaLabel: 'AI chat panel - interact with AI assistant' },
    },
    logs: {
      id: 'logs',
      title: PANEL_TITLES.logs,
      contentComponent: 'logs',
      params: { ariaLabel: 'System logs panel - view application logs and errors' },
    },
    plan: {
      id: 'plan',
      title: PANEL_TITLES.plan,
      contentComponent: 'plan',
      params: { ariaLabel: 'Development plan panel - track tasks and progress' },
    },
  },
  activeGroup: 'editor-group',
};

const createWorkspacePreset = (layout: DockviewLayout, options?: Partial<WorkspacePreset>): WorkspacePreset => {
  const timestamp = nowIso();

  return {
    id: options?.id ?? makePresetId(),
    name: options?.name ?? 'Workspace',
    layout,
    createdAt: options?.createdAt ?? timestamp,
    updatedAt: options?.updatedAt ?? timestamp,
    isRecovery: options?.isRecovery,
  };
};

const createRecoveryEnvelope = (): WorkspaceMigrationResult => {
  const recovery = createWorkspacePreset(DEFAULT_LAYOUT, {
    name: 'Recovered workspace (safe mode)',
    isRecovery: true,
  });

  return {
    didRecover: true,
    envelope: {
      version: WORKSPACE_STORAGE_VERSION,
      presets: [recovery],
      activePresetId: recovery.id,
    },
  };
};

export function validateLayout(layout: unknown): layout is DockviewLayout {
  if (!layout || typeof layout !== 'object') {
    return false;
  }

  const layoutObj = layout as Record<string, unknown>;
  if (!layoutObj.grid || typeof layoutObj.grid !== 'object') return false;

  const gridObj = layoutObj.grid as Record<string, unknown>;
  if (!gridObj.root || typeof gridObj.root !== 'object') return false;

  if (!layoutObj.panels || typeof layoutObj.panels !== 'object') return false;

  const panelsObj = layoutObj.panels as Record<string, unknown>;
  for (const panel of Object.values(panelsObj)) {
    if (!panel || typeof panel !== 'object') return false;

    const p = panel as Record<string, unknown>;
    if (typeof p.id !== 'string' || p.id.trim() === '') return false;
    if (typeof p.contentComponent !== 'string' || p.contentComponent.trim() === '') return false;
  }

  const validateNode = (node: unknown): boolean => {
    if (!node || typeof node !== 'object') return false;

    const n = node as Record<string, unknown>;
    if (n.type !== 'branch' && n.type !== 'leaf') return false;

    if (n.type === 'branch') {
      if (n.orientation !== 'VERTICAL' && n.orientation !== 'HORIZONTAL') return false;
      if (!Array.isArray(n.data) || n.data.length === 0) return false;
      return n.data.every(validateNode);
    }

    if (!n.data || typeof n.data !== 'object' || Array.isArray(n.data)) return false;

    const leafData = n.data as Record<string, unknown>;
    if (typeof leafData.id !== 'string' || leafData.id.trim() === '') return false;
    if (!Array.isArray(leafData.views)) return false;

    return leafData.views.every((view) => typeof view === 'string' && view.length > 0);
  };

  return validateNode(gridObj.root);
}


interface WorkspaceStorageV1Envelope {
  version: 1;
  layout: DockviewLayout;
}

const isWorkspaceStorageV1Envelope = (value: unknown): value is WorkspaceStorageV1Envelope => {
  if (!value || typeof value !== 'object') return false;

  const data = value as Record<string, unknown>;
  return data.version === 1 && validateLayout(data.layout);
};

const isWorkspaceStorageV2 = (value: unknown): value is WorkspaceStorageV2 => {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return Array.isArray(data.presets);
};

const isWorkspaceStorageV3 = (value: unknown): value is WorkspacePresetsEnvelope => {
  if (!value || typeof value !== 'object') return false;

  const data = value as Record<string, unknown>;
  return typeof data.version === 'number' && Array.isArray(data.presets);
};

const sanitizePreset = (preset: unknown): WorkspacePreset | null => {
  if (!preset || typeof preset !== 'object') return null;

  const parsed = preset as Partial<WorkspacePreset>;
  if (typeof parsed.id !== 'string' || parsed.id.trim() === '') return null;
  if (typeof parsed.name !== 'string' || parsed.name.trim() === '') return null;
  if (!validateLayout(parsed.layout)) return null;

  return withValidTimestamps({
    id: parsed.id,
    name: parsed.name,
    layout: parsed.layout,
    createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : '',
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    isRecovery: Boolean(parsed.isRecovery),
  });
};

const migrateV1ToV2 = (v1Layout: DockviewLayout): WorkspaceStorageV2 => {
  const preset = createWorkspacePreset(v1Layout, {
    id: 'workspace-main',
    name: 'Main workspace',
  });

  return {
    presets: [preset],
    activePresetId: preset.id,
  };
};

const migrateV2ToV3 = (v2: WorkspaceStorageV2): WorkspacePresetsEnvelope => {
  const presets = v2.presets
    .map(sanitizePreset)
    .filter((preset): preset is WorkspacePreset => preset !== null);

  if (presets.length === 0) {
    return createRecoveryEnvelope().envelope;
  }

  const activePresetId = presets.some((preset) => preset.id === v2.activePresetId)
    ? (v2.activePresetId as string)
    : presets[0].id;

  return {
    version: WORKSPACE_STORAGE_VERSION,
    presets,
    activePresetId,
  };
};

export function migrateWorkspaceStorage(raw: unknown): WorkspaceMigrationResult {
  let parsed: unknown = raw;

  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return createRecoveryEnvelope();
    }
  }

  if (validateLayout(parsed)) {
    const v2 = migrateV1ToV2(parsed);
    return {
      didRecover: false,
      envelope: migrateV2ToV3(v2),
    };
  }

  if (isWorkspaceStorageV2(parsed) && !isWorkspaceStorageV3(parsed)) {
    const envelope = migrateV2ToV3(parsed);
    return {
      didRecover: envelope.presets.some((preset) => preset.isRecovery),
      envelope,
    };
  }

  if (isWorkspaceStorageV1Envelope(parsed)) {
    const v2 = migrateV1ToV2(parsed.layout);
    const envelope = migrateV2ToV3(v2);

    return {
      didRecover: false,
      envelope,
    };
  }

  if (isWorkspaceStorageV3(parsed)) {
    if (parsed.version > WORKSPACE_STORAGE_VERSION) {
      return createRecoveryEnvelope();
    }

    const v2Cursor: WorkspaceStorageV2 = {
      presets: parsed.presets,
      activePresetId: parsed.activePresetId,
    };

    // v2 -> v3 (v3 input is normalized through v2 sanitizer path).
    const envelope = migrateV2ToV3(v2Cursor);
    return {
      didRecover: envelope.presets.some((preset) => preset.isRecovery),
      envelope,
    };
  }

  return createRecoveryEnvelope();
}
