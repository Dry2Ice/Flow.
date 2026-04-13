"use client";

import { useMemo } from 'react';
import { AlertTriangle, Bug, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export function SystemLogsPanel() {
  const { logs, activeSessionId } = useAppStore();

  const sessionLogs = useMemo(
    () => logs.filter((log) => !log.sessionId || log.sessionId === activeSessionId).slice().reverse(),
    [logs, activeSessionId]
  );

  const icon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-rose-400" />;
      case 'warning':
        return <ShieldAlert className="h-4 w-4 text-amber-400" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      default:
        return <Info className="h-4 w-4 text-sky-400" />;
    }
  };

  if (sessionLogs.length === 0) {
    return <p className="p-4 text-sm text-neutral-400">No logs yet for this session.</p>;
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-2">
      {sessionLogs.map((log) => (
        <article key={log.id} className="rounded-lg border border-neutral-700 bg-neutral-900/65 p-3">
          <div className="mb-1 flex items-center gap-2 text-xs text-neutral-400">
            {icon(log.type)}
            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
            <span className="ml-auto uppercase tracking-wider">{log.type}</span>
          </div>
          <p className="text-sm text-neutral-200">{log.message}</p>
        </article>
      ))}
    </div>
  );
}

export function ErrorsPanel() {
  const { bugs } = useAppStore();

  if (bugs.length === 0) {
    return <p className="p-4 text-sm text-neutral-400">No tracked errors right now.</p>;
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-2">
      {bugs.slice().reverse().map((bug) => (
        <article key={bug.id} className="rounded-lg border border-rose-700/40 bg-rose-950/25 p-3">
          <div className="mb-1 flex items-center gap-2 text-xs text-rose-300">
            <Bug className="h-4 w-4" />
            <span className="font-semibold uppercase">{bug.severity}</span>
            <span className="ml-auto text-neutral-400">{bug.status}</span>
          </div>
          <h4 className="text-sm font-semibold text-neutral-100">{bug.title}</h4>
          <p className="mt-1 text-sm text-neutral-300">{bug.description}</p>
        </article>
      ))}
    </div>
  );
}
