// src/components/PromptInput.tsx

"use client";

import { useMemo, useState } from 'react';
import { Send, Zap, CheckCircle2, LoaderCircle, Circle } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { nvidiaNimService } from '@/lib/nvidia-nim';
import { AIRequest, PromptRequest } from '@/types';
import { executionManager } from '@/lib/execution-manager';
import { aiService } from '@/lib/ai-service';

export function PromptInput() {
  const [prompt, setPrompt] = useState('');
  const ultraSteps = useMemo(() => ([
    {
      name: 'Code Analysis & Planning',
      presetId: 'analyze',
      prompt: 'Analyze the entire codebase comprehensively. Examine all files, identify architectural issues, code quality problems, potential improvements, and create a detailed development plan with all prioritized tasks. Focus on scalability, maintainability, security, performance, and best practices. Provide a complete roadmap for codebase enhancement.',
    },
    {
      name: 'Active Development',
      presetId: 'develop',
      prompt: 'Execute all tasks identified in the previous analysis perfectly. Implement every improvement, refactor all problematic code sections, enhance overall codebase quality, and make all necessary concrete code changes. Ensure all planned tasks are completed to the highest standard.',
    },
    {
      name: 'Bug Detection & Fixing',
      presetId: 'debug',
      prompt: 'Perform a thorough code review to detect any bugs, security vulnerabilities, runtime errors, or logic issues. Fix all identified problems comprehensively and ensure the code is production-ready and error-free. Verify that all changes work correctly and no new issues were introduced.',
    },
  ]), []);

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
    addAIRequest,
    updateAIRequest,
    currentProject,
    getProjectContext,
    logs,
  } = useAppStore();
  const ultraLogs = logs
    .filter((log) => log.sessionId === activeSessionId && log.message.startsWith('[Ultra]'))
    .slice()
    .reverse();

  const runRequest = async (requestInput: { prompt: string; requestType?: AIRequest['type']; retryFromJobId?: string; presetId?: string }) => {
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

    incrementSessionRequests(activeSessionId);
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

      const projectContext = currentProject
        ? getProjectContext(currentProject.id) ?? await aiService.buildProjectContext(currentProject.id)
        : undefined;

      const requestPreset = requestInput.presetId
        ? promptPresets.find((preset) => preset.id === requestInput.presetId) ?? activePreset
        : activePreset;

      const request: PromptRequest = {
        prompt: requestInput.prompt,
        preset: requestPreset || undefined,
        generalPrompt,
        context: {
          currentFile: activeFile || undefined,
          selectedCode: currentFile?.content,
          projectFiles,
          projectId: currentProject?.id,
          projectContext,
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
        message: `AI generated response using ${requestPreset?.name || 'Default'} preset`,
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
      decrementSessionRequests(activeSessionId);
    }
  };

  const executeUltraMode = async (userPrompt: string) => {
    const promptToUse = userPrompt.trim();
    setPrompt(''); // Clear the input immediately
    startUltraMode(ultraSteps.length);
    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      timestamp: new Date(),
      type: 'info',
      message: `[Ultra] Ultra Mode started for: "${promptToUse}"`,
      source: 'user_action',
    });

    // Step 1: Analyze user prompt + code and create plan
    updateUltraModeStep(1, ultraSteps[0].name);
    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      timestamp: new Date(),
      type: 'info',
      message: `[Ultra] Step 1/3 started: ${ultraSteps[0].name}`,
      source: 'ai_execution',
    });

    await runRequest({
      prompt: `User Request: ${promptToUse}\n\n${ultraSteps[0].prompt}`,
      requestType: 'analysis',
      presetId: ultraSteps[0].presetId,
    });
    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      timestamp: new Date(),
      type: 'success',
      message: `[Ultra] Step 1/3 completed: ${ultraSteps[0].name}`,
      source: 'ai_execution',
    });
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Step 2: Execute the plan (Active Development)
    updateUltraModeStep(2, ultraSteps[1].name);
    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      timestamp: new Date(),
      type: 'info',
      message: `[Ultra] Step 2/3 started: ${ultraSteps[1].name}`,
      source: 'ai_execution',
    });

    await runRequest({
      prompt: `User Request: ${promptToUse}\n\nBased on the analysis and plan above, ${ultraSteps[1].prompt}`,
      requestType: 'implementation',
      presetId: ultraSteps[1].presetId,
    });
    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      timestamp: new Date(),
      type: 'success',
      message: `[Ultra] Step 2/3 completed: ${ultraSteps[1].name}`,
      source: 'ai_execution',
    });
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Step 3: Bug Detection & Fixing
    updateUltraModeStep(3, ultraSteps[2].name);
    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      timestamp: new Date(),
      type: 'info',
      message: `[Ultra] Step 3/3 started: ${ultraSteps[2].name}`,
      source: 'ai_execution',
    });

    await runRequest({
      prompt: `User Request: ${promptToUse}\n\nAfter implementing the changes above, ${ultraSteps[2].prompt}`,
      requestType: 'debugging',
      presetId: ultraSteps[2].presetId,
    });
    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      timestamp: new Date(),
      type: 'success',
      message: `[Ultra] Step 3/3 completed: ${ultraSteps[2].name}`,
      source: 'ai_execution',
    });

    const lastStepPresetId = ultraSteps[ultraSteps.length - 1]?.presetId;
    if (lastStepPresetId) {
      const lastPreset = promptPresets.find((item) => item.id === lastStepPresetId);
      if (lastPreset) setActivePreset(lastPreset);
    }

    endUltraMode();
    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      timestamp: new Date(),
      type: 'success',
      message: '[Ultra] Ultra Mode completed successfully',
      source: 'user_action',
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim() || ultraModeActive) return;

    const nextPrompt = prompt;
    setPrompt('');
    void runRequest({ prompt: nextPrompt });
  };

  return (
    <div className="p-3 border-t border-neutral-800 bg-neutral-950/80">
      {ultraModeActive && (
        <div className="mb-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-xs font-medium text-yellow-300">Ultra Mode Active</span>
            </div>
            <span className="rounded bg-neutral-900/70 px-2 py-0.5 text-xs text-neutral-300">
              {ultraModeStep} / {ultraModeTotalSteps}
            </span>
          </div>
          <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-neutral-700">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-500 ease-out"
              style={{ width: `${(ultraModeStep / ultraModeTotalSteps) * 100}%` }}
            />
          </div>
          <p className="mb-3 text-xs text-neutral-300">{ultraModeCurrentStep}</p>

          <div className="space-y-1.5 rounded-md border border-neutral-700/70 bg-neutral-900/40 p-2">
            {ultraSteps.map((step, index) => {
              const stepNumber = index + 1;
              const isDone = ultraModeStep > stepNumber;
              const isCurrent = ultraModeStep === stepNumber;
              return (
                <div key={step.name} className="flex items-center gap-2 text-xs">
                  {isDone ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  ) : isCurrent ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin text-yellow-300" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-neutral-500" />
                  )}
                  <span className={`${isCurrent ? 'text-yellow-200' : isDone ? 'text-neutral-200' : 'text-neutral-400'}`}>
                    {stepNumber}. {step.name}
                  </span>
                </div>
              );
            })}
          </div>

          {ultraLogs.length > 0 && (
            <div className="mt-2 rounded-md border border-neutral-700/70 bg-neutral-950/60 p-2">
              <div className="mb-1 text-[11px] uppercase tracking-wide text-neutral-400">Stage logs</div>
              <div className="max-h-24 space-y-1 overflow-y-auto pr-1">
                {ultraLogs.slice(0, 5).map((log) => (
                  <p key={log.id} className="text-[11px] text-neutral-300">
                    <span className="text-neutral-500">{log.timestamp.toLocaleTimeString()} </span>
                    {log.message.replace('[Ultra] ', '')}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900">
          <div className="flex items-center gap-2 border-b border-neutral-800 px-2 py-1.5">
            <select
              value={activePreset?.id ?? ''}
              onChange={(event) => {
                const preset = promptPresets.find((item) => item.id === event.target.value);
                if (preset && !ultraModeActive) setActivePreset(preset);
              }}
              disabled={ultraModeActive}
              aria-label="Select AI preset"
              className="max-w-[210px] rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {promptPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            <span className="ml-auto text-[11px] text-neutral-500">{prompt.length}/1000</span>
          </div>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe what you want to build or modify with AI assistance..."
            className="min-h-16 w-full resize-none bg-transparent px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            rows={2}
            disabled={ultraModeActive}
          />
        </div>

        <button
          type="button"
          onClick={() => executeUltraMode(prompt)}
          disabled={ultraModeActive || !projectPath || !prompt.trim()}
          aria-label="Run Ultra Mode"
          className="flex h-9 items-center gap-1.5 rounded-lg border border-purple-500/60 bg-purple-500/15 px-2.5 text-xs font-medium text-purple-200 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Zap className="h-4 w-4" />
          Ultra
        </button>
        <button
          type="submit"
          disabled={ultraModeActive || !prompt.trim()}
          aria-label="Send prompt to AI assistant"
          className={`h-9 rounded-lg px-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            ultraModeActive || !prompt.trim()
              ? 'cursor-not-allowed bg-neutral-700 text-neutral-400'
              : 'bg-blue-600 text-white hover:bg-blue-500'
          }`}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
