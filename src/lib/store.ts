// src/lib/store.ts

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { FileNode, Project, CodeChange, DevelopmentTask, DevelopmentPlan, AIMessage, PromptPreset } from '@/types';
import fs from 'fs';
import path from 'path';

interface AppState {
  // Current project
  currentProject: Project | null;
  projects: Project[];

  // File management
  openFiles: { path: string; content: string }[];
  activeFile: string | null;

  // Development plan
  plans: DevelopmentPlan[];
  currentPlan: DevelopmentPlan | null;
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

  // Ultra mode
  ultraModeActive: boolean;
  ultraModeStep: number;
  ultraModeTotalSteps: number;
  ultraModeCurrentStep: string;

  // General prompt
  generalPrompt: string;

  // Workspace layout
  panelSizes: {
    sidebar: number;
    centerVertical: number;
    rightVertical: number;
    rightPanel: number;
  };

  // Actions
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Partial<Project>) => void;

  openFile: (path: string, content: string) => void;
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
    ultraModeActive: false,
    ultraModeStep: 0,
    ultraModeTotalSteps: 0,
    ultraModeCurrentStep: '',
    panelSizes: {
      sidebar: 20, // percentage
      centerVertical: 60, // percentage of center area (code vs preview)
      rightVertical: 50, // percentage of right area (plan vs chat)
      rightPanel: 25, // percentage of total width
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

    addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
    setGenerating: (generating) => set({ isGenerating: generating }),

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
    setActivePreset: (preset) => set({ activePreset: preset }),
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
  }))
);