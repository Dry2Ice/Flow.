// src/lib/nvidia-nim.ts

import { DevelopmentTask, CodeChange, PromptRequest } from '@/types';
import { useAppStore } from '@/lib/store';

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

export interface GenerateCodeRequest extends PromptRequest {
  generalPrompt?: string;
  signal?: AbortSignal;
  onChunk?: (text: string) => void;
  conversationHistory?: import('@/types').ConversationTurn[];
}

export interface GenerateCodeResponse {
  code: string;
  explanation: string;
  changes?: CodeChange[];
  tasks?: DevelopmentTask[];
}

// Helper function to determine language from file extension
function getLanguageFromExtension(extension: string): string {
  const languageMap: { [key: string]: string } = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'ps1': 'powershell',
    'dockerfile': 'dockerfile',
    'toml': 'toml',
    'ini': 'ini',
    'cfg': 'ini',
    'conf': 'ini'
  };
  return languageMap[extension] || 'plaintext';
}

// Build intelligent context summary for optimal AI performance
function buildIntelligentContextSummary(context?: any): string {
  if (!context?.projectFiles || context.projectFiles.length === 0) {
    return '## Project Context\nNo project files available for analysis.';
  }

  const files = context.projectFiles;
  const currentFile = context.currentFile;
  const selectedCode = context.selectedCode;

  // Analyze project structure
  const projectAnalysis = analyzeProjectStructure(files);

  // Build context sections
  const sections = [
    '## Intelligent Project Context Analysis',
    '',
    `### 📊 Project Overview`,
    `- Total files: ${files.length}`,
    `- Languages: ${[...projectAnalysis.languages].join(', ')}`,
    `- Primary framework: ${projectAnalysis.primaryFramework || 'Not detected'}`,
    `- Code structure: ${projectAnalysis.structureSummary}`,
    '',
    `### 🎯 Current Focus`,
    currentFile ? `- Active file: ${currentFile}` : '- No active file',
    selectedCode ? `- Selected code: ${selectedCode.substring(0, 100)}${selectedCode.length > 100 ? '...' : ''}` : '- No code selection',
    '',
    `### 🏗️ Key Components`,
    ...projectAnalysis.keyComponents.map((comp: string) => `- ${comp}`),
    '',
    `### 🔗 Dependencies & Relationships`,
    ...projectAnalysis.dependencies.map((dep: string) => `- ${dep}`),
    '',
    `### 📝 Code Patterns`,
    ...projectAnalysis.patterns.map((pattern: string) => `- ${pattern}`),
    '',
    `### ⚠️ Important Notes`,
    ...projectAnalysis.notes.map((note: string) => `- ${note}`),
  ];

  return sections.join('\n');
}

interface ProjectFileForAnalysis {
  path: string;
  content?: string;
  metadata?: {
    extension?: string;
    language?: string;
  };
}

interface ProjectStructureAnalysis {
  languages: Set<string>;
  primaryFramework: string;
  structureSummary: string;
  keyComponents: string[];
  dependencies: string[];
  patterns: string[];
  notes: string[];
}

