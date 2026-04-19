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
import {
  DEFAULT_DOCKVIEW_LAYOUT,
  deserializeDockviewLayout,
  DOCKVIEW_LAYOUT_STORAGE_KEY,
  serializeDockviewLayout,
} from '@/lib/dock-layout';

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


interface DockWorkspaceProps {
  onResetLayout?: (resetFn: () => void) => void;
}

export function DockWorkspace({ onResetLayout }: DockWorkspaceProps) {
  const apiRef = useRef<DockviewApi | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
        localStorage.setItem(DOCKVIEW_LAYOUT_STORAGE_KEY, serializeDockviewLayout(layout));
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
      const saved = localStorage.getItem(DOCKVIEW_LAYOUT_STORAGE_KEY);
      if (saved) {
        const parsed = deserializeDockviewLayout(saved);

        if (parsed) {
          try {
            api.fromJSON(parsed as Parameters<DockviewApi['fromJSON']>[0]);
            return;
          } catch (fromJsonError) {
            console.error(
              '[DockWorkspace] fromJSON failed with saved layout, clearing localStorage:',
              fromJsonError
            );
            localStorage.removeItem(DOCKVIEW_LAYOUT_STORAGE_KEY);
          }
        } else {
          console.warn(
            '[DockWorkspace] Saved layout failed validation, clearing localStorage'
          );
          localStorage.removeItem(DOCKVIEW_LAYOUT_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error(
        '[DockWorkspace] Failed to load/parse saved layout, clearing localStorage:',
        error
      );
      localStorage.removeItem(DOCKVIEW_LAYOUT_STORAGE_KEY);
    }

    try {
      api.fromJSON(DEFAULT_DOCKVIEW_LAYOUT as Parameters<DockviewApi['fromJSON']>[0]);
    } catch (defaultError) {
      console.error(
        '[DockWorkspace] CRITICAL: Failed to load DEFAULT_DOCKVIEW_LAYOUT. The workspace will be empty. Error:',
        defaultError
      );
    }
  }, []);

  const resetLayout = useCallback(() => {
    if (!apiRef.current) return;
    localStorage.removeItem(DOCKVIEW_LAYOUT_STORAGE_KEY);
    try {
      apiRef.current.fromJSON(DEFAULT_DOCKVIEW_LAYOUT as Parameters<DockviewApi['fromJSON']>[0]);
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
          localStorage.setItem(DOCKVIEW_LAYOUT_STORAGE_KEY, serializeDockviewLayout(layout));
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
