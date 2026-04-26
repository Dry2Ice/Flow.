import { Project, CodeChange } from '@/types';
import { ProjectsSlice, StoreGet, StoreSet } from '../types';

const WINDOWS_DRIVE_PATH_PATTERN = /^[a-zA-Z]:[\\/]/;
const isAbsoluteProjectPath = (projectPath: string): boolean => {
  if (!projectPath.trim()) return false;
  return projectPath.startsWith('/') || WINDOWS_DRIVE_PATH_PATTERN.test(projectPath);
};

const createProjectPayload = (name: string, projectPath: string) => {
  const trimmedPath = projectPath.trim();
  const absolutePath = isAbsoluteProjectPath(trimmedPath);

  return {
    name,
    path: trimmedPath,
    ...(absolutePath ? { trustedRoot: trimmedPath, confirmTrustedRoot: true } : {}),
  };
};

const createLoadProjectPayload = (projectPath: string) => {
  const trimmedPath = projectPath.trim();
  const absolutePath = isAbsoluteProjectPath(trimmedPath);

  return {
    path: trimmedPath,
    ...(absolutePath ? { trustedRoot: trimmedPath, confirmTrustedRoot: true } : {}),
  };
};

export const createProjectsSlice = (set: StoreSet, get: StoreGet): ProjectsSlice => ({
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
  sidebarOpen: true,
  diffViewerOpen: false,
  currentDiff: null,
  projectPath: '',
  autoValidateAfterAI: true,
  panelSizes: {
    filesPanel: 17,
    codePanel: 36,
    chatPanel: 19,
    planPanel: 16,
    statsPanel: 12,
    centerVertical: 60,
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
  ultraModeStep: 0,
  ultraModeTotalSteps: 0,
  ultraModeCurrentStep: '',

  setCurrentProject: (project) => set({ currentProject: project }),
  addProject: (project) => set((state) => ({ projects: [...state.projects, project], currentProject: project })),
  updateProject: (updates) => set((state) => ({
    currentProject: state.currentProject ? { ...state.currentProject, ...updates } : null,
  })),
  openFile: (path, content, lastModifiedMs) => set((state) => {
    const existing = state.openFiles.find((f) => f.path === path);
    if (existing) {
      return {
        activeFile: path,
        openFiles: state.openFiles.map((file) =>
          file.path === path ? { ...file, content, lastModifiedMs: lastModifiedMs ?? file.lastModifiedMs } : file),
      };
    }
    return { openFiles: [...state.openFiles, { path, content, lastModifiedMs }], activeFile: path };
  }),
  closeFile: (path) => set((state) => ({
    openFiles: state.openFiles.filter((f) => f.path !== path),
    activeFile: state.activeFile === path ? state.openFiles.find((f) => f.path !== path)?.path || null : state.activeFile,
  })),
  updateFileContent: (path, content) => set((state) => {
    const nextState: any = { openFiles: state.openFiles.map((f) => f.path === path ? { ...f, content } : f) };
    if (state.projectChunks.length > 0) nextState.isIndexStale = true;
    return nextState;
  }),
  setActiveFile: (path) => set({ activeFile: path }),

  addPlan: (plan) => set((state) => ({ plans: [...state.plans, plan] })),
  updatePlan: (planId, updates) => set((state) => ({
    plans: state.plans.map((p) => p.id === planId ? { ...p, ...updates, updatedAt: new Date() } : p),
  })),
  setCurrentPlan: (plan) => set({ currentPlan: plan }),
  deletePlan: (planId) => set((state) => ({
    plans: state.plans.filter((p) => p.id !== planId),
    currentPlan: state.currentPlan?.id === planId ? null : state.currentPlan,
  })),

  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (taskId, updates) => set((state) => ({
    tasks: state.tasks.map((t) => t.id === taskId ? { ...t, ...updates, updatedAt: new Date() } : t),
  })),
  deleteTask: (taskId) => set((state) => ({
    tasks: state.tasks.filter((task) => task.id !== taskId),
    currentTask: state.currentTask?.id === taskId ? null : state.currentTask,
  })),
  setCurrentTask: (task) => set({ currentTask: task }),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setDiffViewerOpen: (open) => set({ diffViewerOpen: open }),
  setCurrentDiff: (diff) => set({ currentDiff: diff }),
  setProjectPath: (path) => set({ projectPath: path }),
  setAutoValidateAfterAI: (enabled) => set({ autoValidateAfterAI: enabled }),

  startUltraMode: (totalSteps: number) => set({ ultraModeActive: true, ultraModeStep: 0, ultraModeTotalSteps: totalSteps, ultraModeCurrentStep: '' }),
  updateUltraModeStep: (step: number, currentStep: string) => set({ ultraModeStep: step, ultraModeCurrentStep: currentStep }),
  endUltraMode: () => set({ ultraModeActive: false, ultraModeStep: 0, ultraModeTotalSteps: 0, ultraModeCurrentStep: '' }),

  setGeneralPrompt: (prompt: string) => set({ generalPrompt: prompt }),

  setPanelSizes: (sizes) => set((state) => ({ panelSizes: { ...state.panelSizes, ...sizes } })),
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  addBug: (bug) => set((state) => ({ bugs: [...state.bugs, bug] })),
  updateBug: (bugId, updates) => set((state) => ({
    bugs: state.bugs.map((b) => b.id === bugId ? { ...b, ...updates, updatedAt: new Date() } : b),
  })),
  deleteBug: (bugId) => set((state) => ({ bugs: state.bugs.filter((b) => b.id !== bugId) })),

  updateProjectContext: (context) => set((state) => ({
    projectContexts: state.projectContexts.filter((c) => c.projectId !== context.projectId).concat(context),
  })),
  getProjectContext: (projectId) => get().projectContexts.find((c) => c.projectId === projectId),

  createProject: async (name: string, path: string) => {
    try {
      const normalizedPath = path.trim();
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createProjectPayload(name, normalizedPath)),
      });
      const data = await response.json();

      if (!data.success) throw new Error(data.error || 'Failed to create project');

      const project: Project = {
        id: crypto.randomUUID(),
        name,
        path: normalizedPath,
        files: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      set((state) => ({ projects: [...state.projects, project], currentProject: project }));
      return project;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  },

  loadProject: async (path: string) => {
    try {
      const normalizedPath = path.trim();
      const response = await fetch('/api/projects/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createLoadProjectPayload(normalizedPath)),
      });
      const data = await response.json();

      if (!data.success) throw new Error(data.error || 'Failed to load project');

      const project: Project = {
        id: crypto.randomUUID(),
        name: normalizedPath.split(/[\\/]/).pop() || 'Project',
        path: normalizedPath,
        files: data.files || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      set((state) => ({ projects: [...state.projects, project], currentProject: project }));
      return project;
    } catch (error) {
      console.error('Failed to load project:', error);
      throw error;
    }
  },

  switchProject: (projectId: string) => set((state) => ({
    currentProject: state.projects.find((p) => p.id === projectId) || null,
  })),

  deleteProject: (projectId: string) => set((state) => ({
    projects: state.projects.filter((p) => p.id !== projectId),
    currentProject: state.currentProject?.id === projectId ? null : state.currentProject,
  })),
});
