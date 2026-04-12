// src/lib/store.ts

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { FileNode, Project, CodeChange, DevelopmentTask, AIMessage, PromptPreset } from '@/types';

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

  // Prompt presets
  activePreset: PromptPreset | null;
  promptPresets: PromptPreset[];

  // Project settings
  projectPath: string;

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

  // Prompt preset actions
  setActivePreset: (preset: PromptPreset | null) => void;

  // Project actions
  setProjectPath: (path: string) => void;
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
    activePreset: null,
    promptPresets: [
      {
        id: 'debug',
        name: 'Bug Detection & Fixing',
        description: 'Search for bugs, analyze code issues, and suggest fixes',
        systemPrompt: `You are an expert software engineer specializing in debugging and code quality. Your task is to:

1. Analyze the provided code and project files for potential bugs, security issues, and code quality problems
2. Identify specific problems with line numbers and explanations
3. Suggest concrete fixes with code examples
4. Explain the reasoning behind each suggested change
5. Prioritize critical issues that could cause runtime errors or security vulnerabilities

When analyzing the project, consider:
- Logic errors and edge cases
- Type safety issues
- Performance bottlenecks
- Security vulnerabilities
- Code maintainability
- Best practices compliance

Provide actionable recommendations that can be implemented immediately.`
      },
      {
        id: 'analyze',
        name: 'Code Analysis & Planning',
        description: 'Analyze codebase and create improvement plans',
        systemPrompt: `You are a senior software architect specializing in code analysis and strategic planning. Your task is to:

1. Thoroughly analyze the entire codebase structure, patterns, and architecture
2. Identify areas for improvement, refactoring opportunities, and modernization needs
3. Create detailed development plans with prioritized tasks
4. Suggest architectural improvements and design patterns
5. Provide technical debt assessment and recommendations
6. Outline implementation strategies with clear milestones

Consider:
- Code organization and modularity
- Design patterns and architectural decisions
- Technology stack appropriateness
- Scalability and maintainability
- Testing coverage and quality assurance
- Documentation and developer experience

Generate a comprehensive improvement roadmap with measurable goals and success criteria.`
      },
      {
        id: 'develop',
        name: 'Active Development',
        description: 'Implement features, make changes, and enhance functionality',
        systemPrompt: `You are a skilled software developer ready to implement features and make code changes. Your task is to:

1. Understand the user's requirements and current codebase context
2. Implement requested features with clean, maintainable code
3. Follow existing code patterns and conventions
4. Ensure type safety and error handling
5. Provide complete, working solutions that integrate well with existing code
6. Create appropriate tests when needed
7. Update documentation if necessary

When making changes:
- Preserve existing functionality
- Follow the established architecture and patterns
- Write self-documenting code with clear variable names
- Handle edge cases and error conditions
- Optimize for performance where appropriate
- Ensure compatibility with existing dependencies

Deliver production-ready code that solves the user's problem effectively.`
      }
    ],
    projectPath: '',

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

    // Prompt preset actions
    setActivePreset: (preset) => set({ activePreset: preset }),

    // Project actions
    setProjectPath: (path: string) => set({ projectPath: path }),
  }))
);