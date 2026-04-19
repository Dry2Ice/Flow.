'use client';

import { useEffect, useRef, useCallback, useState, lazy, Suspense, useMemo } from 'react';
import {
  DockviewReact,
  DockviewReadyEvent,
  IDockviewPanelProps,
  DockviewApi,
} from 'dockview';
import { FileBrowser } from '@/components/FileBrowser';
import { ProjectManager } from '@/components/ProjectManager';
import { AIChat } from '@/components/AIChat';
import { SystemLogsPanel } from '@/components/WorkspaceDiagnostics';
import { DevelopmentPlan } from '@/components/DevelopmentPlan';
import { PromptInput } from '@/components/PromptInput';
import { AIErrorBoundary } from '@/components/AIErrorBoundary';
import { useAppStore } from '@/lib/store';

// Lazy load heavy components
const CodeEditor = lazy(() =>
  import('@/components/CodeEditor').then((module) => ({
    default: module.CodeEditor,
  }))
);
const CodePreview = lazy(() =>
  import('@/components/CodePreview').then((module) => ({
    default: module.CodePreview,
  }))
);

// Loading skeleton for lazy components
const ComponentSkeleton = ({ title }: { title: string }) => (
  <div
    className="h-full flex items-center justify-center p-8"
    role="status"
    aria-label={`Loading ${title}`}
  >
    <div className="text-center">
      <div
        className="w-12 h-12 border-4 border-neutral-600 border-t-neutral-400 rounded-full animate-spin mx-auto mb-4"
        aria-hidden="true"
      />
      <p className="text-sm text-neutral-400">Loading {title}...</p>
    </div>
  </div>
);

// Panel accessibility configuration
const PANEL_ACCESSIBILITY = {
  files: {
    title: '📁 Files',
    ariaLabel: 'File browser panel - view and manage project files',
    description: 'Browse, open, and manage files in your project',
  },
  projects: {
    title: '🗂 Projects',
    ariaLabel: 'Project manager panel - create and switch between projects',
    description: 'Create new projects and switch between existing ones',
  },
  editor: {
    title: '✏️ Editor',
    ariaLabel: 'Code editor panel - write and edit source code',
    description: 'Monaco editor for writing and editing code files',
  },
  preview: {
    title: '👁 Preview',
    ariaLabel: 'Code preview panel - view rendered output',
    description: 'Live preview of HTML, CSS, and JavaScript code',
  },
  chat: {
    title: '💬 AI Chat',
    ariaLabel: 'AI chat panel - interact with AI assistant',
    description: 'Chat interface for AI-powered code assistance',
  },
  logs: {
    title: '📋 Logs',
    ariaLabel: 'System logs panel - view application logs and errors',
    description: 'View system logs, AI responses, and error messages',
  },
  plan: {
    title: '🎯 Dev Plan',
    ariaLabel: 'Development plan panel - track tasks and progress',
    description: 'Manage development tasks, track progress, and handle bugs',
  },
};

// Enhanced component wrapper with accessibility
const createAccessibleComponent = (
  Component: React.ReactNode,
  panelId: string
) => {
  const config =
    PANEL_ACCESSIBILITY[panelId as keyof typeof PANEL_ACCESSIBILITY];
  return (
    <div
      role="tabpanel"
      aria-labelledby={`${panelId}-tab`}
      aria-label={config.ariaLabel}
      aria-describedby={`${panelId}-description`}
      className="h-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-inset"
      tabIndex={-1}
    >
      <div id={`${panelId}-description`} className="sr-only">
        {config.description}
      </div>
      {Component}
    </div>
  );
};

// Map panel id to component with lazy loading and accessibility
const components: Record<string, React.FC<IDockviewPanelProps>> = {
  files: (props: IDockviewPanelProps) =>
    createAccessibleComponent(<FileBrowser />, 'files'),
  projects: (props: IDockviewPanelProps) =>
    createAccessibleComponent(<ProjectManager />, 'projects'),
  editor: (props: IDockviewPanelProps) =>
    createAccessibleComponent(
      <Suspense fallback={<ComponentSkeleton title="Code Editor" />}>
        <CodeEditor />
      </Suspense>,
      'editor'
    ),
  preview: (props: IDockviewPanelProps) =>
    createAccessibleComponent(
      <Suspense fallback={<ComponentSkeleton title="Code Preview" />}>
        <CodePreview />
      </Suspense>,
      'preview'
    ),
  chat: (props: IDockviewPanelProps) =>
    createAccessibleComponent(
      <div className="flex h-full flex-col">
        <AIErrorBoundary sessionId="chat-ai">
          <AIChat />
        </AIErrorBoundary>
        <PromptInput />
      </div>,
      'chat'
    ),
  logs: (props: IDockviewPanelProps) =>
    createAccessibleComponent(<SystemLogsPanel />, 'logs'),
  plan: (props: IDockviewPanelProps) =>
    createAccessibleComponent(
      <AIErrorBoundary sessionId="plan-ai">
        <DevelopmentPlan />
      </AIErrorBoundary>,
      'plan'
    ),
};