// Comprehensive project structure analysis
function analyzeProjectStructure(files: ProjectFileForAnalysis[]): ProjectStructureAnalysis {
  const analysis: ProjectStructureAnalysis = {
    languages: new Set<string>(),
    primaryFramework: '',
    structureSummary: '',
    keyComponents: [],
    dependencies: [],
    patterns: [],
    notes: []
  };

  let hasDjango = false;
  let hasExpress = false;

  // Analyze each file
  files.forEach((file) => {
    const extension = file.metadata?.extension || '';
    const language = file.metadata?.language || '';
    const content = file.content || '';
    const fileName = file.path.split('/').pop() || file.path;

    if (language) analysis.languages.add(language);

    if (content.includes('React') || content.includes('react')) {
      analysis.primaryFramework = 'React';
    } else if (content.includes('Vue') || content.includes('vue')) {
      analysis.primaryFramework = 'Vue.js';
    } else if (content.includes('Angular') || (extension === 'ts' && content.includes('@Component'))) {
      analysis.primaryFramework = 'Angular';
    } else if (content.includes('express') || content.includes('app.listen')) {
      analysis.primaryFramework = 'Express.js';
      hasExpress = true;
    } else if (content.includes('django') || content.includes('from django')) {
      analysis.primaryFramework = 'Django';
      hasDjango = true;
    } else if (content.includes('flask')) {
      analysis.primaryFramework = 'Flask';
    }

    if (extension === 'js' || extension === 'ts' || extension === 'tsx') {
      const functions = content.match(/(?:export\s+)?(?:function|const|let|var)\s+(\w+)\s*[=(]/g) || [];
      const classes = content.match(/(?:export\s+)?class\s+(\w+)/g) || [];
      const components = [...functions, ...classes].slice(0, 5);
      if (components.length > 0) {
        analysis.keyComponents.push(`${fileName}: ${components.join(', ')}`);
      }
    }

    if (file.path.includes('package.json')) {
      try {
        const pkg = JSON.parse(content) as { dependencies?: Record<string, string> };
        const deps = Object.keys(pkg.dependencies || {}).slice(0, 5);
        if (deps.length > 0) {
          analysis.dependencies.push(`NPM: ${deps.join(', ')}`);
        }
      } catch {
        // Invalid JSON
      }
    }

    const imports = content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g) || [];
    if (imports.length > 3) {
      analysis.patterns.push(`${fileName}: ${imports.length} imports`);
    }

    if (content.includes('useState') || content.includes('useEffect')) {
      analysis.patterns.push(`${fileName}: React hooks`);
    }
    if (content.includes('async') && content.includes('await')) {
      analysis.patterns.push(`${fileName}: Async/await patterns`);
    }
    if (content.includes('interface') || content.includes('type')) {
      analysis.patterns.push(`${fileName}: TypeScript types`);
    }
  });

  const fileTypes = [...analysis.languages];
  if (fileTypes.includes('javascript') && fileTypes.includes('html')) {
    analysis.structureSummary = 'Frontend web application';
  } else if (fileTypes.includes('python') && hasDjango) {
    analysis.structureSummary = 'Django web application';
  } else if (fileTypes.includes('javascript') && hasExpress) {
    analysis.structureSummary = 'Node.js backend application';
  } else {
    analysis.structureSummary = `${fileTypes.join('/')} codebase`;
  }

  // Important notes
  if (files.length > 20) {
    analysis.notes.push('Large codebase - focus on specific areas for detailed analysis');
  }
  if (analysis.languages.size > 3) {
    analysis.notes.push('Multi-language project - ensure consistent coding standards');
  }
  if (analysis.primaryFramework) {
    analysis.notes.push(`Follow ${analysis.primaryFramework} best practices and conventions`);
  }

  return analysis;
}

