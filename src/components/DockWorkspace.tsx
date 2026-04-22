'use client';

import React, { useEffect, useRef, useCallback, useState, lazy, Suspense, useMemo } from 'react';
import { Plus } from 'lucide-react';
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

// Lazy load heavy components
const CodeEditor = lazy(() => import('@/components/CodeEditor').then(module => ({ default: module.CodeEditor })));
const CodePreview = lazy(() => import('@/components/CodePreview').then(module => ({ default: module.CodePreview })));

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
    description: 'Browse, open, and manage files in your project'
  },
  projects: {
    title: '🗂 Projects',
    ariaLabel: 'Project manager panel - create and switch between projects',
    description: 'Create new projects and switch between existing ones'
  },
  editor: {
    title: '✏️ Editor',
    ariaLabel: 'Code editor panel - write and edit source code',
    description: 'Monaco editor for writing and editing code files'
  },
  preview: {
    title: '👁 Preview',
    ariaLabel: 'Code preview panel - view rendered output',
    description: 'Live preview of HTML, CSS, and JavaScript code'
  },
  chat: {
    title: '💬 AI Chat',
    ariaLabel: 'AI chat panel - interact with AI assistant',
    description: 'Chat interface for AI-powered code assistance'
  },
  logs: {
    title: '📋 Logs',
    ariaLabel: 'System logs panel - view application logs and errors',
    description: 'View system logs, AI responses, and error messages'
  },
  plan: {
    title: '🎯 Dev Plan',
    ariaLabel: 'Development plan panel - track tasks and progress',
    description: 'Manage development tasks, track progress, and handle bugs'
  }
};

// Enhanced component wrapper with accessibility
const createAccessibleComponent = (
  component: React.ReactNode,
  panelId: keyof typeof PANEL_ACCESSIBILITY
) => {
  const config = PANEL_ACCESSIBILITY[panelId as keyof typeof PANEL_ACCESSIBILITY];
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
      {component}
    </div>
  );
};

const FilesPanel = React.memo(function FilesPanel() {
  return createAccessibleComponent(<FileBrowser />, 'files');
});

const ProjectsPanel = React.memo(function ProjectsPanel() {
  return createAccessibleComponent(<ProjectManager />, 'projects');
});

const EditorPanel = React.memo(function EditorPanel() {
  return createAccessibleComponent(
    <Suspense fallback={<ComponentSkeleton title="Code Editor" />}>
      <CodeEditor />
    </Suspense>,
    'editor'
  );
});

const PreviewPanel = React.memo(function PreviewPanel() {
  return createAccessibleComponent(
    <Suspense fallback={<ComponentSkeleton title="Code Preview" />}>
      <CodePreview />
    </Suspense>,
    'preview'
  );
});

const ChatPanel = React.memo(function ChatPanel() {
  return createAccessibleComponent(
    <div className="flex h-full flex-col">
      <AIErrorBoundary sessionId="chat-ai">
        <AIChat />
      </AIErrorBoundary>
      <PromptInput />
    </div>,
    'chat'
  );
});

const LogsPanel = React.memo(function LogsPanel() {
  return createAccessibleComponent(<SystemLogsPanel />, 'logs');
});

const PlanPanel = React.memo(function PlanPanel() {
  return createAccessibleComponent(
    <AIErrorBoundary sessionId="plan-ai">
      <DevelopmentPlan />
    </AIErrorBoundary>,
    'plan'
  );
});

// Map panel id → component with lazy loading and accessibility
const components: Record<string, React.FC<IDockviewPanelProps>> = {
  files: FilesPanel,
  projects: ProjectsPanel,
  editor: EditorPanel,
  preview: PreviewPanel,
  chat: ChatPanel,
  logs: LogsPanel,
  plan: PlanPanel,
};

const LAYOUT_KEY = 'flow.dockview-layout.v1';
const ALL_PANEL_IDS = ['files', 'projects', 'editor', 'preview', 'chat', 'logs', 'plan'] as const;