const LAYOUT_KEY = 'flow.dockview-layout.v1';

// ---------------------------------------------------------------------------
// TypeScript: strict types matching dockview's SerializedDockview schema
// ---------------------------------------------------------------------------

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

interface DockviewLayout {
  grid: {
    root: GridNode;
  };
  panels: Record<string, SerializedDockviewPanel>;
  activeGroup?: string;
}

// ---------------------------------------------------------------------------
// DEFAULT_LAYOUT
// ---------------------------------------------------------------------------

const DEFAULT_LAYOUT: DockviewLayout = {
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
      title: PANEL_ACCESSIBILITY.files.title,
      contentComponent: 'files',
      params: { ariaLabel: PANEL_ACCESSIBILITY.files.ariaLabel },
    },
    projects: {
      id: 'projects',
      title: PANEL_ACCESSIBILITY.projects.title,
      contentComponent: 'projects',
      params: { ariaLabel: PANEL_ACCESSIBILITY.projects.ariaLabel },
    },
    editor: {
      id: 'editor',
      title: PANEL_ACCESSIBILITY.editor.title,
      contentComponent: 'editor',
      params: { ariaLabel: PANEL_ACCESSIBILITY.editor.ariaLabel },
    },
    preview: {
      id: 'preview',
      title: PANEL_ACCESSIBILITY.preview.title,
      contentComponent: 'preview',
      params: { ariaLabel: PANEL_ACCESSIBILITY.preview.ariaLabel },
    },
    chat: {
      id: 'chat',
      title: PANEL_ACCESSIBILITY.chat.title,
      contentComponent: 'chat',
      params: { ariaLabel: PANEL_ACCESSIBILITY.chat.ariaLabel },
    },
    logs: {
      id: 'logs',
      title: PANEL_ACCESSIBILITY.logs.title,
      contentComponent: 'logs',
      params: { ariaLabel: PANEL_ACCESSIBILITY.logs.ariaLabel },
    },
    plan: {
      id: 'plan',
      title: PANEL_ACCESSIBILITY.plan.title,
      contentComponent: 'plan',
      params: { ariaLabel: PANEL_ACCESSIBILITY.plan.ariaLabel },
    },
  },
  activeGroup: 'editor-group',
};

// ---------------------------------------------------------------------------
// validateLayout — pure function outside the component
// ---------------------------------------------------------------------------

type LayoutValidationResult = {
  valid: boolean;
  reason?: string;
};

