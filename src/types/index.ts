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
  };
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  changes?: CodeChange[];
}