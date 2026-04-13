import { useAppStore } from '@/lib/store';
import { nvidiaNimService } from '@/lib/nvidia-nim';
import { AIRequest, PromptPreset } from '@/types';
import { aiService } from '@/lib/ai-service';
import { executionManager } from '@/lib/execution-manager';

export interface ExecuteAIRequestInput {
  prompt: string;
  requestType?: AIRequest['type'];
  retryFromJobId?: string;
  presetId?: PromptPreset['id'];
  signal?: AbortSignal;
  jobId?: string;
}

export interface ExecuteAIRequestResult {
  ok: boolean;
  jobId: string;
  responseText?: string;
  error?: string;
}

export async function executeAIRequest(input: ExecuteAIRequestInput): Promise<ExecuteAIRequestResult> {
  const state = useAppStore.getState();
  const {
    addMessage,
    setGenerating,
    incrementSessionRequests,
    decrementSessionRequests,
    activeFile,
    openFiles,
    addTask,
    activePreset,
    promptPresets,
    projectPath,
    generalPrompt,
    addLog,
    addBug,
    activeSessionId,
    addAIRequest,
    updateAIRequest,
    currentProject,
    getProjectContext,
  } = state;

  const selectedPreset = input.presetId
    ? promptPresets.find((preset) => preset.id === input.presetId) ?? activePreset
    : activePreset;

  const jobId = input.jobId ?? crypto.randomUUID();
  const requestId = crypto.randomUUID();

  const aiRequest: AIRequest = {
    id: requestId,
    jobId,
    sessionId: activeSessionId,
    type: input.requestType ?? 'implementation',
    prompt: input.prompt,
    context: {
      preset: selectedPreset,
      generalPrompt,
    },
    status: 'pending',
    priority: 'medium',
    dependencies: [],
    createdAt: new Date(),
    estimatedTokens: Math.ceil(input.prompt.length / 4),
  };

  addAIRequest(aiRequest);
  updateAIRequest(requestId, { status: 'running', startedAt: new Date() });

  addMessage(activeSessionId, {
    id: crypto.randomUUID(),
    sessionId: activeSessionId,
    jobId,
    role: 'user',
    content: input.prompt,
    timestamp: new Date(),
  });

  incrementSessionRequests(activeSessionId);
  setGenerating(activeSessionId, true);

  try {
    const currentFile = openFiles.find((file) => file.path === activeFile);

    let projectFiles = openFiles.map((file) => ({
      path: file.path,
      content: file.content,
    }));

    if (projectPath) {
      try {
        const projectResponse = await fetch('/api/project/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectPath }),
        });

        const projectData = await projectResponse.json();
        if (projectData.files) {
          projectFiles = [...projectFiles, ...projectData.files];
        }
      } catch (error) {
        console.error('Failed to load project files:', error);
      }
    }

    const projectContext = currentProject
      ? getProjectContext(currentProject.id) ?? await aiService.buildProjectContext(currentProject.id)
      : undefined;

    const response = await nvidiaNimService.generateCode({
      prompt: input.prompt,
      preset: selectedPreset || undefined,
      generalPrompt,
      signal: input.signal,
      context: {
        currentFile: activeFile || undefined,
        selectedCode: currentFile?.content,
        projectFiles,
        projectId: currentProject?.id,
        projectContext,
        sessionId: activeSessionId,
        jobId,
      },
    });

    updateAIRequest(requestId, {
      status: 'completed',
      completedAt: new Date(),
      result: response,
      actualTokens: Math.ceil(response.explanation.length / 4),
    });

    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      jobId,
      timestamp: new Date(),
      type: 'success',
      message: `AI generated response using ${selectedPreset?.name || 'Default'} preset`,
      source: 'ai_execution',
    });

    // Apply file changes produced by AI
    if (response.changes && response.changes.length > 0) {
      const { updateFileContent, openFile, currentProject } = useAppStore.getState();

      for (const change of response.changes) {
        // Always update in-memory store so the editor reflects the change immediately
        const alreadyOpen = useAppStore.getState().openFiles.find(f => f.path === change.filePath);
        if (alreadyOpen) {
          updateFileContent(change.filePath, change.newContent);
        } else {
          openFile(change.filePath, change.newContent);
        }

        // Write to disk only for real (non-demo) projects
        if (currentProject && !currentProject.isDemo && projectPath) {
          try {
            await fetch('/api/project/file/write', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectPath,
                filePath: change.filePath,
                content: change.newContent,
              }),
            });
            addLog({
              id: crypto.randomUUID(),
              sessionId: activeSessionId,
              jobId,
              timestamp: new Date(),
              type: 'success',
              message: `AI wrote changes to ${change.filePath}`,
              source: 'file_operation',
            });
          } catch (err) {
            addLog({
              id: crypto.randomUUID(),
              sessionId: activeSessionId,
              jobId,
              timestamp: new Date(),
              type: 'error',
              message: `Failed to write ${change.filePath} to disk: ${err instanceof Error ? err.message : 'unknown error'}`,
              source: 'file_operation',
            });
          }
        } else if (currentProject?.isDemo) {
          addLog({
            id: crypto.randomUUID(),
            sessionId: activeSessionId,
            jobId,
            timestamp: new Date(),
            type: 'info',
            message: `Demo mode: ${change.filePath} updated in editor (not saved to disk). Open a real project to persist changes.`,
            source: 'file_operation',
          });
        }
      }
    }

    addMessage(activeSessionId, {
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      jobId,
      role: 'assistant',
      content: response.explanation,
      timestamp: new Date(),
      changes: response.changes,
    });

    if (response.tasks) {
      response.tasks.forEach((task) => addTask(task));
    }

    if (input.retryFromJobId) {
      addLog({
        id: crypto.randomUUID(),
        sessionId: activeSessionId,
        jobId,
        timestamp: new Date(),
        type: 'info',
        message: `Job retried from ${input.retryFromJobId}`,
        source: 'ai_execution',
      });
    }

    return {
      ok: true,
      jobId,
      responseText: response.explanation,
    };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'CanceledError';

    updateAIRequest(requestId, {
      status: 'failed',
      completedAt: new Date(),
      error: isAbort ? 'Request canceled by user' : error instanceof Error ? error.message : 'Unknown error',
    });

    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      jobId,
      timestamp: new Date(),
      type: isAbort ? 'warning' : 'error',
      message: isAbort
        ? 'AI execution cancelled by user'
        : `AI execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: !isAbort && error instanceof Error ? error.stack : undefined,
      source: 'ai_execution',
    });

    if (!isAbort && error instanceof Error && error.message.includes('API')) {
      addBug({
        id: crypto.randomUUID(),
        title: 'AI API Connection Error',
        description: `Failed to connect to AI service: ${error.message}`,
        status: 'open',
        severity: 'high',
        source: 'program_error',
        relatedFiles: [],
        relatedTasks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    addMessage(activeSessionId, {
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      jobId,
      role: 'assistant',
      content: isAbort
        ? 'Request cancelled.'
        : 'Sorry, I encountered an error while generating code. Please try again.',
      timestamp: new Date(),
    });

    return {
      ok: false,
      jobId,
      error: isAbort ? 'Request canceled by user' : error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    executionManager.clear(jobId);
    decrementSessionRequests(activeSessionId);
  }
}
