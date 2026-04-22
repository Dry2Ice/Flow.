// src/components/PromptInput.tsx

"use client";

import { useEffect, useMemo, useState } from 'react';
import { Send, Zap, CheckCircle2, LoaderCircle, Circle } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { nvidiaNimService } from '@/lib/nvidia-nim';
import { AIRequest, PromptRequest } from '@/types';
import { executionManager } from '@/lib/execution-manager';
import { aiService } from '@/lib/ai-service';
import { codeExecutor } from '@/lib/code-executor';
import { embeddingService } from '@/lib/embedding-service';

export function PromptInput() {
  const [prompt, setPrompt] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [activeStreamingJobId, setActiveStreamingJobId] = useState<string | null>(null);
  const [contextStats, setContextStats] = useState<{ totalFiles: number; relevantChunks: number } | null>(null);
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
      name: 'Code Testing & Validation',
      presetId: 'debug',
      action: 'test',
      prompt: 'Test the implemented code changes thoroughly. Run all available tests, check for runtime errors, validate functionality, and ensure the code works as expected. Identify any issues that need to be addressed before final bug fixing.',
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
    embeddingConfig,
    projectChunks,
    indexProjectForEmbedding,
  } = useAppStore();
  const ultraLogs = logs
    .filter((log) => log.sessionId === activeSessionId && log.message.startsWith('[Ultra]'))
    .slice()
    .reverse();

  useEffect(() => {
    // Don't abort during Ultra Mode — it manages its own multi-step flow
    if (ultraModeActive) return;

    if (activeStreamingJobId) {
      executionManager.abort(activeStreamingJobId);
      addLog({
        id: crypto.randomUUID(),
        sessionId: activeSessionId,
        jobId: activeStreamingJobId,
        timestamp: new Date(),
        type: 'info',
        message: 'Generation aborted: active file changed',
        source: 'user_action',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile]);

  const runRequest = async (requestInput: { prompt: string; requestType?: AIRequest['type']; retryFromJobId?: string; presetId?: string }) => {
    const jobId = crypto.randomUUID();
    const requestId = crypto.randomUUID();
    const streamingMessageId = crypto.randomUUID();

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
    setStreamingContent('');
    setActiveStreamingJobId(jobId);
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

      if (embeddingConfig) {
        embeddingService.setConfig(embeddingConfig);

        let chunks = projectChunks;
        if (chunks.length === 0) {
          await indexProjectForEmbedding();
          chunks = useAppStore.getState().projectChunks;
        }

        if (chunks.length > 0) {
          const relevant = await embeddingService.search(requestInput.prompt, chunks, 5);
          if (relevant.length > 0) {
            const relevantByPath = new Map<string, string[]>();
            relevant.forEach((chunk) => {
              const range = `// lines ${chunk.startLine}-${chunk.endLine}`;
              const snippet = `${range}\n${chunk.content}`;
              const existing = relevantByPath.get(chunk.filePath) || [];
              existing.push(snippet);
              relevantByPath.set(chunk.filePath, existing);
            });

            projectFiles = Array.from(relevantByPath.entries()).map(([path, snippets]) => ({
              path,
              content: snippets.join('\n\n'),
            }));
          }

          setContextStats({
            totalFiles: new Set(chunks.map((chunk) => chunk.filePath)).size,
            relevantChunks: relevant.length,
          });
        }
      } else {
        const contextTokens = nvidiaNimService.getContextTokens();

        if (contextTokens > 0) {
          const activeDirectory = activeFile ? (activeFile.includes('/') ? activeFile.slice(0, activeFile.lastIndexOf('/')) : '') : '';
          const promptLower = requestInput.prompt.toLowerCase();
          const originalCount = projectFiles.length;
          const maxChars = contextTokens * 3;

          const scoredFiles = projectFiles
            .map((file) => {
              const fileName = file.path.split('/').pop()?.toLowerCase() ?? file.path.toLowerCase();
              const fileDirectory = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : '';

              let score = 1;
              if (fileName && promptLower.includes(fileName)) {
                score = 3;
              } else if (activeDirectory && fileDirectory === activeDirectory) {
                score = 2;
              }

              return { ...file, score };
            })
            .sort((a, b) => b.score - a.score);

          let totalChars = 0;
          const trimmedList: typeof projectFiles = [];

          for (const file of scoredFiles) {
            const fileLength = file.content?.length ?? 0;
            if (trimmedList.length > 0 && totalChars + fileLength > maxChars) {
              break;
            }
            trimmedList.push({ path: file.path, content: file.content });
            totalChars += fileLength;
          }

          projectFiles = trimmedList;
          setContextStats({
            totalFiles: originalCount,
            relevantChunks: trimmedList.length,
          });
        } else {
          setContextStats(null);
        }
      }

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

      addMessage(activeSessionId, {
        id: streamingMessageId,
        sessionId: activeSessionId,
        jobId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      });

      const response = await nvidiaNimService.generateCodeStream({
        ...request,
        signal: controller.signal,
        onChunk: (chunk) => {
          setStreamingContent((previous) => {
            const nextContent = previous + chunk;
            useAppStore.setState((state) => {
              const session = state.sessions[activeSessionId];
              if (!session) return state;

              return {
                sessions: {
                  ...state.sessions,
                  [activeSessionId]: {
                    ...session,
                    messages: session.messages.map((message) =>
                      message.id === streamingMessageId
                        ? { ...message, content: nextContent }
                        : message
                    ),
                  },
                },
              };
            });
            return nextContent;
          });
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
        message: `AI generated response using ${requestPreset?.name || 'Default'} preset`,
        source: 'ai_execution',
      });

      useAppStore.setState((state) => {
        const session = state.sessions[activeSessionId];
        if (!session) return state;

        return {
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...session,
              messages: session.messages.map((message) =>
                message.id === streamingMessageId
                  ? { ...message, content: response.explanation, changes: response.changes }
                  : message
              ),
            },
          },
        };
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
      const isAbort = error instanceof Error && (error.name === 'CanceledError' || error.name === 'AbortError');

      useAppStore.setState((state) => {
        const session = state.sessions[activeSessionId];
        if (!session) return state;
        return {
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...session,
              messages: session.messages.filter((message) => message.id !== streamingMessageId),
            },
          },
        };
      });

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
      setStreamingContent('');
      setActiveStreamingJobId((current) => (current === jobId ? null : current));
      decrementSessionRequests(activeSessionId);
    }
  };

  const executeUltraMode = async (userPrompt: string) => {
    const promptToUse = userPrompt.trim();
    setPrompt(''); // Clear the input immediately
    startUltraMode(4); // Now we have 4 steps
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
      message: `[Ultra] Step 1/4 started: ${ultraSteps[0].name}`,
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
      message: `[Ultra] Step 1/4 completed: ${ultraSteps[0].name}`,
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
      message: `[Ultra] Step 2/4 started: ${ultraSteps[1].name}`,
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
      message: `[Ultra] Step 2/4 completed: ${ultraSteps[1].name}`,
      source: 'ai_execution',
    });
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Step 3: Code Testing & Validation
    updateUltraModeStep(3, ultraSteps[2].name);
    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      timestamp: new Date(),
      type: 'info',
      message: `[Ultra] Step 3/4 started: ${ultraSteps[2].name}`,
      source: 'ai_execution',
    });

    // Execute code testing
    try {
      const testResult = await codeExecutor.runTests(projectPath || process.cwd());

      addLog({
        id: crypto.randomUUID(),
        sessionId: activeSessionId,
        timestamp: new Date(),
        type: testResult.success ? 'success' : 'warning',
        message: testResult.success
          ? `[Ultra] Code testing completed successfully`
          : `[Ultra] Code testing found issues`,
        details: testResult.logs.join('\n'),
        source: 'program_run',
      });

      // If tests failed, add them as bugs
      if (!testResult.success || testResult.logs.some(log => log.includes('ERROR') || log.includes('FAIL'))) {
        addBug({
          id: crypto.randomUUID(),
          title: 'Test Failures Detected',
          description: `Code testing revealed issues:\n${testResult.logs.join('\n')}`,
          status: 'open',
          severity: 'high',
          source: 'program_error',
          relatedFiles: [],
          relatedTasks: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      addLog({
        id: crypto.randomUUID(),
        sessionId: activeSessionId,
        timestamp: new Date(),
        type: 'error',
        message: `[Ultra] Code testing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        source: 'program_run',
      });
    }

    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      timestamp: new Date(),
      type: 'success',
      message: `[Ultra] Step 3/4 completed: ${ultraSteps[2].name}`,
      source: 'ai_execution',
    });
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Step 4: Bug Detection & Fixing
    updateUltraModeStep(4, ultraSteps[3].name);
    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      timestamp: new Date(),
      type: 'info',
      message: `[Ultra] Step 4/4 started: ${ultraSteps[3].name}`,
      source: 'ai_execution',
    });

    await runRequest({
      prompt: `User Request: ${promptToUse}\n\nAfter implementing and testing the changes above, ${ultraSteps[3].prompt}`,
      requestType: 'debugging',
      presetId: ultraSteps[3].presetId,
    });
    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      timestamp: new Date(),
      type: 'success',
      message: `[Ultra] Step 4/4 completed: ${ultraSteps[3].name}`,
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
      message: '[Ultra] Ultra Mode completed successfully (4/4 steps)',
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
                  <span className={`${isCurrent ? 'text-yellow-200 dark:text-yellow-200 light:text-yellow-800' : isDone ? 'text-neutral-200' : 'text-neutral-400'}`}>
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
                  <p key={log.id} className="text-[11px]">
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
          </div>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe what you want to build or modify with AI assistance..."
            className="min-h-16 w-full resize-none bg-transparent px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            rows={2}
            disabled={ultraModeActive}
          />
          <div className="border-t border-neutral-800 px-3 py-1.5 text-[11px] text-neutral-500">
            {prompt.length} chars / ~{Math.ceil(prompt.length / 4)} tokens
          </div>
        </div>

        <button
          type="button"
          onClick={() => executeUltraMode(prompt)}
          disabled={ultraModeActive || !projectPath || !prompt.trim()}
          aria-label="Run Ultra Mode"
          className="flex h-9 items-center gap-1.5 rounded-lg border border-purple-500/60 bg-purple-500/15 px-2.5 text-xs font-medium text-purple-700 dark:text-purple-200 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-50"
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
        {activeStreamingJobId && (
          <button
            type="button"
            onClick={() => executionManager.abort(activeStreamingJobId)}
            aria-label="Stop current AI generation"
            className="h-9 rounded-lg border border-rose-400 bg-rose-50 px-2.5 text-xs font-medium light:text-rose-700 text-rose-700 dark:text-rose-200 dark:border-rose-500/70 dark:bg-rose-500/15 transition hover:bg-rose-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            Стоп
          </button>
        )}
      </form>
      {contextStats && (
        <div className="mt-2 text-[11px] text-cyan-700 dark:text-cyan-300">
          Контекст: {contextStats.totalFiles} файлов → {contextStats.relevantChunks} релевантных фрагментов
        </div>
      )}
      {activeStreamingJobId && (
        <div className="mt-2 flex items-center justify-between rounded-md border border-blue-500/20 bg-blue-500/5 px-2 py-1 text-[11px] text-blue-700 dark:text-blue-200">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-300" />
            Streaming response…
          </span>
          <span>
            ~{Math.ceil(streamingContent.length / 4)} tokens / {streamingContent.length} chars
          </span>
        </div>
      )}
    </div>
  );
}