function validateLayout(layout: unknown): LayoutValidationResult {
  const fail = (reason: string): LayoutValidationResult => {
    console.warn(`[DockWorkspace] validate: ${reason}`);
    return { valid: false, reason };
  };

  if (!layout || typeof layout !== 'object') {
    return fail('layout is not an object');
  }

  const layoutObj = layout as Record<string, unknown>;

  if (!layoutObj.grid || typeof layoutObj.grid !== 'object') {
    return fail('missing or invalid "grid"');
  }

  const gridObj = layoutObj.grid as Record<string, unknown>;

  if (!gridObj.root || typeof gridObj.root !== 'object') {
    return fail('missing or invalid "grid.root"');
  }

  if (!layoutObj.panels || typeof layoutObj.panels !== 'object') {
    return fail('missing or invalid "panels"');
  }

  const panelsObj = layoutObj.panels as Record<string, unknown>;
  const panelIds = new Set<string>();
  const groupIds = new Set<string>();
  const viewRefs = new Set<string>();

  for (const [key, panel] of Object.entries(panelsObj)) {
    if (!panel || typeof panel !== 'object') {
      return fail(`panel "${key}" is not an object`);
    }

    const p = panel as Record<string, unknown>;

    if (typeof p.contentComponent !== 'string' || p.contentComponent.trim() === '') {
      return fail(`panel "${key}" has missing or invalid "contentComponent"`);
    }

    if (typeof p.id !== 'string' || p.id.trim() === '') {
      return fail(`panel "${key}" has missing or invalid "id"`);
    }

    if (panelIds.has(p.id)) {
      return fail(`duplicate panel id "${p.id}"`);
    }

    panelIds.add(p.id);
  }

  const validateNode = (node: unknown, path: string): LayoutValidationResult => {
    if (!node || typeof node !== 'object') {
      return fail(`node at ${path} is not an object`);
    }

    const n = node as Record<string, unknown>;

    if (n.type !== 'branch' && n.type !== 'leaf') {
      return fail(`node at ${path} has invalid type: ${JSON.stringify(n.type)}`);
    }

    if (n.type === 'branch') {
      if (n.orientation !== 'VERTICAL' && n.orientation !== 'HORIZONTAL') {
        return fail(`branch at ${path} has invalid orientation`);
      }

      if (!Array.isArray(n.data) || n.data.length === 0) {
        return fail(`branch at ${path} must have a non-empty "data" array`);
      }

      for (let i = 0; i < n.data.length; i++) {
        const childValidation = validateNode(n.data[i], `${path} > branch.data[${i}]`);
        if (!childValidation.valid) {
          return childValidation;
        }
      }
    }

    if (n.type === 'leaf') {
      if (!n.data || typeof n.data !== 'object' || Array.isArray(n.data)) {
        return fail(`leaf at ${path} is missing "data" object`);
      }

      const leafData = n.data as Record<string, unknown>;

      if (typeof leafData.id !== 'string' || (leafData.id as string).trim() === '') {
        return fail(`leaf at ${path} has missing or invalid "data.id"`);
      }

      if (groupIds.has(leafData.id)) {
        return fail(`duplicate group id "${leafData.id}" at ${path}`);
      }
      groupIds.add(leafData.id);

      if (!Array.isArray(leafData.views)) {
        return fail(`leaf at ${path} (group "${leafData.id}") missing "data.views" array`);
      }

      if (!leafData.views.every((v: unknown) => typeof v === 'string')) {
        return fail(`leaf at ${path} (group "${leafData.id}") has non-string entries in "data.views"`);
      }

      for (const view of leafData.views) {
        if (!panelIds.has(view)) {
          return fail(`leaf at ${path} (group "${leafData.id}") references unknown view "${view}"`);
        }
        viewRefs.add(view);
      }

      if (
        typeof leafData.activeView === 'string' &&
        !leafData.views.includes(leafData.activeView)
      ) {
        return fail(
          `leaf at ${path} (group "${leafData.id}") has activeView "${leafData.activeView}" not present in views`
        );
      }
    }

    return { valid: true };
  };

  try {
    return validateNode(gridObj.root, 'grid.root');
  } catch (error) {
    console.error('[DockWorkspace] validate: exception during validation:', error);
    return {
      valid: false,
      reason: `exception during validation: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DockWorkspaceProps {
  onResetLayout?: (resetFn: () => void) => void;
}

export function DockWorkspace({ onResetLayout }: DockWorkspaceProps) {
  const apiRef = useRef<DockviewApi | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const addLog = useAppStore((state) => state.addLog);
  const [layoutSaved, setLayoutSaved] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const panelOrder = useMemo(
    () => ['files', 'projects', 'editor', 'preview', 'chat', 'logs', 'plan'],
    []
  );

  const handleKeyboardNavigation = useCallback(
    (event: KeyboardEvent) => {
      if (!apiRef.current) return;

      const activeGroup = apiRef.current.activeGroup;
      if (!activeGroup) return;

      const currentIndex = panelOrder.findIndex((id) =>
        activeGroup.panels.some((panel) => panel.id === id)
      );

      if (currentIndex === -1) return;

      let targetIndex = currentIndex;

      if (event.ctrlKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        targetIndex = Math.max(0, currentIndex - 1);
      } else if (event.ctrlKey && event.key === 'ArrowRight') {
        event.preventDefault();
        targetIndex = Math.min(panelOrder.length - 1, currentIndex + 1);
      }

      if (targetIndex !== currentIndex) {
        const targetPanelId = panelOrder[targetIndex];
        const targetPanel = activeGroup.panels.find(
          (p) => p.id === targetPanelId
        );
        if (targetPanel) {
          activeGroup.focus();
        }
      }
    },
    [panelOrder]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardNavigation);
    return () =>
      document.removeEventListener('keydown', handleKeyboardNavigation);
  }, [handleKeyboardNavigation]);

  const saveLayout = useCallback(() => {
    if (!apiRef.current) return;

    setUnsavedChanges(true);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        const layout = apiRef.current!.toJSON();
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
        setLayoutSaved(true);
        setUnsavedChanges(false);
        setTimeout(() => setLayoutSaved(false), 2000);
      } catch (error) {
        console.error('[DockWorkspace] Failed to save layout:', error);
      }
    }, 500);
  }, []);

  const loadLayout = useCallback((api: DockviewApi) => {
    try {
      const saved = localStorage.getItem(LAYOUT_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        const validationResult = validateLayout(parsed);

        if (parsed && typeof parsed === 'object' && validationResult.valid) {
          try {
            api.fromJSON(parsed as Parameters<DockviewApi['fromJSON']>[0]);
            return;
          } catch (fromJsonError) {
            console.error(
              '[DockWorkspace] fromJSON failed with saved layout, clearing localStorage:',
              fromJsonError
            );
            localStorage.removeItem(LAYOUT_KEY);
          }
        } else {
          const reason = validationResult.reason ?? 'unknown reason';
          console.warn(
            `[DockWorkspace] Saved layout failed validation (${reason}), clearing localStorage`
          );
          addLog({
            id: crypto.randomUUID(),
            timestamp: new Date(),
            type: 'warning',
            message: '[DockWorkspace] Saved layout rejected by validation',
            details: reason,
            source: 'user_action',
          });
          localStorage.removeItem(LAYOUT_KEY);
        }
      }
    } catch (error) {
      console.error(
        '[DockWorkspace] Failed to load/parse saved layout, clearing localStorage:',
        error
      );
      localStorage.removeItem(LAYOUT_KEY);
    }

    try {
      api.fromJSON(DEFAULT_LAYOUT as Parameters<DockviewApi['fromJSON']>[0]);
    } catch (defaultError) {
      console.error(
        '[DockWorkspace] CRITICAL: Failed to load DEFAULT_LAYOUT. The workspace will be empty. Error:',
        defaultError
      );
    }
  }, [addLog]);

  const resetLayout = useCallback(() => {
    if (!apiRef.current) return;
    localStorage.removeItem(LAYOUT_KEY);
    try {
      apiRef.current.fromJSON(DEFAULT_LAYOUT as Parameters<DockviewApi['fromJSON']>[0]);
    } catch (error) {
      console.error('[DockWorkspace] Failed to reset layout:', error);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current && unsavedChanges && apiRef.current) {
        clearTimeout(saveTimeoutRef.current);
        try {
          const layout = apiRef.current.toJSON();
          localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
        } catch {
          // ignore
        }
      } else if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [unsavedChanges]);

  useEffect(() => {
    onResetLayout?.(resetLayout);
  }, [resetLayout, onResetLayout]);

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      apiRef.current = event.api;
      event.api.onDidLayoutChange(() => saveLayout());
      loadLayout(event.api);
    },
    [loadLayout, saveLayout]
  );

  return (
    <div className="relative h-full w-full">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Skip to main content
      </a>

      <div
        id="main-content"
        role="main"
        aria-label="Flow IDE workspace with dockable panels"
        className="h-full w-full"
      >
        <DockviewReact
          className="dockview-theme-dark h-full w-full dockview-accessible"
          components={components}
          onReady={onReady}
          singleTabMode="fullwidth"
        />
      </div>

      {layoutSaved && (
        <div
          className="absolute top-4 right-4 z-50 animate-fade-in"
          role="status"
          aria-live="polite"
          aria-label="Layout changes saved successfully"
        >
          <div className="bg-green-600/90 text-green-100 px-3 py-1 rounded-md text-sm font-medium shadow-lg backdrop-blur-sm border border-green-500/30">
            Layout saved
          </div>
        </div>
      )}

      {unsavedChanges && !layoutSaved && (
        <div
          className="absolute top-4 right-4 z-50"
          role="status"
          aria-live="polite"
          aria-label="Saving layout changes"
        >
          <div className="bg-amber-600/90 text-amber-100 px-3 py-1 rounded-md text-sm font-medium shadow-lg backdrop-blur-sm flex items-center gap-2 border border-amber-500/30">
            <div
              className="w-2 h-2 bg-amber-300 rounded-full animate-pulse"
              aria-hidden="true"
            />
            Saving layout...
          </div>
        </div>
      )}
    </div>
  );
}
