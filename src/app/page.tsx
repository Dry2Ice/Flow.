"use client";

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Allotment } from 'allotment';
import { ArrowLeftRight, BarChart3, Bot, ChevronDown, ChevronLeft, ChevronRight, Code2, FolderOpen, Settings, TriangleAlert, X } from 'lucide-react';
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
import { SystemLogsPanel } from '@/components/WorkspaceDiagnostics';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { useAppStore } from '@/lib/store';
import { nvidiaNimService } from '@/lib/nvidia-nim';

type SideTab = 'files' | 'projects';
type RightTab = 'chat' | 'logs';
type CenterMode = 'edit' | 'preview' | 'split';

type WorkspaceLayout = {
  top: [number, number, number];
  vertical: [number, number];
  center: [number, number];
  collapsed: {
    left: boolean;
    right: boolean;
    bottom: boolean;
    stats: boolean;
  };
  order: {
    leftRightSwapped: boolean;
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
    stats: true,
  },
  order: {
    leftRightSwapped: false,
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

const migrateLayout = (layout: any): WorkspaceLayout => {
  // Ensure all required fields exist with defaults
  return {
    top: layout.top || DEFAULT_LAYOUT.top,
    vertical: layout.vertical || DEFAULT_LAYOUT.vertical,
    center: layout.center || DEFAULT_LAYOUT.center,
    collapsed: {
      left: layout.collapsed?.left ?? DEFAULT_LAYOUT.collapsed.left,
      right: layout.collapsed?.right ?? DEFAULT_LAYOUT.collapsed.right,
      bottom: layout.collapsed?.bottom ?? DEFAULT_LAYOUT.collapsed.bottom,
      stats: layout.collapsed?.stats ?? DEFAULT_LAYOUT.collapsed.stats,
    },
    order: {
      leftRightSwapped: layout.order?.leftRightSwapped ?? DEFAULT_LAYOUT.order.leftRightSwapped,
    },
  };
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
    // Always migrate to ensure all fields are present
    return migrateLayout(parsed);
  } catch (error) {
    console.error('Failed to parse workspace layout:', error);
    return DEFAULT_LAYOUT;
  }
};


function PanelHeader({ title, icon, actions }: { title: string; icon: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flow-panel-header flex items-center justify-between px-3 py-2">
      <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-300">
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
      aria-label={title}
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
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  // analyticsOpen is now controlled by layout.collapsed.stats
  const [apiConfigured, setApiConfigured] = useState(false);
  const [centerMode, setCenterMode] = useState<CenterMode>('edit');


  useEffect(() => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  }, [layout]);

  useEffect(() => {
    const handleStorageReset = (event: StorageEvent) => {
      if (event.key !== LAYOUT_STORAGE_KEY) return;
      try {
        const parsed = JSON.parse(event.newValue ?? '');
        const migratedLayout = migrateLayout(parsed);
        setLayout(migratedLayout);
        setLayoutKey((k) => k + 1);
      } catch {
        // ignore malformed values
      }
    };

    window.addEventListener('storage', handleStorageReset);
    return () => window.removeEventListener('storage', handleStorageReset);
  }, []);

   useEffect(() => {
     const check = () => {
       try {
         const s = JSON.parse(localStorage.getItem('nim-settings') || '{}');
         setApiConfigured(
           typeof s.apiKey === 'string' && s.apiKey.trim().length > 0 &&
           typeof s.baseUrl === 'string' && s.baseUrl.trim().length > 0
         );
       } catch {
         setApiConfigured(false);
       }
     };
     check();
     window.addEventListener('settings-saved', check);
     return () => window.removeEventListener('settings-saved', check);
   }, []);

   // Auto-initialize NIM config from saved localStorage settings
   useEffect(() => {
     const initNimConfig = async () => {
       try {
         const s = JSON.parse(localStorage.getItem('nim-settings') || '{}');
         if (s.apiKey && s.baseUrl && s.model) {
           const payload: any = {
             apiKey: s.apiKey,
             baseUrl: s.baseUrl,
             model: s.model,
           };
           // Include optional params if present
           if (s.temperature !== undefined) payload.temperature = s.temperature;
           if (s.topP !== undefined) payload.topP = s.topP;
           if (s.topK !== undefined) payload.topK = s.topK;
           if (s.maxTokens !== undefined) payload.maxTokens = s.maxTokens;
           if (s.contextTokens !== undefined) payload.contextTokens = s.contextTokens;
           if (s.presencePenalty !== undefined) payload.presencePenalty = s.presencePenalty;
           if (s.frequencyPenalty !== undefined) payload.frequencyPenalty = s.frequencyPenalty;
           if (s.stopSequences && Array.isArray(s.stopSequences)) payload.stopSequences = s.stopSequences;
           await fetch('/api/nim/config', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(payload),
           });
           // Also configure client-side service directly
           nvidiaNimService.setConfig({
             apiKey: s.apiKey,
             baseUrl: s.baseUrl,
             model: s.model,
             temperature: s.temperature,
             topP: s.topP,
             topK: s.topK,
             maxTokens: s.maxTokens,
             contextTokens: s.contextTokens,
             presencePenalty: s.presencePenalty,
             frequencyPenalty: s.frequencyPenalty,
             stopSequences: s.stopSequences,
           });
         }
       } catch (error) {
         console.error('Failed to initialize NIM config:', error);
       }
     };
     initNimConfig();
   }, []);

  useEffect(() => {
    if (projects.length === 0) {
      const { openFile, addMessage } = useAppStore.getState();
      const demoProject = {
        id: 'demo',
        name: 'Demo Project',
        path: '/demo',
        files: [
          { name: 'index.html', path: 'index.html', type: 'file' as const },
          { name: 'styles.css', path: 'styles.css', type: 'file' as const },
          { name: 'script.js', path: 'script.js', type: 'file' as const },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDemo: true,
      };
      useAppStore.setState({ projects: [demoProject], currentProject: demoProject });

      openFile('index.html', `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Flow Demo</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="container">
    <h1>Welcome to <span class="brand">Flow</span></h1>
    <p>AI-powered development platform. Open a real project or start chatting with the AI.</p>
  </div>
  <script src="script.js"></script>
</body>
</html>`);

      addMessage('default-session', {
        id: 'welcome',
        sessionId: 'default-session',
        role: 'assistant',
        content: '👋 **Welcome to Flow!**\n\nI\'m your AI development assistant. To get started:\n\n1. **Configure your API** — click the Settings button in the header and enter your NVIDIA NIM API key\n2. **Open a project** — use the Projects tab to create a new project or load an existing directory\n3. **Ask me anything** — type a prompt below and I\'ll write, debug, or plan code for you',
        timestamp: new Date(),
      });

    } else if (!currentProject && projects.length > 0) {
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

  const togglePanelOrder = () => {
    setLayout((current) => ({
      ...current,
      order: {
        ...current.order,
        leftRightSwapped: !current.order.leftRightSwapped,
      },
    }));
    setLayoutKey((key) => key + 1);
  };

  // Panel components
  const leftPanel = (
    <Allotment.Pane minSize={88} key="left">
      <div className="flow-panel h-full">
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
            <div className="border-b border-neutral-800/70 px-2 py-2">
              <div className="flex gap-2">
                <button data-active={sideTab === 'files'} onClick={() => setSideTab('files')} className="flow-tab flex-1">Files</button>
                <button data-active={sideTab === 'projects'} onClick={() => setSideTab('projects')} className="flow-tab flex-1">Projects</button>
              </div>
            </div>
            <div className="h-[calc(100%-72px)]">{sideTab === 'files' ? <FileBrowser /> : <ProjectManager />}</div>
          </>
        ) : (
          <div className="grid h-[calc(100%-41px)] place-items-center text-xs text-neutral-500">Collapsed</div>
        )}
      </div>
    </Allotment.Pane>
  );

  const centerPanel = (
    <Allotment.Pane minSize={220} key="center">
      <div className="flow-panel h-full">
        <PanelHeader
          title="Code Editor & Preview"
          icon={<Code2 className="h-3.5 w-3.5" />}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCenterMode('edit')}
                className={`flow-tab text-xs px-3 py-1 ${centerMode === 'edit' ? 'bg-blue-600/20 border-blue-400' : ''}`}
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => setCenterMode('preview')}
                className={`flow-tab text-xs px-3 py-1 ${centerMode === 'preview' ? 'bg-green-600/20 border-green-400' : ''}`}
              >
                👁️ Preview
              </button>
              <button
                onClick={() => setCenterMode('split')}
                className={`flow-tab text-xs px-3 py-1 ${centerMode === 'split' ? 'bg-purple-600/20 border-purple-400' : ''}`}
              >
                ⬛ Split
              </button>
              {centerMode === 'edit' && (
                <>
                  <button
                    onClick={() => {
                      import('@/components/CodeEditor').then(({ codeEditorActions }) => {
                        codeEditorActions.saveChanges();
                      });
                    }}
                    className="flow-tab text-xs px-3 py-1 bg-green-600/20 border-green-400 hover:bg-green-500/30"
                  >
                    💾 Save
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Reset all unsaved changes? This will revert to the last saved version.')) {
                        import('@/components/CodeEditor').then(({ codeEditorActions }) => {
                          codeEditorActions.resetChanges();
                        });
                      }
                    }}
                    className="flow-tab text-xs px-3 py-1 bg-red-600/20 border-red-400 hover:bg-red-500/30"
                  >
                    🔄 Reset
                  </button>
                </>
              )}
              {(centerMode === 'preview' || centerMode === 'split') && (
                <button
                  onClick={() => {
                    const iframe = document.querySelector('iframe');
                    if (iframe) {
                      iframe.src = iframe.src;
                    } else {
                      window.location.reload();
                    }
                  }}
                  className="flow-tab text-xs px-3 py-1 bg-blue-600/20 border-blue-400 hover:bg-blue-500/30"
                >
                  🔄 Refresh Preview
                </button>
              )}
            </div>
          }
        />
        <div className="h-[calc(100%-41px)]">
          {centerMode === 'edit' && <CodeEditor />}
          {centerMode === 'preview' && <CodePreview />}
          {centerMode === 'split' && (
            <Allotment
              vertical
              defaultSizes={layout.center}
              onChange={(sizes: number[]) =>
                setLayout((prev) => ({ ...prev, center: [sizes[0], sizes[1]] }))
              }
            >
              <Allotment.Pane minSize={120}><CodeEditor /></Allotment.Pane>
              <Allotment.Pane minSize={80}><CodePreview /></Allotment.Pane>
            </Allotment>
          )}
        </div>
      </div>
    </Allotment.Pane>
  );

  const rightPanel = (
    <Allotment.Pane minSize={140} key="right">
      <div className="flow-panel h-full">
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
             <div className="border-b border-neutral-800/70 px-3 py-3 mt-2 bg-neutral-900/50">
               <div className="flex gap-2">
                 <button
                   data-active={rightTab === 'chat'}
                   onClick={() => setRightTab('chat')}
                   className="flow-tab flex-1 text-xs font-medium px-3 py-2 min-h-[32px] transition-all duration-200 hover:scale-105"
                 >
                   💬 AI Chat
                 </button>
                 <button
                   data-active={rightTab === 'logs'}
                   onClick={() => setRightTab('logs')}
                   className="flow-tab flex-1 text-xs font-medium px-3 py-2 min-h-[32px] transition-all duration-200 hover:scale-105"
                 >
                   📋 Logs
                 </button>
               </div>
             </div>
             <div className="h-[calc(100%-140px)]">{rightTab === 'chat' ? <AIChat /> : <SystemLogsPanel />}</div>
             <div className="border-t border-neutral-800"><PromptInput /></div>
           </>
         ) : (
           <div className="grid h-[calc(100%-42px)] place-items-center text-xs text-neutral-500">Collapsed</div>
         )}
      </div>
    </Allotment.Pane>
  );

  // Determine panel order
  const topPanels = layout.order.leftRightSwapped
    ? [rightPanel, centerPanel, leftPanel]
    : [leftPanel, centerPanel, rightPanel];

  return (
    <main className="min-h-screen text-neutral-100">
      <header className="app-header border-b border-neutral-800/90 bg-neutral-950/85 backdrop-blur-xl">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Workspace</p>
            <h1 className="text-sm font-semibold text-neutral-100">Flow IDE</h1>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-neutral-800/90 bg-neutral-900/70 px-2 py-1 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.85)]">
            <TopControlButton onClick={() => setSettingsModalOpen(true)} label="Open settings" isActive={settingsModalOpen}>
              <Settings className="h-4 w-4" />
            </TopControlButton>
            <ThemeToggle />
            <TopControlButton onClick={togglePanelOrder} label="Swap panel order" isActive={layout.order.leftRightSwapped}>
              <ArrowLeftRight className="h-4 w-4" />
            </TopControlButton>
            <TopControlButton onClick={() => toggleCollapse('stats')} label="Toggle statistics" isActive={!layout.collapsed.stats}>
              <BarChart3 className="h-4 w-4" />
            </TopControlButton>
          </div>
          <div className="justify-self-end flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${apiConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`}
            />
            <span className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
              {apiConfigured ? 'AI Ready' : (
                <button
                  type="button"
                  onClick={() => setSettingsModalOpen(true)}
                  className="uppercase tracking-[0.16em] text-amber-500 hover:text-amber-400 transition"
                >
                  Configure API
                </button>
              )}
            </span>
          </div>
        </div>
      </header>

      <section className="app-shell h-[calc(100vh-74px)] overflow-hidden">
        <Allotment
          key={layoutKey}
          vertical
          defaultSizes={effectiveVertical}
          onChange={(sizes: number[]) => setLayout((prev) => ({ ...prev, vertical: [sizes[0], sizes[1]] }))}
        >
          <Allotment.Pane minSize={220}>
            <Allotment
              defaultSizes={effectiveTop}
              onChange={(sizes: number[]) => setLayout((prev) => ({ ...prev, top: [sizes[0], sizes[1], sizes[2]] }))}
            >
              {topPanels}
            </Allotment>
          </Allotment.Pane>

          <Allotment.Pane minSize={90}>
            <div className="flow-panel h-full">
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
                 <div className="h-[calc(100%-41px)] overflow-hidden">
                   <DevelopmentPlan />
                 </div>
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
          !layout.collapsed.stats ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={layout.collapsed.stats}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-300">Statistics</h2>
          <PanelButton onClick={() => toggleCollapse('stats')} title="Close statistics panel">
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
