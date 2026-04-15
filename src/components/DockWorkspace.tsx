'use client';

import { useEffect, useRef, useCallback, useState, lazy, Suspense } from 'react';
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
  <div className="h-full flex items-center justify-center p-8">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-neutral-600 border-t-neutral-400 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-sm text-neutral-400">Loading {title}...</p>
    </div>
  </div>
);

// Map panel id → component with lazy loading
const components: Record<string, React.FC<IDockviewPanelProps>> = {
  files: () => <FileBrowser />,
  projects: () => <ProjectManager />,
  editor: () => (
    <Suspense fallback={<ComponentSkeleton title="Code Editor" />}>
      <CodeEditor />
    </Suspense>
  ),
  preview: () => (
    <Suspense fallback={<ComponentSkeleton title="Code Preview" />}>
      <CodePreview />
    </Suspense>
  ),
  chat: () => (
    <div className="flex h-full flex-col">
      <AIErrorBoundary sessionId="chat-ai">
        <AIChat />
      </AIErrorBoundary>
      <PromptInput />
    </div>
  ),
  logs: () => <SystemLogsPanel />,
  plan: () => (
    <AIErrorBoundary sessionId="plan-ai">
      <DevelopmentPlan />
    </AIErrorBoundary>
  ),
};

const LAYOUT_KEY = 'flow.dockview-layout.v1';

const DEFAULT_LAYOUT = {
  grid: {
    root: {
      type: 'branch',
      data: [
        {
          type: 'branch',
          orientation: 'HORIZONTAL',
          id: 'top',
          size: 70,
          data: [
            { type: 'leaf', data: { views: ['files', 'projects'] }, id: 'left', size: 20 },
            {
              type: 'branch',
              orientation: 'HORIZONTAL',
              id: 'center',
              data: [
                { type: 'leaf', data: { views: ['editor'] }, id: 'editor', size: 50 },
                { type: 'leaf', data: { views: ['preview'] }, id: 'preview', size: 50 },
              ],
            },
            { type: 'leaf', data: { views: ['chat', 'logs'] }, id: 'right', size: 25 },
          ],
        },
        { type: 'leaf', data: { views: ['plan'] }, id: 'bottom', size: 30 },
      ],
      id: 'root',
    },
    width: 100,
    height: 100,
    orientation: 'VERTICAL',
  },
  panels: {
    files: { id: 'files', title: '📁 Files', component: 'files' },
    projects: { id: 'projects', title: '🗂 Projects', component: 'projects' },
    editor: { id: 'editor', title: '✏️ Editor', component: 'editor' },
    preview: { id: 'preview', title: '👁 Preview', component: 'preview' },
    chat: { id: 'chat', title: '💬 AI Chat', component: 'chat' },
    logs: { id: 'logs', title: '📋 Logs', component: 'logs' },
    plan: { id: 'plan', title: '🎯 Dev Plan', component: 'plan' },
  },
  activeGroup: 'editor',
};

interface DockWorkspaceProps {
  onResetLayout?: (resetFn: () => void) => void;
}

export function DockWorkspace({ onResetLayout }: DockWorkspaceProps) {
  const apiRef = useRef<DockviewApi | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [layoutSaved, setLayoutSaved] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

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
    try {
      const saved = localStorage.getItem(LAYOUT_KEY);
      if (saved) {
        api.fromJSON(JSON.parse(saved) as any);
        return;
      }
    } catch {
      // fall through
    }
    api.fromJSON(DEFAULT_LAYOUT as any);
  }, []);

  const resetLayout = useCallback(() => {
    if (!apiRef.current) return;
    localStorage.removeItem(LAYOUT_KEY);
    apiRef.current.fromJSON(DEFAULT_LAYOUT as any);
  }, []);

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
  }, [loadLayout, saveLayout]);

  return (
    <div className="relative h-full w-full">
      <DockviewReact
        className="dockview-theme-dark h-full w-full"
        components={components}
        onReady={onReady}
        singleTabMode="fullwidth"
      />

      {/* Layout indicators */}
      {layoutSaved && (
        <div className="absolute top-4 right-4 z-50 animate-fade-in">
          <div className="bg-green-600/90 text-green-100 px-3 py-1 rounded-md text-sm font-medium shadow-lg backdrop-blur-sm">
            Layout saved
          </div>
        </div>
      )}

      {unsavedChanges && !layoutSaved && (
        <div className="absolute top-4 right-4 z-50">
          <div className="bg-amber-600/90 text-amber-100 px-3 py-1 rounded-md text-sm font-medium shadow-lg backdrop-blur-sm flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-300 rounded-full animate-pulse" />
            Saving layout...
          </div>
        </div>
      )}
    </div>
  );
}