// Analyze code structure for better context understanding
function analyzeCodeStructure(content: string, language: string): { summary: string; details?: string } {
  const lines = content.split('\n');
  let summary = '';
  let details = '';

  switch (language) {
    case 'javascript':
    case 'typescript':
      const functions = content.match(/function\s+\w+|const\s+\w+\s*=\s*\(|class\s+\w+|export\s+(const|function|class)/g) || [];
      const imports = content.match(/import\s+.*from\s+['"']|require\s*\(/g) || [];
      const exports = content.match(/export\s+(const|function|class|default)/g) || [];

      summary = `${functions.length} functions/classes, ${imports.length} imports, ${exports.length} exports`;

      if (functions.length > 0) {
        details = `Functions/Classes: ${functions.slice(0, 10).join(', ')}${functions.length > 10 ? '...' : ''}`;
      }
      break;

    case 'python':
      const pyFunctions = content.match(/def\s+\w+\s*\(|class\s+\w+/g) || [];
      const pyImports = content.match(/^(import\s+\w+|from\s+\w+\s+import)/gm) || [];

      summary = `${pyFunctions.length} functions/classes, ${pyImports.length} imports`;

      if (pyFunctions.length > 0) {
        details = `Functions/Classes: ${pyFunctions.slice(0, 10).join(', ')}${pyFunctions.length > 10 ? '...' : ''}`;
      }
      break;

    case 'java':
      const javaClasses = content.match(/class\s+\w+|interface\s+\w+|enum\s+\w+/g) || [];
      const javaMethods = content.match(/(public|private|protected)\s+\w+\s+\w+\s*\(/g) || [];
      const javaImports = content.match(/^import\s+/gm) || [];

      summary = `${javaClasses.length} classes/interfaces, ${javaMethods.length} methods, ${javaImports.length} imports`;
      break;

    case 'html':
      const tags = content.match(/<\/?[a-zA-Z][^>]*>/g) || [];
      const scripts = content.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
      const styles = content.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];

      summary = `${tags.length} HTML tags, ${scripts.length} script blocks, ${styles.length} style blocks`;
      break;

    case 'css':
    case 'scss':
    case 'sass':
      const selectors = content.match(/[.#]?[a-zA-Z][\w-]*\s*\{/g) || [];
      const mediaQueries = content.match(/@media/g) || [];

      summary = `${selectors.length} selectors, ${mediaQueries.length} media queries`;
      break;

    case 'json':
      try {
        const parsed = JSON.parse(content);
        const keys = Object.keys(parsed).length;
        summary = `${keys} top-level keys, JSON valid`;
      } catch {
        summary = 'Invalid JSON';
      }
      break;

    case 'markdown':
      const headers = content.match(/^#{1,6}\s+/gm) || [];
      const links = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
      const codeBlocks = content.match(/```[\s\S]*?```/g) || [];

      summary = `${headers.length} headers, ${links.length} links, ${codeBlocks.length} code blocks`;
      break;

    default:
      summary = `${lines.length} lines of ${language} code`;
  }

  return { summary, details: details || undefined };
}

class NvidiaNimService {
  private config: NvidiaNimConfig | null = null;

  setConfig(config: NvidiaNimConfig) {
    this.config = config;
  }

  getContextTokens(): number {
    return this.config?.contextTokens ?? 0;
  }

  async generateCode(request: GenerateCodeRequest): Promise<GenerateCodeResponse> {
    if (!this.config) {
      throw new Error('Nvidia NIM configuration not set');
    }

    try {
      const { requestBody } = this.buildRequestPayload(request);
      const response = await fetch('/api/nim/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-NIM-Key': this.config.apiKey,
          'X-NIM-BaseUrl': this.config.baseUrl,
        },
        body: JSON.stringify(requestBody),
        signal: request.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('Invalid response format from NIM API');
      }
      return this.parseResponse(content);
    } catch (error) {
      console.error('Nvidia NIM API error:', error);
      throw new Error('Failed to generate code');
    }
  }

  async generateCodeStream(
    request: GenerateCodeRequest,
    onChunk: (text: string) => void,
    signal?: AbortSignal
  ): Promise<GenerateCodeResponse> {
    if (!this.config) throw new Error('Nvidia NIM configuration not set');

    const { requestBody } = this.buildRequestPayload(request);

    // Exponential backoff retry logic
    let delay = 1000;
    let attempt = 0;
    const MAX_RETRY_DELAY = 8000;

    while (true) {
      try {
        attempt++;
        // Log connection attempt
        if (attempt > 1) {
          // Log reconnect event
          const state = useAppStore.getState();
          const activeSessionId = state.activeSessionId;
          state.addLog({
            id: crypto.randomUUID(),
            sessionId: activeSessionId,
            timestamp: new Date(),
            type: 'warning',
            message: `Reconnecting to AI service... (attempt ${attempt})`,
            source: 'ai_execution',
            details: `Waiting ${delay}ms before retry`,
          });

          // Signal reconnecting state
          useAppStore.setState((state: any) => ({
            sessions: {
              ...state.sessions,
              [activeSessionId]: {
                ...state.sessions[activeSessionId],
                connectionStatus: 'reconnecting',
                reconnectDelay: delay,
              },
            },
          }));

          // Wait exponential delay
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * 2, MAX_RETRY_DELAY);
        }

        const response = await fetch('/api/nim/generate?stream=true', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-NIM-Key': this.config.apiKey,
            'X-NIM-BaseUrl': this.config.baseUrl,
          },
          body: JSON.stringify({ ...requestBody, stream: true }),
          signal,
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);
        if (!response.body) throw new Error('No response body');

        // Update connection status to connected
        const state = useAppStore.getState();
        const activeSessionId = state.activeSessionId;
        useAppStore.setState((state: any) => ({
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...state.sessions[activeSessionId],
              connectionStatus: 'connected',
              reconnectDelay: 0,
            },
          },
        }));

        // Log successful connection
        if (attempt > 1) {
          state.addLog({
            id: crypto.randomUUID(),
            sessionId: activeSessionId,
            timestamp: new Date(),
            type: 'success',
            message: `AI service reconnected successfully after ${attempt} attempts`,
            source: 'ai_execution',
          });
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

          for (const line of lines) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content ?? '';
              if (typeof delta === 'string' && delta) {
                fullContent += delta;
                onChunk(delta);
                request.onChunk?.(delta);
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }

        return this.parseResponse(fullContent);
      } catch (error) {
        // Handle aborted requests normally
        if (signal?.aborted) throw error;
        
        // Check if we can retry
        const isRetryable = 
          (error instanceof Error && error.message.includes('API error:')) ||
          (error instanceof Error && error.message.includes('fetch')) ||
          (error instanceof Error && error.message.includes('network'));

        if (!isRetryable || delay >= MAX_RETRY_DELAY) {
          // Update connection status to failed
          const state = useAppStore.getState();
          const activeSessionId = state.activeSessionId;
          useAppStore.setState((state: any) => ({
            sessions: {
              ...state.sessions,
              [activeSessionId]: {
                ...state.sessions[activeSessionId],
                connectionStatus: 'failed',
              },
            },
          }));
          throw error;
        }
      }
    }
  }

  private buildRequestPayload(request: GenerateCodeRequest): { messages: any[]; requestBody: any } {
    if (!this.config) {
      throw new Error('Nvidia NIM configuration not set');
    }
    const config = this.config;

    const baseSystemPrompt = request.preset?.systemPrompt ||
      `You are an expert software engineer. Generate code based on the user's request.
      Provide the code and an explanation. If making changes to existing code, provide the old and new content.
      If this involves multiple steps, suggest development tasks.

      Context: ${JSON.stringify(request.context || {})}

When you need to create or modify files, you MUST output each changed file using this exact format — no exceptions:

<<<FILE: relative/path/to/file.ext>>>
<complete new file content here>
<<<END_FILE>>>

Rules:
- Always output the COMPLETE file content, never partial diffs or snippets.
- Use the file's path relative to the project root (e.g. src/app/page.tsx).
- You may output multiple FILE blocks in a single response.
- After all FILE blocks, write your explanation in plain prose.
- If no file changes are needed, skip the FILE blocks entirely.`;

    const generalPrompt = request.generalPrompt || '';

    // Build intelligent context summary
    const contextSummary = buildIntelligentContextSummary(request.context);

    const fullSystemPrompt = generalPrompt
      ? `${baseSystemPrompt}\n\n${generalPrompt}\n\n${contextSummary}`
      : `${baseSystemPrompt}\n\n${contextSummary}`;
    const history = request.conversationHistory ?? [];

    const isFiniteNumber = (value: unknown): value is number =>
      typeof value === 'number' && Number.isFinite(value);

    const messages = [
      {
        role: 'system',
        content: (() => {
          const projectFiles = request.context?.projectFiles || [];
          if (projectFiles.length === 0) {
            return `${fullSystemPrompt}\n\nProject Context: No project files available`;
          }

          const formattedFiles = projectFiles.map(file => {
            const fileContent = file.content || '';
            const lines = fileContent.split('\n');
            const numberedLines = lines.map((line, index) =>
              `${(index + 1).toString().padStart(4, ' ')}: ${line}`
            ).join('\n');

            const filePath = file.path || '';
            const fileExtension = filePath.split('.').pop()?.toLowerCase() || '';
            const language = getLanguageFromExtension(fileExtension);

            // Analyze code structure for better context
            const structure = analyzeCodeStructure(fileContent, language);

            return `📄 File: ${filePath}
🔤 Language: ${language}
📏 Lines: ${lines.length}
📊 Size: ${fileContent.length} characters
🏗️  Structure: ${structure.summary}

${structure.details ? `📋 Code Structure:\n${structure.details}\n\n` : ''}\`\`\`${language}
${numberedLines}
\`\`\``;
          }).join('\n\n' + '='.repeat(80) + '\n\n');

          return `${fullSystemPrompt}\n\nProject Context - Complete Codebase:\n${formattedFiles}`;
        })()
      },
      ...history.map((turn) => ({ role: turn.role, content: turn.content })),
      {
        role: 'user',
        content: request.prompt
      }
    ];

    const requestBody: any = {
      model: config.model,
      messages,
      temperature: isFiniteNumber(config.temperature)
        ? config.temperature
        : 0.7,
      max_tokens: isFiniteNumber(config.maxTokens) && Number.isInteger(config.maxTokens)
        ? config.maxTokens
        : 4000
    };

    // Add optional parameters if they exist and are valid
    if (isFiniteNumber(config.topP)) {
      requestBody.top_p = config.topP;
    }
    if (isFiniteNumber(config.topK) && Number.isInteger(config.topK)) {
      requestBody.top_k = config.topK;
    }
    if (isFiniteNumber(config.contextTokens) && Number.isInteger(config.contextTokens)) {
      requestBody.context_tokens = config.contextTokens;
    }
    if (isFiniteNumber(config.presencePenalty)) {
      requestBody.presence_penalty = config.presencePenalty;
    }
    if (isFiniteNumber(config.frequencyPenalty)) {
      requestBody.frequency_penalty = config.frequencyPenalty;
    }
    if (Array.isArray(config.stopSequences)) {
      const stopSequences = config.stopSequences
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      if (stopSequences.length > 0) {
        requestBody.stop = stopSequences;
      }
    }

    return { messages, requestBody };
  }

  private parseResponse(content: string): GenerateCodeResponse {
    const fileBlockRegex = /<<<FILE:\s*(.+?)>>>\n([\s\S]*?)<<<END_FILE>>>/g;
    const changes: CodeChange[] = [];
    let match: RegExpExecArray | null;

    while ((match = fileBlockRegex.exec(content)) !== null) {
      const filePath = match[1].trim();
      const newContent = match[2];
      changes.push({
        id: crypto.randomUUID(),
        filePath,
        oldContent: '',
        newContent,
        timestamp: new Date(),
        description: `AI updated ${filePath}`,
      });
    }

    // Strip file blocks from explanation text
    const explanation = content
      .replace(/<<<FILE:[\s\S]*?<<<END_FILE>>>/g, '')
      .trim();

    // Fallback: first fenced code block as bare code string
    const codeMatch = explanation.match(/```[\w]*\n([\s\S]*?)\n```/);
    const code = codeMatch ? codeMatch[1] : explanation;

    return { code, explanation, changes, tasks: [] };
  }
}

export const nvidiaNimService = new NvidiaNimService();
