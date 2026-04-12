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

export interface GenerateCodeRequest extends PromptRequest {
  generalPrompt?: string;
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
    `- Languages: ${projectAnalysis.languages.join(', ')}`,
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

// Comprehensive project structure analysis
function analyzeProjectStructure(files: any[]): any {
  const analysis = {
    languages: new Set<string>(),
    primaryFramework: '',
    structureSummary: '',
    keyComponents: [] as string[],
    dependencies: [] as string[],
    patterns: [] as string[],
    notes: [] as string[]
  };

  // Analyze each file
  files.forEach(file => {
    const extension = file.metadata?.extension || '';
    const language = file.metadata?.language || '';
    const content = file.content || '';

    if (language) analysis.languages.add(language);

    // Framework detection
    if (content.includes('React') || content.includes('react')) {
      analysis.primaryFramework = 'React';
    } else if (content.includes('Vue') || content.includes('vue')) {
      analysis.primaryFramework = 'Vue.js';
    } else if (content.includes('Angular') || extension === 'ts' && content.includes('@Component')) {
      analysis.primaryFramework = 'Angular';
    } else if (content.includes('express') || content.includes('app.listen')) {
      analysis.primaryFramework = 'Express.js';
    } else if (content.includes('django') || content.includes('from django')) {
      analysis.primaryFramework = 'Django';
    }

    // Key components detection
    if (extension === 'js' || extension === 'ts') {
      const functions = content.match(/(?:export\s+)?(?:function|const|let|var)\s+(\w+)\s*[=(]/g) || [];
      const classes = content.match(/(?:export\s+)?class\s+(\w+)/g) || [];
      const components = [...functions, ...classes].slice(0, 5);
      if (components.length > 0) {
        analysis.keyComponents.push(`${file.path.split('/').pop()}: ${components.join(', ')}`);
      }
    }

    // Dependencies analysis
    if (file.path.includes('package.json')) {
      try {
        const pkg = JSON.parse(content);
        const deps = Object.keys(pkg.dependencies || {}).slice(0, 5);
        if (deps.length > 0) {
          analysis.dependencies.push(`NPM: ${deps.join(', ')}`);
        }
      } catch (e) {
        // Invalid JSON
      }
    }

    // Import analysis
    const imports = content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g) || [];
    if (imports.length > 3) {
      analysis.patterns.push(`${file.path.split('/').pop()}: ${imports.length} imports`);
    }

    // Architecture patterns
    if (content.includes('useState') || content.includes('useEffect')) {
      analysis.patterns.push(`${file.path.split('/').pop()}: React hooks`);
    }
    if (content.includes('async') && content.includes('await')) {
      analysis.patterns.push(`${file.path.split('/').pop()}: Async/await patterns`);
    }
    if (content.includes('interface') || content.includes('type')) {
      analysis.patterns.push(`${file.path.split('/').pop()}: TypeScript types`);
    }
  });

  // Structure summary
  const fileTypes = [...analysis.languages];
  if (fileTypes.includes('javascript') && fileTypes.includes('html')) {
    analysis.structureSummary = 'Frontend web application';
  } else if (fileTypes.includes('python') && content.includes('django')) {
    analysis.structureSummary = 'Django web application';
  } else if (fileTypes.includes('javascript') && content.includes('express')) {
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

  analysis.languages = [...analysis.languages];
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

  async generateCode(request: GenerateCodeRequest): Promise<GenerateCodeResponse> {
    if (!this.config) {
      throw new Error('Nvidia NIM configuration not set');
    }

    try {
      const baseSystemPrompt = request.preset?.systemPrompt ||
        `You are an expert software engineer. Generate code based on the user's request.
        Provide the code and an explanation. If making changes to existing code, provide the old and new content.
        If this involves multiple steps, suggest development tasks.

        Context: ${JSON.stringify(request.context || {})}`;

      const generalPrompt = request.generalPrompt || '';

      // Build intelligent context summary
      const contextSummary = buildIntelligentContextSummary(request.context);

      const fullSystemPrompt = generalPrompt
        ? `${baseSystemPrompt}\n\n${generalPrompt}\n\n${contextSummary}`
        : `${baseSystemPrompt}\n\n${contextSummary}`;

      const requestBody: any = {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: (() => {
              const projectFiles = request.context?.projectFiles || [];
              if (projectFiles.length === 0) {
                return `${fullSystemPrompt}\n\nProject Context: No project files available`;
              }

              const formattedFiles = projectFiles.map(file => {
                const lines = file.content.split('\n');
                const numberedLines = lines.map((line, index) =>
                  `${(index + 1).toString().padStart(4, ' ')}: ${line}`
                ).join('\n');

                const fileExtension = file.path.split('.').pop()?.toLowerCase() || '';
                const language = getLanguageFromExtension(fileExtension);

                // Analyze code structure for better context
                const structure = analyzeCodeStructure(file.content, language);

                return `📄 File: ${file.path}
🔤 Language: ${language}
📏 Lines: ${lines.length}
📊 Size: ${file.content.length} characters
🏗️  Structure: ${structure.summary}

${structure.details ? `📋 Code Structure:\n${structure.details}\n\n` : ''}\`\`\`${language}
${numberedLines}
\`\`\``;
              }).join('\n\n' + '='.repeat(80) + '\n\n');

              return `${fullSystemPrompt}\n\nProject Context - Complete Codebase:\n${formattedFiles}`;
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