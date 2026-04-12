// src/lib/store.ts

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { FileNode, Project, CodeChange, DevelopmentTask, AIMessage } from '@/types';

interface AppState {
  // Current project
  currentProject: Project | null;
  projects: Project[];

  // File management
  openFiles: { path: string; content: string }[];
  activeFile: string | null;

  // Development plan
  tasks: DevelopmentTask[];
  currentTask: DevelopmentTask | null;

  // AI chat
  messages: AIMessage[];
  isGenerating: boolean;

  // UI state
  sidebarOpen: boolean;
  diffViewerOpen: boolean;
  currentDiff: CodeChange | null;

  // Git state
  gitInitialized: boolean;
  commits: any[];

  // Actions
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Partial<Project>) => void;

  openFile: (path: string, content: string) => void;
  closeFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  setActiveFile: (path: string) => void;

  addTask: (task: DevelopmentTask) => void;
  updateTask: (taskId: string, updates: Partial<DevelopmentTask>) => void;
  setCurrentTask: (task: DevelopmentTask | null) => void;

  addMessage: (message: AIMessage) => void;
  setGenerating: (generating: boolean) => void;

  setSidebarOpen: (open: boolean) => void;
  setDiffViewerOpen: (open: boolean) => void;
  setCurrentDiff: (diff: CodeChange | null) => void;

  // Git actions
  setGitInitialized: (initialized: boolean) => void;
  setCommits: (commits: any[]) => void;
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentProject: null,
    projects: [],
    openFiles: [],
    activeFile: null,
    tasks: [],
    currentTask: null,
    messages: [],
    isGenerating: false,
    sidebarOpen: true,
    diffViewerOpen: false,
    currentDiff: null,
    gitInitialized: false,
    commits: [],

    // Project actions
    setCurrentProject: (project) => set({ currentProject: project }),
    addProject: (project) => set((state) => ({
      projects: [...state.projects, project],
      currentProject: project
    })),
    updateProject: (updates) => set((state) => ({
      currentProject: state.currentProject ? { ...state.currentProject, ...updates } : null
    })),

    // File actions
    openFile: (path, content) => set((state) => {
      const existing = state.openFiles.find(f => f.path === path);
      if (existing) {
        return { activeFile: path };
      }
      return {
        openFiles: [...state.openFiles, { path, content }],
        activeFile: path
      };
    }),
    closeFile: (path) => set((state) => ({
      openFiles: state.openFiles.filter(f => f.path !== path),
      activeFile: state.activeFile === path ? state.openFiles.find(f => f.path !== path)?.path || null : state.activeFile
    })),
    updateFileContent: (path, content) => set((state) => ({
      openFiles: state.openFiles.map(f => f.path === path ? { ...f, content } : f)
    })),
    setActiveFile: (path) => set({ activeFile: path }),

    // Task actions
    addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
    updateTask: (taskId, updates) => set((state) => ({
      tasks: state.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
    })),
    setCurrentTask: (task) => set({ currentTask: task }),

    // Message actions
    addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
    setGenerating: (generating) => set({ isGenerating: generating }),

    // UI actions
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    setDiffViewerOpen: (open) => set({ diffViewerOpen: open }),
    setCurrentDiff: (diff) => set({ currentDiff: diff }),

    // Git actions
    setGitInitialized: (initialized) => set({ gitInitialized: initialized }),
    setCommits: (commits) => set({ commits }),
  }))
);