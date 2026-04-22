// src/lib/ai-service.ts

import { nvidiaNimService } from './nvidia-nim';
import { useAppStore } from './store';
import { ProjectContext, AIRequest, FileWithMetadata } from '@/types';

class AIService {
  private readonly defaultContextRefreshMs = 5 * 60 * 1000;

  // Intelligent context building
  async buildProjectContext(projectId: string): Promise<ProjectContext> {
    const { currentProject, getProjectContext } = useAppStore.getState();

    if (!currentProject || currentProject.id !== projectId) {
      throw new Error('Project not found');
    }

    // Load project files
    let projectFiles: FileWithMetadata[] = [];
    try {
      const response = await fetch('/api/project/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath: currentProject.path }),
      });
      const data = await response.json();
      projectFiles = data.files || [];
    } catch (error) {
      console.error('Failed to load project files for context:', error);
    }

    // Analyze project deeply
    const analysis = await this.analyzeProjectDeeply(projectFiles);
    if (analysis.suggestedTasks?.length > 0) {
      const { addTask, tasks } = useAppStore.getState();
      analysis.suggestedTasks.forEach((st: any) => {
        if (!tasks.some((task) => task.title === st.title)) {
          addTask({
            id: crypto.randomUUID(),
            title: st.title,
            description: st.description || '',
            status: 'pending',
            priority: st.priority || 'medium',
            items: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      });
    }

    // Get existing context for incremental updates
    const existingContext = getProjectContext(projectId);
    const version = existingContext ? existingContext.version + 1 : 1;
    const summaryTimeline = [
      ...(existingContext?.summaryTimeline || []).slice(-4),
      {
        version,
        createdAt: new Date(),
        summary: analysis.summary
      }
    ];

    const context: ProjectContext = {
      id: `context-${projectId}-${version}`,
      projectId,
      summary: analysis.summary,
      keyComponents: analysis.keyComponents,
      dependencies: analysis.dependencies,
      patterns: analysis.patterns,
      architecture: analysis.architecture,
      lastUpdated: new Date(),
      version,
      fileCount: projectFiles.length,
      totalLines: analysis.totalLines,
      languages: analysis.languages,
      framework: analysis.framework,
      complexity: analysis.complexity,
      insights: analysis.insights,
      recommendations: analysis.recommendations,
      focusAreas: this.resolveFocusAreas(analysis),
      summaryTimeline
    };

    // Update context in store
    useAppStore.getState().updateProjectContext(context);

    return context;
  }

  // Deep project analysis
  private async analyzeProjectDeeply(files: FileWithMetadata[]): Promise<any> {
    const totalLines = files.reduce((sum, file) => sum + (file.metadata?.lineCount || 0), 0);
    const languages = [...new Set(files.map((file) => file.metadata?.language).filter(Boolean))];

    const fileSummary = files
      .slice(0, 40)
      .map((file) => {
        const lines = file.content.split('\n').slice(0, 30).join('\n');
        return `### ${file.path} (${file.metadata?.lineCount || 0} lines)\n${lines}`;
      })
      .join('\n\n---\n\n');

    const analyzePreset = useAppStore.getState().promptPresets.find((preset) => preset.id === 'analyze');

    try {
      const result = await nvidiaNimService.generateCode({
        prompt: `Analyze this codebase (${files.length} files, ${totalLines} lines, languages: ${languages.join(', ')}).\n\nFile samples:\n${fileSummary}`,
        preset: analyzePreset,
      });

      const jsonMatch = result.explanation.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || '',
          keyComponents: parsed.keyComponents || [],
          dependencies: parsed.dependencies || [],
          patterns: parsed.patterns || [],
          architecture: parsed.architecture || '',
          totalLines,
          languages,
          framework: parsed.framework || 'Unknown',
          complexity: parsed.complexity || 'low',
          insights: parsed.insights || [],
          recommendations: parsed.recommendations || [],
          suggestedTasks: parsed.suggestedTasks || [],
        };
      }
    } catch (error) {
      console.warn('LLM analysis failed, falling back to static analysis:', error);
    }

    return {
      summary: `${languages.join('/')} codebase with ${files.length} files and ${totalLines} lines.`,
      keyComponents: [],
      dependencies: [],
      patterns: [],
      architecture: 'Unknown',
      totalLines,
      languages,
      framework: 'Unknown',
      complexity: totalLines > 10000 ? 'high' : 'low',
      insights: [],
      recommendations: [],
      suggestedTasks: [],
    };
  }

