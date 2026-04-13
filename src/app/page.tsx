"use client";

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Allotment } from 'allotment';
import { BarChart3, Bot, ChevronDown, ChevronLeft, ChevronRight, Code2, FolderOpen, Settings, TriangleAlert, X } from 'lucide-react';
import 'allotment/dist/style.css';

import { CodeEditor } from '@/components/CodeEditor';
import { FileBrowser } from '@/components/FileBrowser';
import { ProjectManager } from '@/components/ProjectManager';
import { CodePreview } from '@/components/CodePreview';
import { AIChat } from '@/components/AIChat';
import { DevelopmentPlan } from '@/components/DevelopmentPlan';
import { DiffViewer } from '@/components/DiffViewer';
import { SettingsModal } from '@/components/SettingsModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PromptInput } from '@/components/PromptInput';
import { ErrorsPanel, SystemLogsPanel } from '@/components/WorkspaceDiagnostics';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { useAppStore } from '@/lib/store';

type SideTab = 'files' | 'projects';
type RightTab = 'chat' | 'logs';
type BottomTab = 'plan' | 'errors';

type WorkspaceLayout = {
  top: [number, number, number];
  vertical: [number, number];
  center: [number, number];
  collapsed: {
    left: boolean;
    right: boolean;
    bottom: boolean;
  };
};

const LAYOUT_STORAGE_KEY = 'flow.ide-layout.v2';
const DEFAULT_LAYOUT: WorkspaceLayout = {
  top: [20, 52, 28],
  vertical: [74, 26],
  center: [62, 38],
  collapsed: {
    left: false,
    right: false,
    bottom: false,
  },
};

const COLLAPSED_SIZE = {
  left: 7,
  right: 9,
  bottom: 13,
};

const normalizeTop = (sizes: [number, number, number], collapsed: WorkspaceLayout['collapsed']) => {
  const next = [...sizes] as [number, number, number];

  if (collapsed.left) {
    const delta = Math.max(next[0] - COLLAPSED_SIZE.left, 0);
    next[0] = COLLAPSED_SIZE.left;
    next[1] += delta;
  }

  if (collapsed.right) {
    const delta = Math.max(next[2] - COLLAPSED_SIZE.right, 0);
    next[2] = COLLAPSED_SIZE.right;
    next[1] += delta;
  }

  return next;
};

const normalizeVertical = (sizes: [number, number], collapsed: WorkspaceLayout['collapsed']) => {
  if (!collapsed.bottom) return sizes;
  const delta = Math.max(sizes[1] - COLLAPSED_SIZE.bottom, 0);
  return [sizes[0] + delta, COLLAPSED_SIZE.bottom];
};

const isLayout = (value: unknown): value is WorkspaceLayout => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as WorkspaceLayout;
  return Array.isArray(candidate.top) && Array.isArray(candidate.vertical) && Array.isArray(candidate.center);
};

const getInitialLayout = (): WorkspaceLayout => {
  if (typeof window === 'undefined') {
    return DEFAULT_LAYOUT;
  }

  const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_LAYOUT;
  }

  try {
    const parsed = JSON.parse(raw);
    return isLayout(parsed) ? parsed : DEFAULT_LAYOUT;
  } catch (error) {
    console.error('Failed to parse workspace layout:', error);
    return DEFAULT_LAYOUT;
  }
};


function PanelHeader({ title, icon, actions }: { title: string; icon: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex items-center justify-between border-b border-neutral-700 bg-neutral-900/80 px-3 py-2">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-300">
        {icon}
        {title}
      </h2>
      <div className="flex items-center gap-1">{actions}</div>
    </header>
  );
}

function PanelButton({ onClick, title, children }: { onClick: () => void; title: string; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="rounded-md border border-neutral-700 bg-neutral-800/80 p-1.5 text-neutral-300 transition hover:border-neutral-600 hover:text-white"
      type="button"
    >
      {children}
    </button>
  );
}