const DEFAULT_LAYOUT = {
  grid: {
    root: {
      type: 'branch',
      orientation: 'HORIZONTAL',
      data: [
        {
          type: 'leaf',
          size: 18,
          data: { id: 'group-left', views: ['files', 'projects'], activeView: 'files' },
        },
        {
          type: 'branch',
          orientation: 'VERTICAL',
          size: 55,
          data: [
            {
              type: 'branch',
              orientation: 'HORIZONTAL',
              size: 70,
              data: [
                {
                  type: 'leaf',
                  size: 55,
                  data: { id: 'group-editor', views: ['editor'], activeView: 'editor' },
                },
                {
                  type: 'leaf',
                  size: 45,
                  data: { id: 'group-preview', views: ['preview'], activeView: 'preview' },
                },
              ],
            },
            {
              type: 'leaf',
              size: 30,
              data: { id: 'group-plan', views: ['plan'], activeView: 'plan' },
            },
          ],
        },
        {
          type: 'leaf',
          size: 27,
          data: { id: 'group-right', views: ['chat', 'logs'], activeView: 'chat' },
        },
      ],
    },
    width: 1200,
    height: 800,
    orientation: 'HORIZONTAL',
  },
  panels: {
    files: { id: 'files', title: PANEL_ACCESSIBILITY.files.title, component: 'files' },
    projects: { id: 'projects', title: PANEL_ACCESSIBILITY.projects.title, component: 'projects' },
    editor: { id: 'editor', title: PANEL_ACCESSIBILITY.editor.title, component: 'editor' },
    preview: { id: 'preview', title: PANEL_ACCESSIBILITY.preview.title, component: 'preview' },
    chat: { id: 'chat', title: PANEL_ACCESSIBILITY.chat.title, component: 'chat' },
    logs: { id: 'logs', title: PANEL_ACCESSIBILITY.logs.title, component: 'logs' },
    plan: { id: 'plan', title: PANEL_ACCESSIBILITY.plan.title, component: 'plan' },
  },
  activeGroup: 'group-editor',
};

interface DockWorkspaceProps {
  onResetLayout?: (resetFn: () => void) => void;
}