  private generateInsights(analysis: any): string[] {
    const insights = [];

    if (analysis.complexity === 'very_high') {
      insights.push('Large, complex codebase requiring careful architectural decisions');
    }

    if (analysis.languages.includes('typescript') && analysis.languages.includes('javascript')) {
      insights.push('Mixed TypeScript/JavaScript codebase - consider full migration to TypeScript');
    }

    if (analysis.framework === 'React' && analysis.patterns.some((p: string) => p.includes('hooks'))) {
      insights.push('Modern React patterns with hooks - good for maintainability');
    }

    if (analysis.totalLines > 10000 && !analysis.patterns.some((p: string) => p.includes('types'))) {
      insights.push('Large codebase without strong typing - consider adding TypeScript');
    }

    return insights;
  }

  private generateRecommendations(analysis: any): string[] {
    const recommendations = [];

    if (analysis.complexity === 'high' || analysis.complexity === 'very_high') {
      recommendations.push('Consider modularizing the codebase into smaller, focused packages');
      recommendations.push('Implement comprehensive testing strategy');
    }

    if (analysis.languages.includes('javascript') && !analysis.languages.includes('typescript')) {
      recommendations.push('Consider migrating to TypeScript for better type safety');
    }

    if (analysis.framework === 'React') {
      recommendations.push('Use React.memo, useMemo, and useCallback for performance optimization');
      recommendations.push('Consider implementing error boundaries for better error handling');
    }

    if (analysis.totalLines < 1000) {
      recommendations.push('Small codebase - focus on establishing good patterns early');
    }

    return recommendations;
  }

  private resolveFocusAreas(analysis: any): string[] {
    const focusAreas: string[] = [];

    if (analysis.complexity === 'high' || analysis.complexity === 'very_high') {
      focusAreas.push('modularization');
    }
    if (analysis.patterns.some((pattern: string) => pattern.includes('Async/await'))) {
      focusAreas.push('async-reliability');
    }
    if (analysis.languages.includes('typescript')) {
      focusAreas.push('type-safety');
    }
    if (analysis.framework === 'React') {
      focusAreas.push('render-performance');
    }

    if (focusAreas.length === 0) {
      focusAreas.push('core-maintainability');
    }

    return focusAreas;
  }

  private isRequestReady(request: AIRequest, allRequests: AIRequest[]): boolean {
    if (request.dependencies.length === 0) {
      return true;
    }

    return request.dependencies.every((depId) => {
      const dependency = allRequests.find((candidate) => candidate.id === depId);
      return dependency?.status === 'completed';
    });
  }