function TopControlButton({
  onClick,
  label,
  isActive = false,
  children,
}: {
  onClick: () => void;
  label: string;
  isActive?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`group relative inline-flex h-9 w-9 items-center justify-center rounded-xl border text-neutral-300 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:text-white active:translate-y-0 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/60 ${
        isActive
          ? 'border-blue-500/70 bg-blue-500/15 shadow-[0_0_0_1px_rgba(59,130,246,0.3),0_10px_24px_-14px_rgba(59,130,246,0.8)]'
          : 'border-neutral-700/70 bg-neutral-900/70 hover:border-neutral-500/70 hover:bg-neutral-800/85'
      }`}
    >
      {children}
      <span className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-[11px] font-medium text-neutral-100 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}

export default function Home() {
  const { diffViewerOpen, projects, currentProject, setCurrentProject } = useAppStore();
  const [layout, setLayout] = useState<WorkspaceLayout>(getInitialLayout);
  const [layoutKey, setLayoutKey] = useState(0);
  const [sideTab, setSideTab] = useState<SideTab>('files');
  const [rightTab, setRightTab] = useState<RightTab>('chat');
  const [bottomTab, setBottomTab] = useState<BottomTab>('plan');
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);


  useEffect(() => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  }, [layout]);

  useEffect(() => {
    if (!currentProject && projects.length > 0) {
      setCurrentProject(projects[0]);
    }
  }, [projects, currentProject, setCurrentProject]);

  const effectiveTop = useMemo(() => normalizeTop(layout.top, layout.collapsed), [layout.top, layout.collapsed]);
  const effectiveVertical = useMemo(() => normalizeVertical(layout.vertical, layout.collapsed), [layout.vertical, layout.collapsed]);

  const toggleCollapse = (panel: keyof WorkspaceLayout['collapsed']) => {
    setLayout((current) => ({
      ...current,
      collapsed: {
        ...current.collapsed,
        [panel]: !current.collapsed[panel],
      },
    }));
    setLayoutKey((key) => key + 1);
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800/90 bg-neutral-950/85 px-4 py-3 backdrop-blur-xl">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <div className="h-5" />
          <div className="flex items-center gap-2 rounded-2xl border border-neutral-800/90 bg-neutral-900/70 px-2 py-1 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.85)]">
            <TopControlButton onClick={() => setSettingsModalOpen(true)} label="Open settings" isActive={settingsModalOpen}>
              <Settings className="h-4 w-4" />
            </TopControlButton>
            <ThemeToggle />
            <TopControlButton onClick={() => setAnalyticsOpen((prev) => !prev)} label="Toggle statistics" isActive={analyticsOpen}>
              <BarChart3 className="h-4 w-4" />
            </TopControlButton>
          </div>
          <div className="justify-self-end text-[11px] uppercase tracking-[0.16em] text-neutral-500">
            Flow Workspace
          </div>
        </div>
      </header>

      <section className="h-[calc(100vh-74px)] overflow-hidden p-2">
        <Allotment
          key={layoutKey}
          vertical
          defaultSizes={effectiveVertical}
          onChange={(sizes: number[]) => setLayout((prev) => ({ ...prev, vertical: [sizes[0], sizes[1]] }))}
        >
          <Allotment.Pane minSize={300}>
            <Allotment
              defaultSizes={effectiveTop}
              onChange={(sizes: number[]) => setLayout((prev) => ({ ...prev, top: [sizes[0], sizes[1], sizes[2]] }))}
            >
              <Allotment.Pane minSize={120}>
                <div className="h-full rounded-lg border border-neutral-800 bg-neutral-900/60 overflow-hidden">
                  <PanelHeader
                    title="Files & Projects"
                    icon={<FolderOpen className="h-3.5 w-3.5" />}
                    actions={
                      <PanelButton onClick={() => toggleCollapse('left')} title="Collapse left panel">
                        <ChevronLeft className="h-4 w-4" />
                      </PanelButton>
                    }
                  />
                  {!layout.collapsed.left ? (
                    <>
                      <div className="flex border-b border-neutral-800 text-xs">
                        <button onClick={() => setSideTab('files')} className={`flex-1 p-2 ${sideTab === 'files' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}>Files</button>
                        <button onClick={() => setSideTab('projects')} className={`flex-1 p-2 ${sideTab === 'projects' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}>Projects</button>
                      </div>
                      <div className="h-[calc(100%-72px)]">{sideTab === 'files' ? <FileBrowser /> : <ProjectManager />}</div>
                    </>
                  ) : (
                    <div className="grid h-[calc(100%-41px)] place-items-center text-xs text-neutral-500">Collapsed</div>
                  )}
                </div>
              </Allotment.Pane>

              <Allotment.Pane minSize={280}>
                <div className="h-full rounded-lg border border-neutral-800 bg-neutral-900/60 overflow-hidden">
                  <PanelHeader title="Code Editor & Preview" icon={<Code2 className="h-3.5 w-3.5" />} />
                  <div className="h-[calc(100%-41px)]">
                    <Allotment
                      vertical
                      defaultSizes={layout.center}
                      onChange={(sizes: number[]) => setLayout((prev) => ({ ...prev, center: [sizes[0], sizes[1]] }))}
                    >
                      <Allotment.Pane minSize={180}><CodeEditor /></Allotment.Pane>
                      <Allotment.Pane minSize={140}><CodePreview /></Allotment.Pane>
                    </Allotment>
                  </div>
                </div>
              </Allotment.Pane>

              <Allotment.Pane minSize={200}>
                <div className="h-full rounded-lg border border-neutral-800 bg-neutral-900/60 overflow-hidden">
                  <PanelHeader
                    title="AI Chat / Logs"
                    icon={<Bot className="h-3.5 w-3.5" />}
                    actions={
                      <PanelButton onClick={() => toggleCollapse('right')} title="Collapse right panel">
                        <ChevronRight className="h-4 w-4" />
                      </PanelButton>
                    }
                  />
                  {!layout.collapsed.right ? (
                    <>
                      <div className="flex border-b border-neutral-800 text-xs">
                        <button onClick={() => setRightTab('chat')} className={`flex-1 p-2 ${rightTab === 'chat' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}>AI Chat</button>
                        <button onClick={() => setRightTab('logs')} className={`flex-1 p-2 ${rightTab === 'logs' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}>Logs</button>
                      </div>
                      <div className="h-[calc(100%-118px)]">{rightTab === 'chat' ? <AIChat /> : <SystemLogsPanel />}</div>
                      <div className="border-t border-neutral-800"><PromptInput /></div>
                    </>
                  ) : (
                    <div className="grid h-[calc(100%-41px)] place-items-center text-xs text-neutral-500">Collapsed</div>
                  )}
                </div>
              </Allotment.Pane>
            </Allotment>
          </Allotment.Pane>

          <Allotment.Pane minSize={120}>
            <div className="h-full rounded-lg border border-neutral-800 bg-neutral-900/60 overflow-hidden">
              <PanelHeader
                title="Development Plan / Errors"
                icon={<TriangleAlert className="h-3.5 w-3.5" />}
                actions={
                  <PanelButton onClick={() => toggleCollapse('bottom')} title="Collapse bottom panel">
                    <ChevronDown className="h-4 w-4" />
                  </PanelButton>
                }
              />
              {!layout.collapsed.bottom ? (
                <>
                  <div className="flex border-b border-neutral-800 text-xs">
                    <button onClick={() => setBottomTab('plan')} className={`flex-1 p-2 ${bottomTab === 'plan' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}>Development Plan</button>
                    <button onClick={() => setBottomTab('errors')} className={`flex-1 p-2 ${bottomTab === 'errors' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}>Errors</button>
                  </div>
                  <div className="h-[calc(100%-72px)] overflow-hidden">{bottomTab === 'plan' ? <DevelopmentPlan /> : <ErrorsPanel />}</div>
                </>
              ) : (
                <div className="grid h-[calc(100%-41px)] place-items-center text-xs text-neutral-500">Collapsed</div>
              )}
            </div>
          </Allotment.Pane>
        </Allotment>
      </section>

      {diffViewerOpen && <DiffViewer />}
      <aside
        className={`fixed inset-y-0 right-0 z-40 w-full max-w-[420px] border-l border-neutral-800 bg-neutral-950/96 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out ${
          analyticsOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!analyticsOpen}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-300">Statistics</h2>
          <PanelButton onClick={() => setAnalyticsOpen(false)} title="Close statistics panel">
            <X className="h-4 w-4" />
          </PanelButton>
        </div>
        <div className="h-[calc(100%-41px)] overflow-y-auto">
          <AnalyticsDashboard />
        </div>
      </aside>
      <SettingsModal isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} />
    </main>
  );
}
