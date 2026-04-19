export const DOCKVIEW_LAYOUT_STORAGE_KEY = 'flow.dockview-layout.v1';

interface GroupData {
  id: string;
  views: string[];
  activeView?: string;
}

interface BranchNode {
  type: 'branch';
  orientation: 'VERTICAL' | 'HORIZONTAL';
  data: GridNode[];
  size?: number;
  visible?: boolean;
}

interface LeafNode {
  type: 'leaf';
  data: GroupData;
  size?: number;
  visible?: boolean;
}

type GridNode = BranchNode | LeafNode;

interface SerializedDockviewPanel {
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

export const DEFAULT_DOCKVIEW_LAYOUT: DockviewLayout = {
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
      title: '📁 Files',
      contentComponent: 'files',
      params: { ariaLabel: 'File browser panel - view and manage project files' },
    },
    projects: {
      id: 'projects',
      title: '🗂 Projects',
      contentComponent: 'projects',
      params: { ariaLabel: 'Project manager panel - create and switch between projects' },
    },
    editor: {
      id: 'editor',
      title: '✏️ Editor',
      contentComponent: 'editor',
      params: { ariaLabel: 'Code editor panel - write and edit source code' },
    },
    preview: {
      id: 'preview',
      title: '👁 Preview',
      contentComponent: 'preview',
      params: { ariaLabel: 'Code preview panel - view rendered output' },
    },
    chat: {
      id: 'chat',
      title: '💬 AI Chat',
      contentComponent: 'chat',
      params: { ariaLabel: 'AI chat panel - interact with AI assistant' },
    },
    logs: {
      id: 'logs',
      title: '📋 Logs',
      contentComponent: 'logs',
      params: { ariaLabel: 'System logs panel - view application logs and errors' },
    },
    plan: {
      id: 'plan',
      title: '🎯 Dev Plan',
      contentComponent: 'plan',
      params: { ariaLabel: 'Development plan panel - track tasks and progress' },
    },
  },
  activeGroup: 'editor-group',
};

export function validateDockviewLayout(layout: unknown): layout is DockviewLayout {
  if (!layout || typeof layout !== 'object') return false;

  const layoutObj = layout as Record<string, unknown>;
  if (!layoutObj.grid || typeof layoutObj.grid !== 'object') return false;
  if (!layoutObj.panels || typeof layoutObj.panels !== 'object') return false;

  const gridObj = layoutObj.grid as Record<string, unknown>;
  if (!gridObj.root || typeof gridObj.root !== 'object') return false;

  const panelsObj = layoutObj.panels as Record<string, unknown>;
  for (const panel of Object.values(panelsObj)) {
    if (!panel || typeof panel !== 'object') return false;
    const p = panel as Record<string, unknown>;
    if (typeof p.contentComponent !== 'string' || p.contentComponent.trim() === '') return false;
    if (typeof p.id !== 'string' || p.id.trim() === '') return false;
  }

  const validateNode = (node: unknown): boolean => {
    if (!node || typeof node !== 'object') return false;
    const n = node as Record<string, unknown>;

    if (n.type !== 'branch' && n.type !== 'leaf') return false;

    if (n.type === 'branch') {
      if (n.orientation !== 'VERTICAL' && n.orientation !== 'HORIZONTAL') return false;
      if (!Array.isArray(n.data) || n.data.length === 0) return false;
      return n.data.every((child) => validateNode(child));
    }

    if (!n.data || typeof n.data !== 'object' || Array.isArray(n.data)) return false;
    const leafData = n.data as Record<string, unknown>;

    if (typeof leafData.id !== 'string' || leafData.id.trim() === '') return false;
    if (!Array.isArray(leafData.views)) return false;

    return leafData.views.every((v: unknown) => typeof v === 'string');
  };

  return validateNode(gridObj.root);
}

export function serializeDockviewLayout(layout: unknown): string {
  if (!validateDockviewLayout(layout)) {
    throw new Error('Invalid dockview layout: cannot serialize');
  }

  return JSON.stringify(layout);
}

export function deserializeDockviewLayout(layout: string): DockviewLayout | null {
  try {
    const parsed: unknown = JSON.parse(layout);
    return validateDockviewLayout(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
