// src/components/PromptInput.tsx

"use client";

import { useMemo, useState } from 'react';
import { Send, Zap, Square, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { nvidiaNimService } from '@/lib/nvidia-nim';
import { AIRequest, PromptRequest } from '@/types';
import { executionManager } from '@/lib/execution-manager';

export function PromptInput() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    addMessage,
    setGenerating,
    activeFile,
    openFiles,
    addTask,
    activePreset,
    promptPresets,
    setActivePreset,
    projectPath,
    generalPrompt,
    addLog,
    addBug,
    ultraModeActive,
    ultraModeStep,
    ultraModeTotalSteps,
    ultraModeCurrentStep,
    startUltraMode,
    updateUltraModeStep,
    endUltraMode,
    activeSessionId,
    aiRequests,
    addAIRequest,
    updateAIRequest,
  } = useAppStore();

  const sessionRequests = useMemo(
    () => aiRequests.filter((request) => request.sessionId === activeSessionId),
    [aiRequests, activeSessionId]
  );

  const runRequest = async (requestInput: { prompt: string; requestType?: AIRequest['type']; retryFromJobId?: string }) => {
    const jobId = crypto.randomUUID();
    const requestId = crypto.randomUUID();

    const aiRequest: AIRequest = {
      id: requestId,
      jobId,
      sessionId: activeSessionId,
      type: requestInput.requestType ?? 'implementation',
      prompt: requestInput.prompt,
      context: {
        preset: activePreset,
        generalPrompt,
      },
      status: 'pending',
      priority: 'medium',
      dependencies: [],
      createdAt: new Date(),
      estimatedTokens: Math.ceil(requestInput.prompt.length / 4),
    };

    addAIRequest(aiRequest);
    updateAIRequest(requestId, { status: 'running', startedAt: new Date() });

    const userMessageId = crypto.randomUUID();
    addMessage(activeSessionId, {
      id: userMessageId,
      sessionId: activeSessionId,
      jobId,
      role: 'user',
      content: requestInput.prompt,
      timestamp: new Date(),
    });

    setGenerating(activeSessionId, true);
    const controller = executionManager.createController(jobId);

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

      const request: PromptRequest = {
        prompt: requestInput.prompt,
        preset: activePreset || undefined,
        generalPrompt,
        context: {
          currentFile: activeFile || undefined,
          selectedCode: currentFile?.content,
          projectFiles,
          sessionId: activeSessionId,
          jobId,
        },
      };

      const response = await nvidiaNimService.generateCode({
        ...request,
        signal: controller.signal,
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
        message: `AI generated response using ${activePreset?.name || 'Default'} preset`,
        source: 'ai_execution',
      });

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

      if (requestInput.retryFromJobId) {
        addLog({
          id: crypto.randomUUID(),
          sessionId: activeSessionId,
          jobId,
          timestamp: new Date(),
          type: 'info',
          message: `Job retried from ${requestInput.retryFromJobId}`,
          source: 'ai_execution',
        });
      }
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
    } finally {
      executionManager.clear(jobId);
      setGenerating(activeSessionId, false);
    }
  };

  const executeUltraMode = async () => {
    const ultraSteps = [
      {
        name: 'Code Analysis & Planning',
        presetId: 'analyze',
        prompt: 'Analyze the entire codebase comprehensively. Identify architectural issues, code quality problems, potential improvements, and create a detailed development plan with prioritized tasks. Focus on scalability, maintainability, and best practices.',
      },
      {
        name: 'Task Implementation',
        presetId: 'develop',
        prompt: 'Execute all the tasks identified in the previous analysis. Implement the improvements, refactor code where needed, and enhance the overall codebase quality. Make concrete code changes.',
      },
      {
        name: 'Bug Detection & Fixing',
        presetId: 'debug',
        prompt: 'Perform a thorough code review to detect any bugs, security issues, or runtime errors. Fix all identified problems and ensure the code is production-ready.',
      },
      {
        name: 'Final Verification',
        presetId: 'analyze',
        prompt: 'Verify that all changes are working correctly, no new issues were introduced, and the codebase meets high quality standards. Provide a summary of all improvements made.',
      },
    ];

    startUltraMode(ultraSteps.length);

    for (let i = 0; i < ultraSteps.length; i++) {
      const step = ultraSteps[i];
      updateUltraModeStep(i + 1, step.name);

      const preset = promptPresets.find((item) => item.id === step.presetId);
      if (preset) setActivePreset(preset);

      await runRequest({ prompt: `[${step.name}] ${step.prompt}`, requestType: 'analysis' });
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    endUltraMode();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim() || isLoading || ultraModeActive) return;

    setIsLoading(true);
    try {
      await runRequest({ prompt });
      setPrompt('');
    } finally {
      setIsLoading(false);
    }
  };

  const cancelJob = (jobId: string) => {
    const canceled = executionManager.cancel(jobId);
    if (canceled) {
      addLog({
        id: crypto.randomUUID(),
        sessionId: activeSessionId,
        jobId,
        timestamp: new Date(),
        type: 'warning',
        message: `Canceled job ${jobId}`,
        source: 'user_action',
      });
    }
  };

  const retryJob = async (jobId: string) => {
    const targetRequest = sessionRequests.find((request) => request.jobId === jobId);
    if (!targetRequest || targetRequest.status === 'running') return;

    await runRequest({
      prompt: targetRequest.prompt,
      requestType: targetRequest.type,
      retryFromJobId: jobId,
    });
  };

  return (
    <div className="p-4 bg-neutral-800">
      {ultraModeActive && (
        <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-yellow-400">Ultra Mode Active</span>
            <span className="text-xs text-neutral-400">Step {ultraModeStep} of {ultraModeTotalSteps}</span>
          </div>
          <div className="w-full bg-neutral-700 rounded-full h-2 mb-2">
            <div
              className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(ultraModeStep / ultraModeTotalSteps) * 100}%` }}
            />
          </div>
          <p className="text-xs text-neutral-300">{ultraModeCurrentStep}</p>
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        <label className="text-sm text-neutral-400">AI Mode:</label>
        <select
          value={activePreset?.id || ''}
          onChange={(event) => {
            const preset = promptPresets.find((item) => item.id === event.target.value);
            if (preset) setActivePreset(preset);
          }}
          className="px-3 py-1 bg-neutral-700 border border-neutral-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading || ultraModeActive}
        >
          {promptPresets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>

        <button
          onClick={executeUltraMode}
          disabled={isLoading || ultraModeActive || !projectPath}
          className="ml-auto px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-neutral-600 disabled:to-neutral-600 disabled:cursor-not-allowed rounded text-sm font-medium flex items-center gap-1 transition-all"
        >
          <Zap className="w-4 h-4" />
          Ultra Mode
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe what you want to build or modify..."
            className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            disabled={isLoading || ultraModeActive}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || ultraModeActive || !prompt.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-600 disabled:cursor-not-allowed rounded-lg flex items-center gap-2 transition-colors"
        >
          {isLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>

      <div className="mt-3 space-y-2 max-h-36 overflow-y-auto pr-1">
        {sessionRequests.slice().reverse().slice(0, 5).map((request) => (
          <div key={request.id} className="flex items-center justify-between rounded border border-neutral-700 bg-neutral-900/60 px-2 py-1 text-xs text-neutral-300">
            <span className="truncate max-w-[60%]" title={request.prompt}>{request.prompt}</span>
            <div className="flex items-center gap-2">
              <span className="uppercase text-[10px] text-neutral-400">{request.status}</span>
              <button
                type="button"
                onClick={() => cancelJob(request.jobId)}
                disabled={request.status !== 'running'}
                className="text-yellow-400 disabled:text-neutral-500"
                title="Cancel job"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => retryJob(request.jobId)}
                disabled={request.status === 'running'}
                className="text-blue-400 disabled:text-neutral-500"
                title="Retry job"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
