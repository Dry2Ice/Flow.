'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  DockviewReact,
  DockviewReadyEvent,
  IDockviewPanelProps,
  DockviewApi,
} from 'dockview';
import { CodeEditor } from '@/components/CodeEditor';
import { CodePreview } from '@/components/CodePreview';
import { FileBrowser } from '@/components/FileBrowser';
import { ProjectManager } from '@/components/ProjectManager';
import { AIChat } from '@/components/AIChat';
import { SystemLogsPanel } from '@/components/WorkspaceDiagnostics';
import { DevelopmentPlan } from '@/components/DevelopmentPlan';
import { PromptInput } from '@/components/PromptInput';
import { AIErrorBoundary } from '@/components/AIErrorBoundary';

// Map panel id → component
const components: Record<string, React.FC<IDockviewPanelProps>> = {
  files: () => <FileBrowser />,
  projects: () => <ProjectManager />,
  editor: () => <CodeEditor />,
  preview: () => <CodePreview />,
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

  // Debounced layout save (500ms delay)
  const saveLayout = useCallback(() => {
    if (!apiRef.current) return;

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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

      {/* Layout saved indicator */}
      {layoutSaved && (
        <div className="absolute top-4 right-4 z-50 animate-fade-in">
          <div className="bg-green-600/90 text-green-100 px-3 py-1 rounded-md text-sm font-medium shadow-lg backdrop-blur-sm">
            Layout saved
          </div>
        </div>
      )}
    </div>
  );
}
