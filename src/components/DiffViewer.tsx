'use client';

import { useState } from 'react';
import { X, Check, CheckCheck, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { useAppStore } from '@/lib/store';

export function DiffViewer() {
  const {
    pendingChanges,
    clearPendingChanges,
    setDiffViewerOpen,
    projectPath,
    updateFileContent,
    openFile,
    currentProject,
    setIndexStale,
    autoValidateAfterAI,
  } = useAppStore();
  const [fileIndex, setFileIndex] = useState(0);
  const [rejected, setRejected] = useState<Set<string>>(new Set());

  if (!pendingChanges.length) return null;

  const currentChange = pendingChanges[fileIndex];
  const isRejected = rejected.has(currentChange.id);

  const handleAcceptAll = async () => {
    // Write all non-rejected changes to disk and update store
    for (const change of pendingChanges) {
      if (rejected.has(change.id)) continue;
      const alreadyOpen = useAppStore.getState().openFiles.find((f) => f.path === change.filePath);
      if (alreadyOpen) {
        updateFileContent(change.filePath, change.newContent);
        setIndexStale(true);
      } else {
        openFile(change.filePath, change.newContent);
      }

      if (currentProject && !currentProject.isDemo && projectPath) {
        await fetch('/api/project/file/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectPath, filePath: change.filePath, content: change.newContent }),
        });
      }
    }

    const acceptedChanges = pendingChanges.filter((change) => !rejected.has(change.id));
    if (acceptedChanges.length > 0) {
      try {
        const { autoCommitAfterAIWrite } = await import('@/lib/ai-executor');
        await autoCommitAfterAIWrite({
          explanation: `Applied ${acceptedChanges.length} AI-generated file change(s)`,
          changes: acceptedChanges.map((change) => ({
            filePath: change.filePath,
            newContent: change.newContent,
          })),
        });
      } catch {
        // non-critical
      }
    }

    if (projectPath && autoValidateAfterAI) {
      const { addLog, activeSessionId } = useAppStore.getState();

      addLog({
        id: crypto.randomUUID(),
        sessionId: activeSessionId,
        timestamp: new Date(),
        type: 'info',
        message: 'Running TypeScript type check...',
        source: 'ai_execution',
      });

      try {
        const lintRes = await fetch('/api/project/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: '', filePath: '', projectPath, action: 'lint' }),
        });
        const lintData = await lintRes.json();

        if (!lintData.success && lintData.output) {
          addLog({
            id: crypto.randomUUID(),
            sessionId: activeSessionId,
            timestamp: new Date(),
            type: 'warning',
            message: 'Type errors found — sending to AI for correction',
            source: 'ai_execution',
          });

          const { executeAIRequest } = await import('@/lib/ai-executor');
          await executeAIRequest({
            prompt: `The code changes you just made introduced TypeScript errors. Please fix them:\n\n\`\`\`\n${lintData.output.slice(0, 3000)}\n\`\`\`\n\nFix all errors and output the corrected files.`,
            requestType: 'debugging',
          });
        } else {
          addLog({
            id: crypto.randomUUID(),
            sessionId: activeSessionId,
            timestamp: new Date(),
            type: 'success',
            message: 'TypeScript: no errors after AI changes',
            source: 'ai_execution',
          });
        }
      } catch {
        // Non-critical — validation is best-effort
      }
    }

    clearPendingChanges();
    setDiffViewerOpen(false);
  };

  const handleRejectAll = () => {
    clearPendingChanges();
    setDiffViewerOpen(false);
  };

  const toggleReject = (id: string) => {
    setRejected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex h-[92vh] w-[95vw] max-w-7xl flex-col rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-700 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-neutral-100">Review AI Changes</span>
            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
              {pendingChanges.length - rejected.size} of {pendingChanges.length} accepted
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRejectAll}
              className="flex items-center gap-1.5 rounded-lg border border-red-700/60 bg-red-900/30 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-900/50"
            >
              <XCircle className="h-3.5 w-3.5" /> Reject All
            </button>
            <button
              onClick={handleAcceptAll}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Apply Accepted
            </button>
            <button
              onClick={() => {
                clearPendingChanges();
                setDiffViewerOpen(false);
              }}
              className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto border-b border-neutral-700 px-4 py-2">
          {pendingChanges.map((change, i) => (
            <button
              key={change.id}
              onClick={() => setFileIndex(i)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs transition-colors ${
                i === fileIndex
                  ? 'bg-neutral-700 text-neutral-100'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
              } ${rejected.has(change.id) ? 'opacity-50 line-through' : ''}`}
            >
              {rejected.has(change.id) ? (
                <XCircle className="h-3 w-3 shrink-0 text-red-400" />
              ) : (
                <Check className="h-3 w-3 shrink-0 text-green-400" />
              )}
              {change.filePath.split('/').pop()}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          <div className="flex items-center justify-between bg-neutral-800/50 px-4 py-2">
            <span className="font-mono text-xs text-neutral-400">{currentChange.filePath}</span>
            <button
              onClick={() => toggleReject(currentChange.id)}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                isRejected
                  ? 'bg-green-700/30 text-green-400 hover:bg-green-700/50'
                  : 'bg-red-700/30 text-red-400 hover:bg-red-700/50'
              }`}
            >
              {isRejected ? (
                <>
                  <Check className="h-3 w-3" />Accept this file
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3" />Reject this file
                </>
              )}
            </button>
          </div>
          <ReactDiffViewer
            oldValue={currentChange.oldContent}
            newValue={currentChange.newContent}
            splitView={true}
            useDarkTheme={true}
            disableWordDiff={false}
            leftTitle="Before"
            rightTitle="After"
          />
        </div>

        <div className="flex items-center justify-between border-t border-neutral-700 px-4 py-2">
          <button
            onClick={() => setFileIndex((i) => Math.max(0, i - 1))}
            disabled={fileIndex === 0}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-400 transition-colors hover:text-neutral-100 disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </button>
          <span className="text-xs text-neutral-500">
            {fileIndex + 1} / {pendingChanges.length}
          </span>
          <button
            onClick={() => setFileIndex((i) => Math.min(pendingChanges.length - 1, i + 1))}
            disabled={fileIndex === pendingChanges.length - 1}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-400 transition-colors hover:text-neutral-100 disabled:opacity-30"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
