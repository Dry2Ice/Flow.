"use client";

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Settings, BarChart3, X } from 'lucide-react';

import { SettingsModal } from '@/components/SettingsModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { DiffViewer } from '@/components/DiffViewer';
import { useAppStore } from '@/lib/store';
import { nvidiaNimService } from '@/lib/nvidia-nim';
import { DockWorkspace } from '@/components/DockWorkspace';
import { useI18n } from '@/lib/i18n';

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
  const { t, locale } = useI18n();
  const { diffViewerOpen, projects, currentProject, setCurrentProject } = useAppStore();
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [statsOpen, setStatsOpen] = useState(true);
  const resetDockLayoutRef = useRef<(() => void) | null>(null);

  // NIM config: configure client-side service and update UI status
  useEffect(() => {
    const check = () => {
      try {
        const s = JSON.parse(localStorage.getItem('nim-settings') || '{}');
        const configured = typeof s.apiKey === 'string' && s.apiKey.trim().length > 0 &&
          typeof s.baseUrl === 'string' && s.baseUrl.trim().length > 0;
        setApiConfigured(configured);
        if (configured && s.model) {
          nvidiaNimService.setConfig({
            apiKey: s.apiKey,
            baseUrl: s.baseUrl,
            model: s.model,
            temperature: s.temperature ?? 0.7,
            topP: s.topP ?? 1.0,
            topK: s.topK ?? 50,
            maxTokens: s.maxTokens ?? 4000,
            contextTokens: s.contextTokens ?? 0,
            presencePenalty: s.presencePenalty ?? 0.0,
            frequencyPenalty: s.frequencyPenalty ?? 0.0,
            stopSequences: Array.isArray(s.stopSequences) ? s.stopSequences : [],
          });
        }
      } catch {
        setApiConfigured(false);
      }
    };
    check();
    window.addEventListener('settings-saved', check);
    return () => window.removeEventListener('settings-saved', check);
  }, []);

  // Auto-initialize NIM config on server via API (server-side singleton)
  useEffect(() => {
    const initNimConfig = async () => {
      try {
        const s = JSON.parse(localStorage.getItem('nim-settings') || '{}');
        if (s.apiKey && s.baseUrl && s.model) {
          const payload: any = { apiKey: s.apiKey, baseUrl: s.baseUrl, model: s.model };
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
        }
      } catch (error) {
        console.error('Failed to initialize NIM config on server:', error);
      }
    };
    initNimConfig();
  }, []);

  // Listen for reset-dock-layout event from SettingsModal
  useEffect(() => {
    const handler = () => resetDockLayoutRef.current?.();
    window.addEventListener('reset-dock-layout', handler);
    return () => window.removeEventListener('reset-dock-layout', handler);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('flow:focus-preset-selector'));
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Demo project creation on first visit
  useEffect(() => {
    if (projects.length === 0) {
      const { openFile, addMessage } = useAppStore.getState();
      const demoProject = {
        id: 'demo',
        name: t('app.demoProject'),
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
    <h1>${t('app.demoWelcomeTitle')}</h1>
    <p>${t('app.demoWelcomeDescription')}</p>
  </div>
  <script src="script.js"></script>
</body>
</html>`);

      addMessage('default-session', {
        id: 'welcome',
        sessionId: 'default-session',
        role: 'assistant',
        content: t('app.welcomeMessage'),
        timestamp: new Date(),
      });
    } else if (!currentProject && projects.length > 0) {
      setCurrentProject(projects[0]);
    }
  }, [projects, currentProject, setCurrentProject, t, locale]);

  return (
    <main className="min-h-screen text-neutral-100">
      <header className="app-header relative z-10 border-b border-neutral-800/90 bg-neutral-950/85 backdrop-blur-xl">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">{t('app.workspace')}</p>
            <h1 className="text-sm font-semibold text-neutral-100">{t('app.title')}</h1>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-neutral-800/90 bg-neutral-900/70 px-2 py-1 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.85)]">
            <TopControlButton onClick={() => setSettingsModalOpen(true)} label={t('app.openSettings')} isActive={settingsModalOpen}>
              <Settings className="h-4 w-4" />
            </TopControlButton>
            <ThemeToggle />
            <TopControlButton onClick={() => setStatsOpen(!statsOpen)} label={t('app.toggleStatistics')} isActive={statsOpen}>
              <BarChart3 className="h-4 w-4" />
            </TopControlButton>
          </div>
          <div className="justify-self-end flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${apiConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
              {apiConfigured ? t('app.aiReady') : (
                <button
                  type="button"
                  onClick={() => setSettingsModalOpen(true)}
                  className="uppercase tracking-[0.16em] text-amber-500 hover:text-amber-400 transition"
                >
                  {t('app.configureApi')}
                </button>
              )}
            </span>
          </div>
        </div>
      </header>

      <section className="h-[calc(100vh-74px)]">
        <DockWorkspace onResetLayout={(fn) => {
          resetDockLayoutRef.current = fn;
        }} />
      </section>

      {diffViewerOpen && <DiffViewer />}

      <aside
        className={`fixed inset-y-0 right-0 z-40 w-full max-w-[420px] border-l border-neutral-800 bg-neutral-950/96 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out ${
          statsOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!statsOpen}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-300">{t('app.statistics')}</h2>
          <button
            onClick={() => setStatsOpen(false)}
            title={t('app.closeStatisticsPanel')}
            className="rounded-md border border-neutral-700 bg-neutral-800/80 p-1.5 text-neutral-300 transition hover:border-neutral-600 hover:text-white"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-[calc(100%-41px)] overflow-y-auto">
          <AnalyticsDashboard />
        </div>
      </aside>

      <SettingsModal isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} />
    </main>
  );
}
