import { CodeChange } from '@/types';
import { GitSlice, StoreGet, StoreSet } from '../types';

export const createGitSlice = (set: StoreSet, get: StoreGet): GitSlice => ({
  pendingChanges: [],
  gitInitialized: false,
  commits: [],
  autoCommitAfterAI: false,

  setPendingChanges: (changes) => set({ pendingChanges: changes }),
  clearPendingChanges: () => set({ pendingChanges: [] }),
  applyPendingChange: (changeId) => set((state) => ({
    pendingChanges: state.pendingChanges.filter((change) => change.id !== changeId),
  })),

  setGitInitialized: (initialized) => set({ gitInitialized: initialized }),
  setCommits: (commits) => set({ commits }),
  setAutoCommitAfterAI: (enabled) => set({ autoCommitAfterAI: enabled }),

  initializeGitRepo: async () => {
    const state = get();
    if (!state.currentProject || state.currentProject.isDemo) return;

    const response = await fetch('/api/git', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'init', projectPath: state.currentProject.path }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to initialize repository');

    set({ gitInitialized: true });
    state.addLog({
      id: crypto.randomUUID(),
      sessionId: state.activeSessionId,
      timestamp: new Date(),
      type: 'success',
      message: `Git repository initialized for ${state.currentProject.name}`,
      source: 'file_operation',
    });
  },

  saveActiveFile: async () => {
    const state = get();
    if (!state.currentProject || state.currentProject.isDemo || !state.activeFile) return;

    const active = state.openFiles.find((file) => file.path === state.activeFile);
    if (!active) return;

    const response = await fetch('/api/git', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save',
        projectPath: state.currentProject.path,
        filePath: active.path,
        content: active.content,
        commitMessage: `feat: save ${active.path}`,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to save changes');

    if (data.skipped) {
      state.addLog({
        id: crypto.randomUUID(), sessionId: state.activeSessionId, timestamp: new Date(), type: 'info',
        message: `No changes to save for ${active.path}`, source: 'file_operation',
      });
      return;
    }

    const change: CodeChange = {
      id: crypto.randomUUID(),
      filePath: active.path,
      oldContent: data.oldContent || '',
      newContent: data.newContent || active.content,
      timestamp: new Date(),
      description: `Saved ${active.path} to git`,
    };

    set((current) => ({
      currentDiff: change,
      diffViewerOpen: true,
      commits: data.latestCommit
        ? [data.latestCommit, ...current.commits.filter((commit) => commit.hash !== data.latestCommit.hash)]
        : current.commits,
      gitInitialized: true,
    }));

    state.addLog({
      id: crypto.randomUUID(),
      sessionId: state.activeSessionId,
      timestamp: new Date(),
      type: 'success',
      message: `Saved and committed ${active.path}`,
      details: data.latestCommit?.hash ? `Commit: ${data.latestCommit.hash}` : undefined,
      source: 'file_operation',
    });
  },

  loadCommitHistory: async (limit = 20) => {
    const state = get();
    if (!state.currentProject || state.currentProject.isDemo) return;

    const response = await fetch('/api/git', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'history', projectPath: state.currentProject.path, limit }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to load git history');

    set({ commits: data.commits || [], gitInitialized: true });
    state.addLog({
      id: crypto.randomUUID(),
      sessionId: state.activeSessionId,
      timestamp: new Date(),
      type: 'info',
      message: `Loaded ${data.commits?.length || 0} commits`,
      source: 'file_operation',
    });
  },

  rollbackToCommit: async (commitHash: string) => {
    const state = get();
    if (!state.currentProject || state.currentProject.isDemo) return;

    const response = await fetch('/api/git', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rollback', projectPath: state.currentProject.path, commitHash }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Rollback failed');

    state.addLog({
      id: crypto.randomUUID(),
      sessionId: state.activeSessionId,
      timestamp: new Date(),
      type: 'warning',
      message: `Rollback to commit ${commitHash}`,
      source: 'user_action',
    });
  },

  restoreActiveFile: async () => {
    const state = get();
    if (!state.currentProject || state.currentProject.isDemo || !state.activeFile) return;

    const response = await fetch('/api/git', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore', projectPath: state.currentProject.path, filePath: state.activeFile }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Restore failed');

    set((current) => ({
      openFiles: current.openFiles.map((file) => file.path === state.activeFile ? { ...file, content: data.content || '' } : file),
    }));

    state.addLog({
      id: crypto.randomUUID(),
      sessionId: state.activeSessionId,
      timestamp: new Date(),
      type: 'warning',
      message: `Restored ${state.activeFile} from git`,
      source: 'user_action',
    });
  },
});
