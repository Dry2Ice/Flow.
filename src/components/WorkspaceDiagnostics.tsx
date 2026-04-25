"use client";

import { useState } from 'react';
import { useMemo } from 'react';
import { AlertTriangle, Bug, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { executeAIRequest } from '@/lib/ai-executor';
import { BugReport } from '@/types';

export function SystemLogsPanel() {
  const { logs, activeSessionId } = useAppStore();

  const sessionLogs = useMemo(
    () => logs.filter((log) => !log.sessionId || log.sessionId === activeSessionId).slice().reverse(),
    [logs, activeSessionId]
  );

  const icon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-rose-400 text-rose-700" />;
      case 'warning':
        return <ShieldAlert className="h-4 w-4 text-amber-400 text-amber-700" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600 text-emerald-700 dark:text-emerald-400" />;
      default:
        return <Info className="h-4 w-4 text-sky-400 text-sky-700" />;
    }
  };

  if (sessionLogs.length === 0) {
    return <p className="p-4 text-sm text-neutral-400 text-neutral-600">No logs yet for this session.</p>;
  }

  return (
    <div className="h-full space-y-2 overflow-y-auto p-3">
      {sessionLogs.map((log) => (
        <article key={log.id} className="rounded-lg border border-neutral-700 bg-neutral-900/65 p-3 border-neutral-300 bg-white">
          <div className="mb-1 flex items-center gap-2 text-xs text-neutral-400 text-neutral-600">
            {icon(log.type)}
            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
            <span className="ml-auto uppercase tracking-wider">{log.type}</span>
          </div>
          <p className="text-sm text-neutral-800">{log.message}</p>
        </article>
      ))}
    </div>
  );
}

export function ErrorsPanel() {
  const { bugs, updateBug, addBug, deleteBug, activeSessionId } = useAppStore();
  const [loadingBugId, setLoadingBugId] = useState<string | null>(null);

  const handleCheckBug = async (bug: BugReport) => {
    setLoadingBugId(bug.id);
    updateBug(bug.id, { status: 'investigating' });
    const result = await executeAIRequest({
      requestType: 'analysis',
      presetId: 'analyze',
      prompt: `Analyze whether this bug still exists in the current codebase.\nBug: ${bug.title}\nDescription: ${bug.description}\nSeverity: ${bug.severity}\nCurrent status: ${bug.status}`,
    });
    updateBug(bug.id, {
      status: result.ok ? 'investigating' : bug.status,
      lastChecked: new Date(),
    });
    setLoadingBugId(null);
  };

  const handleFixBug = async (bug: BugReport) => {
    setLoadingBugId(bug.id);
    updateBug(bug.id, { status: 'fixing' });
    const result = await executeAIRequest({
      requestType: 'debugging',
      presetId: 'debug',
      prompt: `Fix this bug.\nTitle: ${bug.title}\nDescription: ${bug.description}\nSeverity: ${bug.severity}\nRelated files: ${bug.relatedFiles?.join(', ') || 'N/A'}`,
    });
    updateBug(bug.id, {
      status: result.ok ? 'resolved' : 'fixing',
      lastChecked: new Date(),
    });
    setLoadingBugId(null);
  };

  if (bugs.length === 0) {
    return <p className="p-4 text-sm text-neutral-400 text-neutral-600">No tracked errors right now.</p>;
  }

  return (
    <div className="h-full space-y-2 overflow-y-auto p-3">
      {bugs.slice().reverse().map((bug) => (
        <article key={bug.id} className="rounded-lg border border-rose-700/40 bg-rose-950/25 p-3">
          <div className="mb-1 flex items-center gap-2 text-xs text-rose-300">
            <Bug className="h-4 w-4" />
            <span className="font-semibold uppercase">{bug.severity}</span>
            <span className="ml-auto text-neutral-400">{bug.status}</span>
          </div>
          <h4 className="text-sm font-semibold">{bug.title}</h4>
          <p className="mt-1 text-sm text-neutral-300 text-neutral-700">{bug.description}</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => handleCheckBug(bug)}
              disabled={loadingBugId === bug.id}
              className="rounded border border-sky-700/50 bg-sky-900/30 px-2 py-1 text-xs text-sky-300 transition hover:bg-sky-800/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingBugId === bug.id ? 'Checking…' : 'Check'}
            </button>
            <button
              onClick={() => handleFixBug(bug)}
              disabled={loadingBugId === bug.id}
              className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-700/50 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-800/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingBugId === bug.id ? 'Fixing…' : 'Fix'}
            </button>
            <button
              onClick={() => deleteBug(bug.id)}
              className="ml-auto rounded border border-neutral-700 bg-neutral-800/50 px-2 py-1 text-xs text-neutral-400 transition hover:text-rose-300"
            >
              Dismiss
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

export function LogsAndErrorsPanel() {
  const [activeTab, setActiveTab] = useState<'logs' | 'errors'>('logs');
  const { bugs } = useAppStore();

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 border-b border-neutral-700 border-neutral-300">
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 text-xs font-semibold transition ${
            activeTab === 'logs'
              ? 'border-b-2 border-blue-500 text-blue-400 text-blue-700'
              : 'text-neutral-400 hover:text-neutral-200 hover:text-neutral-700'
          }`}
        >
          Logs
        </button>
        <button
          onClick={() => setActiveTab('errors')}
          className={`px-4 py-2.5 text-xs font-semibold transition ${
            activeTab === 'errors'
              ? 'border-b-2 border-rose-500 text-rose-400 text-rose-700'
              : 'text-neutral-400 hover:text-neutral-200 hover:text-neutral-700'
          }`}
        >
          Errors {bugs.length > 0 && `(${bugs.length})`}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === 'logs' ? <SystemLogsPanel /> : <ErrorsPanel />}
      </div>
    </div>
  );
}
