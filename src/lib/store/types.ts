import { FileNode, Project, CodeChange, DevelopmentTask, DevelopmentPlan, LogEntry, BugReport, ProjectContext, AIRequest, AIMessage, PromptPreset } from '@/types';
import { CodeChunk, EmbeddingConfig } from '@/lib/embedding-service';

export interface SessionState {
  messages: AIMessage[];
  isGenerating: boolean;
  activeRequests: number;
  connectionStatus?: 'connected' | 'reconnecting' | 'failed';
  reconnectDelay?: number;
}

export interface OpenFile {
  path: string;
  content: string;
  lastModifiedMs?: number;
}

export type AppState = SessionsSlice
  & ProjectsSlice
  & AIQueueSlice
  & GitSlice
  & SettingsSlice
  & EmbeddingSlice;

export interface SessionsSlice {
  sessions: Record<string, SessionState>;
  activeSessionId: string;
  addMessage: (sessionId: string, message: AIMessage) => void;
  setGenerating: (sessionId: string, generating: boolean) => void;
  incrementSessionRequests: (sessionId: string) => void;
  decrementSessionRequests: (sessionId: string) => void;
  setActiveSession: (sessionId: string) => void;
  createSession: (sessionId?: string) => string;
  clearSession: (sessionId: string) => void;
  getSessionState: (sessionId: string) => SessionState;
}

export interface ProjectsSlice {
  currentProject: Project | null;
  projects: Project[];
  openFiles: OpenFile[];
  activeFile: string | null;
  plans: DevelopmentPlan[];
  currentPlan: DevelopmentPlan | null;
  tasks: DevelopmentTask[];
  currentTask: DevelopmentTask | null;
  logs: LogEntry[];
  bugs: BugReport[];
  projectContexts: ProjectContext[];
  sidebarOpen: boolean;
  diffViewerOpen: boolean;
  currentDiff: CodeChange | null;
  projectPath: string;
  autoValidateAfterAI: boolean;
  panelSizes: {
    filesPanel: number;
    codePanel: number;
    chatPanel: number;
    planPanel: number;
    statsPanel: number;
    centerVertical: number;
  };
  generalPrompt: string;
  ultraModeStep: number;
  ultraModeTotalSteps: number;
  ultraModeCurrentStep: string;

  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Partial<Project>) => void;
  openFile: (path: string, content: string, lastModifiedMs?: number) => void;
  closeFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  setActiveFile: (path: string) => void;
  addPlan: (plan: DevelopmentPlan) => void;
  updatePlan: (planId: string, updates: Partial<DevelopmentPlan>) => void;
  setCurrentPlan: (plan: DevelopmentPlan | null) => void;
  deletePlan: (planId: string) => void;
  addTask: (task: DevelopmentTask) => void;
  updateTask: (taskId: string, updates: Partial<DevelopmentTask>) => void;
  deleteTask: (taskId: string) => void;
  setCurrentTask: (task: DevelopmentTask | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setDiffViewerOpen: (open: boolean) => void;
  setCurrentDiff: (diff: CodeChange | null) => void;
  setProjectPath: (path: string) => void;
  setAutoValidateAfterAI: (enabled: boolean) => void;
  startUltraMode: (totalSteps: number) => void;
  updateUltraModeStep: (step: number, currentStep: string) => void;
  endUltraMode: () => void;
  setGeneralPrompt: (prompt: string) => void;
  setPanelSizes: (sizes: Partial<ProjectsSlice['panelSizes']>) => void;
  addLog: (log: LogEntry) => void;
  addBug: (bug: BugReport) => void;
  updateBug: (bugId: string, updates: Partial<BugReport>) => void;
  deleteBug: (bugId: string) => void;
  updateProjectContext: (context: ProjectContext) => void;
  getProjectContext: (projectId: string) => ProjectContext | undefined;
  createProject: (name: string, path: string) => Promise<Project>;
  loadProject: (path: string) => Promise<Project>;
  switchProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
}

export interface AIQueueSlice {
  aiRequests: AIRequest[];
  maxConcurrentRequests: number;
  addAIRequest: (request: AIRequest) => void;
  updateAIRequest: (requestId: string, updates: Partial<AIRequest>) => void;
  removeAIRequest: (requestId: string) => void;
  getAIRequestByJobId: (jobId: string) => AIRequest | undefined;
  getPendingRequests: () => AIRequest[];
  getRunningRequests: () => AIRequest[];
}

export interface GitSlice {
  pendingChanges: CodeChange[];
  gitInitialized: boolean;
  commits: any[];
  autoCommitAfterAI: boolean;
  setPendingChanges: (changes: CodeChange[]) => void;
  clearPendingChanges: () => void;
  applyPendingChange: (changeId: string) => void;
  setGitInitialized: (initialized: boolean) => void;
  setCommits: (commits: any[]) => void;
  initializeGitRepo: () => Promise<void>;
  saveActiveFile: () => Promise<void>;
  loadCommitHistory: (limit?: number) => Promise<void>;
  rollbackToCommit: (commitHash: string) => Promise<void>;
  restoreActiveFile: () => Promise<void>;
  setAutoCommitAfterAI: (enabled: boolean) => void;
}

export interface SettingsSlice {
  promptPresets: PromptPreset[];
  activePreset: PromptPreset | null;
  embeddingConfig: EmbeddingConfig | null;
  ultraModeActive: boolean;
  setActivePreset: (preset: PromptPreset | null) => void;
  updatePromptPreset: (presetId: string, patch: Partial<Omit<PromptPreset, 'id'>>) => void;
  setEmbeddingConfig: (config: EmbeddingConfig | null) => void;
}

export interface EmbeddingSlice {
  projectChunks: CodeChunk[];
  isIndexingProject: boolean;
  indexedAt: Date | null;
  isIndexStale: boolean;
  setIndexStale: (stale: boolean) => void;
  indexProjectForEmbedding: () => Promise<void>;
}

export type StoreSet = (partial: Partial<AppState> | ((state: AppState) => Partial<AppState> | AppState)) => void;
export type StoreGet = () => AppState;

export type { FileNode };