  private sortByPriority(requests: AIRequest[]): AIRequest[] {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return requests.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  private claimRequestForExecution(requestId: string): AIRequest | null {
    let claimedRequest: AIRequest | null = null;

    useAppStore.setState((state) => {
      const target = state.aiRequests.find((request) => request.id === requestId);
      if (!target || target.status !== 'pending') {
        return state;
      }

      const startedAt = new Date();
      claimedRequest = { ...target, status: 'running', startedAt };

      return {
        ...state,
        aiRequests: state.aiRequests.map((request) =>
          request.id === requestId
            ? { ...request, status: 'running', startedAt }
            : request
        )
      };
    });

    return claimedRequest;
  }

  private dispatchAIRequests() {
    const state = useAppStore.getState();
    const { maxConcurrentRequests, getRunningRequests, updateAIRequest } = state;

    const allRequests = state.aiRequests;

    allRequests
      .filter((request) => request.status === 'pending' || request.status === 'blocked')
      .forEach((request) => {
        const nextStatus = this.isRequestReady(request, allRequests) ? 'pending' : 'blocked';
        if (request.status !== nextStatus) {
          updateAIRequest(request.id, { status: nextStatus });
        }
      });

    const availableSlots = maxConcurrentRequests - getRunningRequests().length;
    if (availableSlots <= 0) {
      return;
    }

    const readyRequests = this.sortByPriority(
      useAppStore.getState().aiRequests.filter((request) => request.status === 'pending')
    ).slice(0, availableSlots);

    if (readyRequests.length === 0) {
      return;
    }

    void this.processAIRequests(readyRequests);
  }

  // Parallel AI request processing
  async processAIRequests(requests: AIRequest[]): Promise<void> {
    const { maxConcurrentRequests, updateAIRequest, addLog } = useAppStore.getState();
    const sortedRequests = this.sortByPriority([...requests]);

    // Process in batches based on concurrency limit
    for (let i = 0; i < sortedRequests.length; i += maxConcurrentRequests) {
      const batch = sortedRequests.slice(i, i + maxConcurrentRequests);

      // Process batch in parallel
      const promises = batch.map(async (request) => {
        const claimedRequest = this.claimRequestForExecution(request.id);
        if (!claimedRequest) {
          return;
        }

        try {
          addLog({
            id: crypto.randomUUID(),
            sessionId: request.sessionId,
            jobId: request.jobId,
            timestamp: new Date(),
            type: 'info',
            message: `Starting ${claimedRequest.type} request: ${claimedRequest.prompt.substring(0, 50)}...`,
            source: 'ai_execution'
          });

          const result = await nvidiaNimService.generateCode({
            prompt: claimedRequest.prompt,
            preset: claimedRequest.context?.preset,
            generalPrompt: claimedRequest.context?.generalPrompt,
            context: claimedRequest.context
          });

          updateAIRequest(claimedRequest.id, {
            status: 'completed',
            completedAt: new Date(),
            result,
            actualTokens: Math.ceil(result.explanation.length / 4) // Rough estimate
          });

          addLog({
            id: crypto.randomUUID(),
            sessionId: request.sessionId,
            jobId: request.jobId,
            timestamp: new Date(),
            type: 'success',
            message: `Completed ${claimedRequest.type} request successfully`,
            source: 'ai_execution'
          });

        } catch (error) {
          updateAIRequest(claimedRequest.id, {
            status: 'failed',
            completedAt: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          addLog({
            id: crypto.randomUUID(),
            sessionId: request.sessionId,
            jobId: request.jobId,
            timestamp: new Date(),
            type: 'error',
            message: `Failed ${claimedRequest.type} request: ${error instanceof Error ? error.message : 'Unknown error'}`,
            source: 'ai_execution'
          });
        }
      });

      await Promise.all(promises);
      this.dispatchAIRequests();
    }
  }

  // Smart request queuing and execution
  async queueAIRequest(request: Omit<AIRequest, 'id' | 'status' | 'createdAt'>): Promise<string> {
    const { addAIRequest } = useAppStore.getState();

    const aiRequest: AIRequest = {
      id: crypto.randomUUID(),
      sessionId: request.sessionId,
      jobId: request.jobId,
      status: 'pending',
      createdAt: new Date(),
      estimatedTokens: Math.ceil(request.prompt.length / 4),
      actualTokens: undefined,
      startedAt: undefined,
      completedAt: undefined,
      result: undefined,
      error: undefined,
      type: request.type,
      prompt: request.prompt,
      context: request.context,
      priority: request.priority,
      dependencies: request.dependencies
    };

    addAIRequest(aiRequest);
    this.dispatchAIRequests();

    return aiRequest.id;
  }

  // Update all project contexts
  async updateAllProjectContexts(): Promise<void> {
    const { projects } = useAppStore.getState();

    for (const project of projects) {
      try {
        const existingContext = useAppStore.getState().getProjectContext(project.id);
        const ageMs = existingContext
          ? Date.now() - existingContext.lastUpdated.getTime()
          : Number.POSITIVE_INFINITY;

        const refreshThresholdMs = existingContext?.complexity === 'very_high'
          ? 2 * 60 * 1000
          : existingContext?.complexity === 'high'
            ? 3 * 60 * 1000
            : this.defaultContextRefreshMs;

        if (ageMs >= refreshThresholdMs) {
          await this.buildProjectContext(project.id);
        }
      } catch (error) {
        console.error(`Failed to update context for project ${project.name}:`, error);
      }
    }
  }

  // Cleanup
  destroy() {
    // No-op: periodic updates are intentionally not auto-started to avoid serverless interval leaks.
  }
}

export const aiService = new AIService();