export function DockWorkspace({ onResetLayout }: DockWorkspaceProps) {
  const apiRef = useRef<DockviewApi | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [layoutSaved, setLayoutSaved] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [openPanelIds, setOpenPanelIds] = useState<Set<string>>(new Set(ALL_PANEL_IDS));
  const [showAddPanel, setShowAddPanel] = useState(false);
  const addPanelMenuRef = useRef<HTMLDivElement | null>(null);

  // Keyboard navigation support
  const panelOrder = useMemo(() => [...ALL_PANEL_IDS], []);

  const handleKeyboardNavigation = useCallback((event: KeyboardEvent) => {
    if (!apiRef.current) return;

    const activeGroup = apiRef.current.activeGroup;
    if (!activeGroup) return;

    const currentIndex = panelOrder.findIndex(id =>
      activeGroup.panels.some(panel => panel.id === id)
    );

    if (currentIndex === -1) return;

    let targetIndex = currentIndex;

    // Handle arrow key navigation
    if (event.ctrlKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      targetIndex = Math.max(0, currentIndex - 1);
    } else if (event.ctrlKey && event.key === 'ArrowRight') {
      event.preventDefault();
      targetIndex = Math.min(panelOrder.length - 1, currentIndex + 1);
    }

    if (targetIndex !== currentIndex) {
      const targetPanelId = panelOrder[targetIndex];
      const targetPanel = activeGroup.panels.find(p => p.id === targetPanelId);
      if (targetPanel) {
        activeGroup.focus();
        // Focus will be managed by dockview's internal focus management
      }
    }
  }, [panelOrder]);

  // Add keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardNavigation);
    return () => document.removeEventListener('keydown', handleKeyboardNavigation);
  }, [handleKeyboardNavigation]);

  // Debounced layout save (500ms delay)
  const saveLayout = useCallback(() => {
    if (!apiRef.current) return;

    // Set unsaved changes flag immediately
    setUnsavedChanges(true);

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const layout = apiRef.current!.toJSON();
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
        setLayoutSaved(true);
        setUnsavedChanges(false);
        setTimeout(() => setLayoutSaved(false), 2000); // Hide indicator after 2s
      } catch {
        // ignore save errors
      }
    }, 500);
  }, []);

  const loadLayout = useCallback((api: DockviewApi) => {
    const tryLoad = (json: any) => {
      api.clear();
      api.fromJSON(json);
    };

    try {
      const saved = localStorage.getItem(LAYOUT_KEY);
      if (saved) {
        try {
          tryLoad(JSON.parse(saved));
          return;
        } catch (err) {
          console.warn('[DockWorkspace] Saved layout failed to load, falling back to default:', err);
          localStorage.removeItem(LAYOUT_KEY);
        }
      }
      tryLoad(DEFAULT_LAYOUT);
    } catch (err) {
      console.error('[DockWorkspace] Default layout also failed to load:', err);
    }
  }, []);

  const resetLayout = useCallback(() => {
    if (!apiRef.current) return;
    localStorage.removeItem(LAYOUT_KEY);
    try {
      apiRef.current.clear();
    } catch {
      // ignore clear errors
    }
    apiRef.current.fromJSON(DEFAULT_LAYOUT as any);
  }, []);

  const addPanel = useCallback((panelId: string) => {
    if (!apiRef.current) return;

    const config = DEFAULT_LAYOUT.panels[panelId as keyof typeof DEFAULT_LAYOUT.panels];
    const targetGroup = apiRef.current.activeGroup ?? apiRef.current.groups[0];

    if (targetGroup) {
      apiRef.current.addPanel({
        id: config.id,
        title: config.title,
        component: config.id,
        position: { referenceGroup: targetGroup },
      });
    }
  }, []);

  const closedPanels = useMemo(
    () => ALL_PANEL_IDS.filter(id => !openPanelIds.has(id)),
    [openPanelIds]
  );

  // Cleanup timeout on unmount and save immediately
  useEffect(() => {
    return () => {
      // Save immediately on unmount if there are unsaved changes
      if (saveTimeoutRef.current && unsavedChanges && apiRef.current) {
        clearTimeout(saveTimeoutRef.current);
        try {
          const layout = apiRef.current.toJSON();
          localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
        } catch {
          // ignore save errors on unmount
        }
      } else if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [unsavedChanges]);

  useEffect(() => {
    onResetLayout?.(resetLayout);
  }, [resetLayout, onResetLayout]);

  const onReady = useCallback((event: DockviewReadyEvent) => {
    apiRef.current = event.api;
    event.api.onDidLayoutChange(() => saveLayout());
    loadLayout(event.api);

    const updateOpenPanels = () => {
      setOpenPanelIds(new Set(event.api.panels.map(panel => panel.id)));
    };

    updateOpenPanels();
    event.api.onDidAddPanel(updateOpenPanels);
    event.api.onDidRemovePanel(updateOpenPanels);
  }, [loadLayout, saveLayout]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!addPanelMenuRef.current) return;
      if (!addPanelMenuRef.current.contains(event.target as Node)) {
        setShowAddPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative h-full w-full">
      {/* Skip link for accessibility */}
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

      {/* Layout indicators with better accessibility */}
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
            <div className="w-2 h-2 bg-amber-300 rounded-full animate-pulse" aria-hidden="true" />
            Saving layout...
          </div>
        </div>
      )}

      {closedPanels.length > 0 && (
        <div className="absolute bottom-4 left-4 z-50" ref={addPanelMenuRef}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAddPanel(value => !value)}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900/90 px-3 py-1.5 text-xs font-medium text-neutral-300 shadow-lg backdrop-blur-sm transition-all hover:border-neutral-500 hover:text-neutral-100"
              title="Add a panel back to the workspace"
            >
              <Plus className="h-3.5 w-3.5" />
              Add panel
            </button>

            {showAddPanel && (
              <div className="absolute bottom-full left-0 z-50 mb-1 w-44 rounded-lg border border-neutral-700 bg-neutral-900/95 py-1 shadow-xl backdrop-blur-sm">
                {closedPanels.map(panelId => (
                  <button
                    key={panelId}
                    type="button"
                    onClick={() => {
                      addPanel(panelId);
                      setShowAddPanel(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
                  >
                    {PANEL_ACCESSIBILITY[panelId as keyof typeof PANEL_ACCESSIBILITY].title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
