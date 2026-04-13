// src/lib/store.ts

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { FileNode, Project, CodeChange, DevelopmentTask, DevelopmentPlan, LogEntry, BugReport, ProjectContext, AIRequest, AIMessage, PromptPreset } from '@/types';

export interface SessionState {
  messages: AIMessage[];
  isGenerating: boolean;
  activeRequests: number;
}

export interface OpenFile {
  path: string;
  content: string;
  lastModifiedMs?: number;
}

const DEFAULT_SESSION_ID = 'default';

const PROMPT_PRESETS_STORAGE_KEY = 'flow-prompt-presets';
const ACTIVE_PRESET_STORAGE_KEY = 'flow-active-preset-id';

const DEFAULT_PROMPT_PRESETS: PromptPreset[] = [
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
];

const isClient = typeof window !== 'undefined';

const loadPromptPresets = (): PromptPreset[] => {
  if (!isClient) return DEFAULT_PROMPT_PRESETS;

  const saved = localStorage.getItem(PROMPT_PRESETS_STORAGE_KEY);
  if (!saved) return DEFAULT_PROMPT_PRESETS;

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return DEFAULT_PROMPT_PRESETS;

    return parsed.filter((preset): preset is PromptPreset => {
      return (
        typeof preset?.id === 'string'
        && typeof preset?.name === 'string'
        && typeof preset?.description === 'string'
        && typeof preset?.systemPrompt === 'string'
      );
    });
  } catch (error) {
    console.error('Failed to parse saved prompt presets:', error);
    return DEFAULT_PROMPT_PRESETS;
  }
};

const savePromptPresets = (promptPresets: PromptPreset[]) => {
  if (!isClient) return;
  localStorage.setItem(PROMPT_PRESETS_STORAGE_KEY, JSON.stringify(promptPresets));
};

const loadActivePresetId = (): string | null => {
  if (!isClient) return null;
  return localStorage.getItem(ACTIVE_PRESET_STORAGE_KEY);
};

const saveActivePresetId = (presetId: string | null) => {
  if (!isClient) return;

  if (presetId) {
    localStorage.setItem(ACTIVE_PRESET_STORAGE_KEY, presetId);
    return;
  }

  localStorage.removeItem(ACTIVE_PRESET_STORAGE_KEY);
};

const initialPromptPresets = loadPromptPresets();
const initialActivePresetId = loadActivePresetId();
const initialActivePreset = initialPromptPresets.find((preset) => preset.id === initialActivePresetId) ?? null;

interface AppState {
  // Current project
  currentProject: Project | null;
  projects: Project[];

  // File management
  openFiles: OpenFile[];
  activeFile: string | null;

  // Development plan
  plans: DevelopmentPlan[];
  currentPlan: DevelopmentPlan | null;
  tasks: DevelopmentTask[];
  currentTask: DevelopmentTask | null;

  // Logging and error tracking
  logs: LogEntry[];
  bugs: BugReport[];

  // Project context and AI requests
  projectContexts: ProjectContext[];
  aiRequests: AIRequest[];
  maxConcurrentRequests: number;

  // AI chat
  sessions: Record<string, SessionState>;
  activeSessionId: string;

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

  // Ultra mode
  ultraModeActive: boolean;
  ultraModeStep: number;
  ultraModeTotalSteps: number;
  ultraModeCurrentStep: string;

  // General prompt
  generalPrompt: string;

  // Workspace layout
  panelSizes: {
    filesPanel: number;
    codePanel: number;
    chatPanel: number;
    planPanel: number;
    statsPanel: number;
    centerVertical: number;
  };

