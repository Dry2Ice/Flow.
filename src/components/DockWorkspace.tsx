'use client';

import { useEffect, useRef, useCallback } from 'react';
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

// Map panel id → component
const components: Record<string, React.FC<IDockviewPanelProps>> = {
  files: () => <FileBrowser />,
  projects: () => <ProjectManager />,
  editor: () => <CodeEditor />,
  preview: () => <CodePreview />,
  chat: () => (
    <div className="flex h-full flex-col">
      <AIChat />
      <PromptInput />
    </div>
  ),
  logs: () => <SystemLogsPanel />,
  plan: () => <DevelopmentPlan />,
};

const LAYOUT_KEY = 'flow.dockview-layout.v1';

const DEFAULT_LAYOUT = {
  grid: {
    root: {
      type: 'branch',
      data: [
        {
          type: 'branch',
          data: [
            { type: 'leaf', data: { views: ['files'] }, id: 'left', size: 20 },
            {
              type: 'branch',
              data: [
                { type: 'leaf', data: { views: ['editor', 'preview'] }, id: 'center', size: 60 },
              ],
              size: 55,
            },
            { type: 'leaf', data: { views: ['chat'] }, id: 'right', size: 25 },
          ],
          id: 'top',
          size: 70,
        },
        { type: 'leaf', data: { views: ['plan'] }, id: 'bottom', size: 30 },
      ],
      id: 'root',
      size: 100,
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
  activeGroup: 'center',
};

interface DockWorkspaceProps {
  onResetLayout?: (resetFn: () => void) => void;
}

export function DockWorkspace({ onResetLayout }: DockWorkspaceProps) {
  const apiRef = useRef<DockviewApi | null>(null);

  const saveLayout = useCallback(() => {
    if (!apiRef.current) return;
    try {
      const layout = apiRef.current.toJSON();
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
    } catch {
      // ignore
    }
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

  useEffect(() => {
    onResetLayout?.(resetLayout);
  }, [resetLayout, onResetLayout]);

  const onReady = useCallback((event: DockviewReadyEvent) => {
    apiRef.current = event.api;
    event.api.onDidLayoutChange(() => saveLayout());
    loadLayout(event.api);
  }, [loadLayout, saveLayout]);

  return (
    <DockviewReact
      className="dockview-theme-dark h-full w-full"
      components={components}
      onReady={onReady}
      singleTabMode="fullwidth"
    />
  );
}
