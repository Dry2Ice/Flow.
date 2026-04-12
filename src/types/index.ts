// src/types/index.ts

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface Project {
  id: string;
  name: string;
  path: string;
  files: FileNode[];
  createdAt: Date;
  updatedAt: Date;
  isDemo?: boolean;
}

export interface CodeChange {
  id: string;
  filePath: string;
  oldContent: string;
  newContent: string;
  timestamp: Date;
  description: string;
}

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
}

export interface DevelopmentTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'partially_completed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  items: TaskItem[];
  autoExecute?: boolean;
  lastChecked?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LogEntry {
  id: string;
  sessionId?: string;
  jobId?: string;
  timestamp: Date;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: string;
  source?: 'ai_execution' | 'program_run' | 'environment_setup' | 'file_operation' | 'user_action';
  relatedTask?: string;
  relatedPlan?: string;
}

export interface ProjectContext {
  id: string;
  sessionId?: string;
  jobId?: string;
  projectId: string;
  summary: string;
  keyComponents: string[];
  dependencies: string[];
  patterns: string[];
  architecture: string;
  lastUpdated: Date;
  version: number;
  fileCount: number;
  totalLines: number;
  languages: string[];
  framework: string;
  complexity: 'low' | 'medium' | 'high' | 'very_high';
  insights: string[];
  recommendations: string[];
  focusAreas?: string[];
  summaryTimeline?: Array<{
    version: number;
    createdAt: Date;
    summary: string;
  }>;
}

export interface AIRequest {
  id: string;
  sessionId: string;
  jobId: string;
  type: 'analysis' | 'implementation' | 'review' | 'optimization' | 'debugging';
  prompt: string;
  context: any;
  status: 'pending' | 'blocked' | 'running' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[]; // IDs of requests this depends on
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  estimatedTokens: number;
  actualTokens?: number;
}

export interface BugReport {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'investigating' | 'fixing' | 'resolved' | 'closed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: 'ai_detected' | 'program_error' | 'user_reported' | 'test_failure';
  relatedFiles: string[];
  relatedTasks: string[];
  createdAt: Date;
  updatedAt: Date;
  lastChecked?: Date;
  resolution?: string;
}

export interface DevelopmentPlan {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'partially_completed' | 'cancelled';
  tasks: DevelopmentTask[];
  autoExecute?: boolean;
  lastChecked?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptPreset {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
}

export interface FileWithMetadata {
  path: string;
  content: string;
  metadata?: {
    extension: string;
    lineCount: number;
    size: number;
    isBinary: boolean;
    hasImports: boolean;
    hasExports: boolean;
    language: string;
    lastModified: string;
  };
}

export interface PromptRequest {
  prompt: string;
  preset?: PromptPreset;
  generalPrompt?: string;
  context?: {
    currentFile?: string;
    selectedCode?: string;
    projectId?: string;
    projectFiles?: FileWithMetadata[];
    projectContext?: ProjectContext;
    sessionId?: string;
    jobId?: string;
  };
}

export interface AIMessage {
  id: string;
  sessionId: string;
  jobId?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  changes?: CodeChange[];
}
