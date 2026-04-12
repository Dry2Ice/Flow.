// src/lib/nvidia-nim.ts

import axios from 'axios';
import { DevelopmentTask, CodeChange, PromptRequest } from '@/types';

export interface NvidiaNimConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  contextTokens?: number;
  maxTokens?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stopSequences?: string[];
}

export interface GenerateCodeRequest extends PromptRequest {}

export interface GenerateCodeResponse {
  code: string;
  explanation: string;
  changes?: CodeChange[];
  tasks?: DevelopmentTask[];
}

class NvidiaNimService {
  private config: NvidiaNimConfig | null = null;

  setConfig(config: NvidiaNimConfig) {
    this.config = config;
  }

  async generateCode(request: GenerateCodeRequest): Promise<GenerateCodeResponse> {
    if (!this.config) {
      throw new Error('Nvidia NIM configuration not set');
    }

    try {
      const systemPrompt = request.preset?.systemPrompt ||
        `You are an expert software engineer. Generate code based on the user's request.
        Provide the code and an explanation. If making changes to existing code, provide the old and new content.
        If this involves multiple steps, suggest development tasks.

        Context: ${JSON.stringify(request.context || {})}`;

      const requestBody: any = {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: (() => {
              const basePrompt = systemPrompt;
              const projectFiles = request.context?.projectFiles || [];

              // Limit context based on contextTokens setting
              const contextLimit = this.config.contextTokens || 0; // 0 = unlimited
              let contextContent = '';

              if (projectFiles.length > 0) {
                if (contextLimit === 0) {
                  // Unlimited context
                  contextContent = projectFiles.map(f => `File: ${f.path}\n${f.content}`).join('\n\n---\n\n');
                } else {
                  // Limited context - prioritize current file and recent files
                  const currentFile = projectFiles.find(f => f.path === request.context?.currentFile);
                  const otherFiles = projectFiles.filter(f => f.path !== request.context?.currentFile);

                  let selectedFiles = [];
                  let totalTokens = 0;

                  // Always include current file first
                  if (currentFile) {
                    selectedFiles.push(currentFile);
                    totalTokens += Math.ceil(currentFile.content.length / 4); // Rough token estimation
                  }

                  // Add other files until limit
                  for (const file of otherFiles) {
                    const fileTokens = Math.ceil(file.content.length / 4);
                    if (totalTokens + fileTokens <= contextLimit) {
                      selectedFiles.push(file);
                      totalTokens += fileTokens;
                    } else {
                      break;
                    }
                  }

                  contextContent = selectedFiles.map(f => `File: ${f.path}\n${f.content}`).join('\n\n---\n\n');
                }
              }

              return `${basePrompt}\n\nProject Context:\n${contextContent || 'No project files available'}`;
            })()
          },
          {
            role: 'user',
            content: request.prompt
          }
        ],
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens ?? 4000
      };

      // Add optional parameters if they exist
      if (this.config.topP !== undefined) requestBody.top_p = this.config.topP;
      if (this.config.topK !== undefined) requestBody.top_k = this.config.topK;
      if (this.config.presencePenalty !== undefined) requestBody.presence_penalty = this.config.presencePenalty;
      if (this.config.frequencyPenalty !== undefined) requestBody.frequency_penalty = this.config.frequencyPenalty;
      if (this.config.stopSequences && this.config.stopSequences.length > 0) {
        requestBody.stop = this.config.stopSequences;
      }

      const response = await axios.post(
        `${this.config.baseUrl}/chat/completions`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0].message.content;

      // Parse the response - this is a simplified parsing
      // In a real implementation, you might want to use structured outputs
      return this.parseResponse(content);
    } catch (error) {
      console.error('Nvidia NIM API error:', error);
      throw new Error('Failed to generate code');
    }
  }

  private parseResponse(content: string): GenerateCodeResponse {
    // Simple parsing - in practice, you'd want better structured output
    const codeMatch = content.match(/```[\w]*\n([\s\S]*?)\n```/);
    const code = codeMatch ? codeMatch[1] : content;

    const explanation = content.replace(/```[\w]*\n[\s\S]*?\n```/g, '').trim();

    // Generate mock changes and tasks for demo
    const changes: CodeChange[] = [];
    const tasks: DevelopmentTask[] = [];

    return {
      code,
      explanation,
      changes,
      tasks
    };
  }
}

export const nvidiaNimService = new NvidiaNimService();