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
}

export interface CodeChange {
  id: string;
  filePath: string;
  oldContent: string;
  newContent: string;
  timestamp: Date;
  description: string;
}

export interface DevelopmentTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptPreset {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
}

export interface PromptRequest {
  prompt: string;
  preset?: PromptPreset;
  context?: {
    currentFile?: string;
    selectedCode?: string;
    projectId?: string;
    projectFiles?: Array<{
      path: string;
      content: string;
    }>;
  };
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  changes?: CodeChange[];
}