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

export async function autoCommitAfterAIWrite(response: { explanation: string; changes?: Array<{ filePath: string; newContent: string }> }) {
  const { autoCommitAfterAI, projectPath } = useAppStore.getState();
  if (!autoCommitAfterAI || !projectPath) {
    return;
  }

  const commitMsg = response.explanation.split('\n')[0].slice(0, 72) || 'AI: code changes';
  await fetch('/api/git', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'save',
      projectPath,
      filePath: response.changes?.[0]?.filePath ?? '',
      content: response.changes?.[0]?.newContent ?? '',
      commitMessage: `AI: ${commitMsg}`,
    }),
  });
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
    sessions,
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
    const sessionMessages = sessions[activeSessionId]?.messages ?? [];
    // Exclude the user message we just added (it's the last one, role='user')
    // Take up to 8 messages before it for history
    const historyMessages = sessionMessages
      .slice(0, -1)
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .slice(-8)
      .map((message) => ({
        role: message.role as 'user' | 'assistant',
        // Strip FILE blocks from assistant messages to save tokens
        content: message.role === 'assistant'
          ? message.content.replace(/<<<FILE:[\s\S]*?<<<END_FILE>>>/g, '[file changes applied]').trim()
          : message.content,
      }));

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

    // Add empty assistant message placeholder for streaming
    const streamingMessageId = crypto.randomUUID();
    addMessage(activeSessionId, {
      id: streamingMessageId,
      sessionId: activeSessionId,
      jobId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    });

    // Snapshot of files that might be changed — captured before AI responds
    const fileContentSnapshot = new Map<string, string>();
    for (const file of openFiles) {
      fileContentSnapshot.set(file.path, file.content);
    }

    let streamedContent = '';

    const response = await nvidiaNimService.generateCodeStream(
      {
        prompt: input.prompt,
        preset: selectedPreset || undefined,
        generalPrompt,
        signal: input.signal,
        conversationHistory: historyMessages,
        context: {
          currentFile: activeFile || undefined,
          selectedCode: currentFile?.content,
          projectFiles,
          projectId: currentProject?.id,
          projectContext,
          sessionId: activeSessionId,
          jobId,
        },
      },
      (chunk: string) => {
        streamedContent += chunk;
        // Update the streaming message in real-time
        useAppStore.setState((state) => ({
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...state.sessions[activeSessionId],
              messages: state.sessions[activeSessionId].messages.map((m) =>
                m.id === streamingMessageId ? { ...m, content: streamedContent } : m
              ),
            },
          },
        }));
      },
      input.signal
    );

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

    const enrichedChanges = (response.changes ?? []).map((change) => ({
      ...change,
      oldContent: fileContentSnapshot.get(change.filePath) ?? '',
    }));

    if (enrichedChanges.length > 0) {
      useAppStore.getState().setPendingChanges(enrichedChanges);
      useAppStore.getState().setDiffViewerOpen(true);

      addLog({
        id: crypto.randomUUID(),
        sessionId: activeSessionId,
        jobId,
        timestamp: new Date(),
        type: 'info',
        message: `AI generated ${enrichedChanges.length} pending file change${enrichedChanges.length === 1 ? '' : 's'} for review`,
        source: 'ai_execution',
      });
    }

    // Update the streaming message with final content and changes
    useAppStore.setState((state) => ({
      sessions: {
        ...state.sessions,
        [activeSessionId]: {
          ...state.sessions[activeSessionId],
          messages: state.sessions[activeSessionId].messages.map((m) =>
            m.id === streamingMessageId
              ? { ...m, content: response.explanation, changes: enrichedChanges }
              : m
          ),
        },
      },
    }));

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