  // Actions
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Partial<Project>) => void;

  openFile: (path: string, content: string, lastModifiedMs?: number) => void;
  closeFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  setActiveFile: (path: string) => void;

  // Plans
  addPlan: (plan: DevelopmentPlan) => void;
  updatePlan: (planId: string, updates: Partial<DevelopmentPlan>) => void;
  setCurrentPlan: (plan: DevelopmentPlan | null) => void;
  deletePlan: (planId: string) => void;

  // Tasks
  addTask: (task: DevelopmentTask) => void;
  updateTask: (taskId: string, updates: Partial<DevelopmentTask>) => void;
  setCurrentTask: (task: DevelopmentTask | null) => void;

  addMessage: (sessionId: string, message: AIMessage) => void;
  setGenerating: (sessionId: string, generating: boolean) => void;
  incrementSessionRequests: (sessionId: string) => void;
  decrementSessionRequests: (sessionId: string) => void;
  setActiveSession: (sessionId: string) => void;
  createSession: (sessionId?: string) => string;
  getSessionState: (sessionId: string) => SessionState;

  setSidebarOpen: (open: boolean) => void;
  setDiffViewerOpen: (open: boolean) => void;
  setCurrentDiff: (diff: CodeChange | null) => void;

  // Git actions
  setGitInitialized: (initialized: boolean) => void;
  setCommits: (commits: any[]) => void;
  initializeGitRepo: () => Promise<void>;
  saveActiveFile: () => Promise<void>;
  loadCommitHistory: (limit?: number) => Promise<void>;
  rollbackToCommit: (commitHash: string) => Promise<void>;
  restoreActiveFile: () => Promise<void>;

  // Prompt preset actions
  setActivePreset: (preset: PromptPreset | null) => void;
  updatePromptPreset: (presetId: string, patch: Partial<Omit<PromptPreset, 'id'>>) => void;

  // Project actions
  setProjectPath: (path: string) => void;
  createProject: (name: string, path: string) => Promise<Project>;
  loadProject: (path: string) => Promise<Project>;
  switchProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;

  // Ultra mode actions
  startUltraMode: (totalSteps: number) => void;
  updateUltraModeStep: (step: number, currentStep: string) => void;
  endUltraMode: () => void;

  // General prompt actions
  setGeneralPrompt: (prompt: string) => void;

  // Workspace actions
  setPanelSizes: (sizes: Partial<AppState['panelSizes']>) => void;

  // Logging and bug tracking
  addLog: (log: LogEntry) => void;
  addBug: (bug: BugReport) => void;
  updateBug: (bugId: string, updates: Partial<BugReport>) => void;
  deleteBug: (bugId: string) => void;

  // Project context management
  updateProjectContext: (context: ProjectContext) => void;
  getProjectContext: (projectId: string) => ProjectContext | undefined;

  // AI request management
  addAIRequest: (request: AIRequest) => void;
  updateAIRequest: (requestId: string, updates: Partial<AIRequest>) => void;
  removeAIRequest: (requestId: string) => void;
  getAIRequestByJobId: (jobId: string) => AIRequest | undefined;
  getPendingRequests: () => AIRequest[];
  getRunningRequests: () => AIRequest[];
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentProject: null,
    projects: [],
    openFiles: [],
    activeFile: null,
    plans: [],
    currentPlan: null,
    tasks: [],
    currentTask: null,
    logs: [],
    bugs: [],
    projectContexts: [],
    aiRequests: [],
    maxConcurrentRequests: 3,
    sessions: {
      [DEFAULT_SESSION_ID]: {
        messages: [],
        isGenerating: false,
        activeRequests: 0
      }
    },
    activeSessionId: DEFAULT_SESSION_ID,
    sidebarOpen: true,
    diffViewerOpen: false,
    currentDiff: null,
    gitInitialized: false,
    commits: [],
    promptPresets: initialPromptPresets,
    activePreset: initialActivePreset,
    projectPath: '',
    ultraModeActive: false,
    ultraModeStep: 0,
    ultraModeTotalSteps: 0,
    ultraModeCurrentStep: '',
    panelSizes: {
      filesPanel: 17, // percentage - Files/Projects panel
      codePanel: 36, // percentage - Code+Preview panel
      chatPanel: 19, // percentage - Chat/Logs panel
      planPanel: 16, // percentage - Plan/Bugs panel
      statsPanel: 12, // percentage - Statistics panel
      centerVertical: 60, // percentage of code panel for code editor
    },
    generalPrompt: `## Core Development Principles & Code Analysis Guidelines

**Code Quality & Best Practices:**
- Write clean, readable, and maintainable code following established patterns
- Use meaningful variable and function names that clearly express intent
- Follow language-specific conventions and style guides
- Implement proper error handling and input validation
- Add comments for complex logic, not obvious code

**Security First:**
- Never introduce security vulnerabilities (XSS, SQL injection, etc.)
- Validate all inputs and sanitize outputs
- Use secure coding practices and avoid dangerous functions
- Implement proper authentication and authorization when needed

**Performance & Efficiency:**
- Write efficient algorithms and data structures
- Avoid unnecessary computations and memory usage
- Consider scalability and performance implications
- Use appropriate libraries and frameworks

**Type Safety & Reliability:**
- Ensure type safety in statically typed languages
- Handle edge cases and error conditions
- Write testable code with clear interfaces
- Follow SOLID principles and design patterns

**Code Reference Guidelines:**
- When referencing specific code locations, use the exact format: \`file_path:line_number\` (e.g., \`src/app/page.tsx:42\`)
- Reference line numbers from the numbered code blocks provided in context
- Be precise about which files and lines you're referring to
- When suggesting changes, provide the exact line numbers and surrounding context

**Project Structure Awareness:**
- Analyze the provided codebase structure and understand relationships between files
- Consider imports, exports, and dependencies between modules
- Maintain consistency with existing architectural patterns
- Respect the project's file organization and naming conventions

**Context-Aware Analysis:**
- Use the provided code structure information to understand the codebase better
- Consider the language-specific features and best practices
- Analyze the relationships between different parts of the codebase
- Understand the project's technology stack and framework usage

**Documentation & Communication:**
- Provide clear explanations of changes and reasoning
- Document important functions and complex logic
- Explain trade-offs and alternative approaches considered
- Use clear, professional language in all communications

**Response Format:**
- Be specific and actionable in recommendations
- Provide concrete code examples when suggesting changes
- Explain the reasoning behind each suggestion
- Reference specific files and line numbers when possible
- Prioritize solutions by importance and impact
- Structure responses clearly with sections when appropriate`,

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
    openFile: (path, content, lastModifiedMs) => set((state) => {
      const existing = state.openFiles.find(f => f.path === path);
      if (existing) {
        return {
          activeFile: path,
          openFiles: state.openFiles.map(file =>
            file.path === path
              ? {
                  ...file,
                  content,
                  lastModifiedMs: lastModifiedMs ?? file.lastModifiedMs,
                }
              : file
          ),
        };
      }
      return {
        openFiles: [...state.openFiles, { path, content, lastModifiedMs }],
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

    // Plan actions
    addPlan: (plan) => set((state) => ({ plans: [...state.plans, plan] })),
    updatePlan: (planId, updates) => set((state) => ({
      plans: state.plans.map(p => p.id === planId ? { ...p, ...updates, updatedAt: new Date() } : p)
    })),
    setCurrentPlan: (plan) => set({ currentPlan: plan }),
    deletePlan: (planId) => set((state) => ({
      plans: state.plans.filter(p => p.id !== planId),
      currentPlan: state.currentPlan?.id === planId ? null : state.currentPlan
    })),

    // Task actions
    addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
    updateTask: (taskId, updates) => set((state) => ({
      tasks: state.tasks.map(t => t.id === taskId ? { ...t, ...updates, updatedAt: new Date() } : t)
    })),
    setCurrentTask: (task) => set({ currentTask: task }),

    addMessage: (sessionId, message) => set((state) => {
      const session = state.sessions[sessionId] ?? { messages: [], isGenerating: false, activeRequests: 0 };
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            messages: [...session.messages, message]
          }
        }
      };
    }),
    setGenerating: (sessionId, generating) => set((state) => {
      const session = state.sessions[sessionId] ?? { messages: [], isGenerating: false, activeRequests: 0 };
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            isGenerating: generating,
            activeRequests: generating ? Math.max(1, session.activeRequests) : 0
          }
        }
      };
    }),
    incrementSessionRequests: (sessionId) => set((state) => {
      const session = state.sessions[sessionId] ?? { messages: [], isGenerating: false, activeRequests: 0 };
      const activeRequests = session.activeRequests + 1;
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            activeRequests,
            isGenerating: activeRequests > 0
          }
        }
      };
    }),
    decrementSessionRequests: (sessionId) => set((state) => {
      const session = state.sessions[sessionId] ?? { messages: [], isGenerating: false, activeRequests: 0 };
      const activeRequests = Math.max(0, session.activeRequests - 1);
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            activeRequests,
            isGenerating: activeRequests > 0
          }
        }
      };
    }),
    setActiveSession: (sessionId) => set((state) => {
      if (state.sessions[sessionId]) {
        return { activeSessionId: sessionId };
      }

      return {
        activeSessionId: sessionId,
        sessions: {
          ...state.sessions,
          [sessionId]: { messages: [], isGenerating: false, activeRequests: 0 }
        }
      };
    }),
    createSession: (sessionId = crypto.randomUUID()) => {
      set((state) => ({
        sessions: state.sessions[sessionId]
          ? state.sessions
          : {
              ...state.sessions,
              [sessionId]: { messages: [], isGenerating: false, activeRequests: 0 }
            },
        activeSessionId: sessionId
      }));
      return sessionId;
    },
    getSessionState: (sessionId) => {
      const state = get();
      return state.sessions[sessionId] ?? { messages: [], isGenerating: false, activeRequests: 0 };
    },

    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    setDiffViewerOpen: (open) => set({ diffViewerOpen: open }),
    setCurrentDiff: (diff) => set({ currentDiff: diff }),

    // Ultra mode actions
    startUltraMode: (totalSteps: number) => set({
      ultraModeActive: true,
      ultraModeStep: 0,
      ultraModeTotalSteps: totalSteps,
      ultraModeCurrentStep: ''
    }),
    updateUltraModeStep: (step: number, currentStep: string) => set({
      ultraModeStep: step,
      ultraModeCurrentStep: currentStep
    }),
    endUltraMode: () => set({
      ultraModeActive: false,
      ultraModeStep: 0,
      ultraModeTotalSteps: 0,
      ultraModeCurrentStep: ''
    }),

    // General prompt actions
    setGeneralPrompt: (prompt: string) => set({ generalPrompt: prompt }),

    setGitInitialized: (initialized) => set({ gitInitialized: initialized }),
    setCommits: (commits) => set({ commits }),
    initializeGitRepo: async () => {
      const state = get();
      if (!state.currentProject || state.currentProject.isDemo) return;

      const response = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'init',
          projectPath: state.currentProject.path,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize repository');
      }

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

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save changes');
      }

      if (data.skipped) {
        state.addLog({
          id: crypto.randomUUID(),
          sessionId: state.activeSessionId,
          timestamp: new Date(),
          type: 'info',
          message: `No changes to save for ${active.path}`,
          source: 'file_operation',
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
        body: JSON.stringify({
          action: 'history',
          projectPath: state.currentProject.path,
          limit,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load git history');
      }

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
        body: JSON.stringify({
          action: 'rollback',
          projectPath: state.currentProject.path,
          commitHash,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Rollback failed');
      }

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
        body: JSON.stringify({
          action: 'restore',
          projectPath: state.currentProject.path,
          filePath: state.activeFile,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Restore failed');
      }

      set((current) => ({
        openFiles: current.openFiles.map((file) =>
          file.path === state.activeFile ? { ...file, content: data.content || '' } : file
        ),
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
    setActivePreset: (preset) => set({ activePreset: preset }),
    updatePromptPreset: (presetId, patch) => {
      set((state) => {
        const nextPromptPresets = state.promptPresets.map((preset) =>
          preset.id === presetId ? { ...preset, ...patch } : preset
        );
        const nextActivePreset =
          state.activePreset?.id === presetId
            ? nextPromptPresets.find((preset) => preset.id === presetId) ?? state.activePreset
            : state.activePreset;

        return {
          promptPresets: nextPromptPresets,
          activePreset: nextActivePreset,
        };
      });
    },
    setProjectPath: (path: string) => set({ projectPath: path }),
    createProject: async (name: string, path: string) => {
      try {
        const response = await fetch('/api/projects/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, path }),
        });
        const data = await response.json();

        if (data.success) {
          const project: Project = {
            id: crypto.randomUUID(),
            name,
            path,
            files: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          set((state) => ({
            projects: [...state.projects, project],
            currentProject: project
          }));
          return project;
        } else {
          throw new Error(data.error || 'Failed to create project');
        }
      } catch (error) {
        console.error('Failed to create project:', error);
        throw error;
      }
    },
    loadProject: async (path: string) => {
      try {
        const response = await fetch('/api/projects/load', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        });
        const data = await response.json();

        if (data.success) {
          const project: Project = {
            id: crypto.randomUUID(),
            name: path.split('/').pop() || 'Project',
            path,
            files: data.files || [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          set((state) => ({
            projects: [...state.projects, project],
            currentProject: project
          }));
          return project;
        } else {
          throw new Error(data.error || 'Failed to load project');
        }
      } catch (error) {
        console.error('Failed to load project:', error);
        throw error;
      }
    },
    switchProject: (projectId: string) => set((state) => {
      const project = state.projects.find(p => p.id === projectId);
      return { currentProject: project || null };
    }),
    deleteProject: (projectId: string) => set((state) => ({
      projects: state.projects.filter(p => p.id !== projectId),
      currentProject: state.currentProject?.id === projectId ? null : state.currentProject
    })),

    // Workspace actions
    setPanelSizes: (sizes) => set((state) => ({
      panelSizes: { ...state.panelSizes, ...sizes }
    })),

    // Logging and bug tracking
    addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
    addBug: (bug) => set((state) => ({ bugs: [...state.bugs, bug] })),
    updateBug: (bugId, updates) => set((state) => ({
      bugs: state.bugs.map(b => b.id === bugId ? { ...b, ...updates, updatedAt: new Date() } : b)
    })),
    deleteBug: (bugId) => set((state) => ({
      bugs: state.bugs.filter(b => b.id !== bugId)
    })),

    // Project context management
    updateProjectContext: (context) => set((state) => ({
      projectContexts: state.projectContexts
        .filter(c => c.projectId !== context.projectId)
        .concat(context)
    })),
    getProjectContext: (projectId) => {
      const state = get();
      return state.projectContexts.find(c => c.projectId === projectId);
    },

    // AI request management
    addAIRequest: (request) => set((state) => ({
      aiRequests: [...state.aiRequests, request]
    })),
    updateAIRequest: (requestId, updates) => set((state) => ({
      aiRequests: state.aiRequests.map(r =>
        r.id === requestId ? { ...r, ...updates } : r
      )
    })),
    removeAIRequest: (requestId) => set((state) => ({
      aiRequests: state.aiRequests.filter(r => r.id !== requestId)
    })),
    getAIRequestByJobId: (jobId) => {
      const state = get();
      return state.aiRequests.find(r => r.jobId === jobId);
    },
    getPendingRequests: () => {
      const state = get();
      return state.aiRequests.filter(r => r.status === 'pending');
    },
    getRunningRequests: () => {
      const state = get();
      return state.aiRequests.filter(r => r.status === 'running');
    },
  }))
);

if (isClient) {
  useAppStore.subscribe(
    (state) => state.promptPresets,
    (promptPresets) => {
      savePromptPresets(promptPresets);
    }
  );

  useAppStore.subscribe(
    (state) => state.activePreset?.id ?? null,
    (activePresetId) => {
      saveActivePresetId(activePresetId);
    }
  );
}
