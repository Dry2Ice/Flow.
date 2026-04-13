// src/components/PromptInput.tsx

"use client";

import { useMemo, useState } from 'react';
import { Send, Zap, Square, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { nvidiaNimService } from '@/lib/nvidia-nim';
import { AIRequest, PromptRequest } from '@/types';
import { executionManager } from '@/lib/execution-manager';
import { aiService } from '@/lib/ai-service';

export function PromptInput() {
  const [prompt, setPrompt] = useState('');

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
    aiRequests,
    addAIRequest,
    updateAIRequest,
    currentProject,
    getProjectContext,
  } = useAppStore();

  const sessionRequests = useMemo(
    () => aiRequests.filter((request) => request.sessionId === activeSessionId),
    [aiRequests, activeSessionId]
  );

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

  const executeUltraMode = async () => {
    const ultraSteps = [
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
    ];

    startUltraMode(ultraSteps.length);

    for (let i = 0; i < ultraSteps.length; i++) {
      const step = ultraSteps[i];
      updateUltraModeStep(i + 1, step.name);

      await runRequest({
        prompt: `[${step.name}] ${step.prompt}`,
        requestType: 'analysis',
        presetId: step.presetId,
      });
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    const lastStepPresetId = ultraSteps[ultraSteps.length - 1]?.presetId;
    if (lastStepPresetId) {
      const lastPreset = promptPresets.find((item) => item.id === lastStepPresetId);
      if (lastPreset) setActivePreset(lastPreset);
    }

    endUltraMode();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim() || ultraModeActive) return;

    const nextPrompt = prompt;
    setPrompt('');
    void runRequest({ prompt: nextPrompt });
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
    <div className="p-6 dark:bg-gradient-to-r dark:from-neutral-800 dark:to-neutral-900 light:bg-gradient-to-r light:from-gray-50 light:to-white border-t dark:border-neutral-700/50 light:border-gray-200/50 transition-colors duration-300">
      {ultraModeActive && (
        <div className="mb-4 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl hover-lift animate-fade-in dark:bg-neutral-800/50 light:bg-yellow-50/50 dark:border-yellow-500/30 light:border-yellow-300/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-yellow-400">Ultra Mode Active</span>
            </div>
            <span className="text-xs dark:text-neutral-400 light:text-gray-600 dark:bg-neutral-800 light:bg-white px-2 py-1 rounded-full">
              {ultraModeStep} / {ultraModeTotalSteps}
            </span>
          </div>
          <div className="w-full dark:bg-neutral-700 light:bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-yellow-500 to-orange-500 h-3 rounded-full transition-all duration-500 ease-out shadow-lg"
              style={{ width: `${(ultraModeStep / ultraModeTotalSteps) * 100}%` }}
            />
          </div>
          <p className="text-sm dark:text-neutral-300 light:text-gray-700 font-medium">{ultraModeCurrentStep}</p>
        </div>
      )}

      {/* Preset Segmented Control */}
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-2.5 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <label className="text-sm font-semibold text-neutral-200">AI Mode:</label>
          </div>
          {ultraModeActive && (
            <span className="px-2.5 py-1 bg-yellow-500/20 text-yellow-400 text-[11px] rounded-full border border-yellow-500/30 font-medium animate-pulse">
              🔒 Locked during Ultra Mode
            </span>
          )}
        </div>
        <div
          role="radiogroup"
          aria-label="AI mode presets"
          className="flex flex-wrap items-center gap-2 rounded-xl border dark:border-neutral-700/60 light:border-gray-300/70 dark:bg-neutral-900/45 light:bg-white/70 p-2"
        >
          {promptPresets.map((preset, index) => (
            <button
              key={preset.id}
              onClick={() => !ultraModeActive && setActivePreset(preset)}
              disabled={ultraModeActive}
              role="radio"
              aria-checked={activePreset?.id === preset.id}
              aria-label={`${preset.name}: ${preset.description}`}
              className={`relative inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left transition-all duration-200 group animate-fade-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900 light:focus-visible:ring-offset-gray-100 ${
                activePreset?.id === preset.id
                  ? 'dark:border-blue-400/90 dark:bg-blue-500/15 dark:text-white light:border-blue-500 light:bg-blue-50 light:text-blue-900 dark:focus-visible:ring-blue-400 light:focus-visible:ring-blue-500'
                  : 'dark:border-neutral-600/60 dark:bg-neutral-800/40 dark:text-neutral-200 light:border-gray-300/80 light:bg-gray-100/70 light:text-gray-700 dark:hover:border-neutral-500 dark:hover:bg-neutral-700/60 light:hover:border-gray-400 light:hover:bg-gray-200/80 dark:focus-visible:ring-neutral-300 light:focus-visible:ring-gray-500'
              } ${ultraModeActive ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}`}
              style={{animationDelay: `${index * 0.1}s`}}
            >
              <div className={`h-2.5 w-2.5 rounded-full transition-all duration-200 ${
                  preset.id === 'debug' ? 'bg-gradient-to-r from-red-400 to-pink-400 shadow-red-400/50 shadow-lg' :
                  preset.id === 'analyze' ? 'bg-gradient-to-r from-blue-400 to-cyan-400 shadow-blue-400/50 shadow-lg' :
                  'bg-gradient-to-r from-green-400 to-emerald-400 shadow-green-400/50 shadow-lg'
                } ${activePreset?.id === preset.id ? 'animate-pulse' : ''}`} />
              <span className={`truncate text-xs font-semibold leading-none transition-colors ${
                activePreset?.id === preset.id
                  ? 'dark:text-white light:text-blue-900'
                  : 'dark:text-neutral-200 dark:group-hover:text-white light:text-gray-700 light:group-hover:text-blue-900'
              }`}>
                {preset.name}
              </span>
              {activePreset?.id === preset.id && (
                <span className="ml-auto inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-300">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Ultra Mode Button */}
        <div className="flex justify-end mt-4">
          <button
            onClick={executeUltraMode}
            disabled={ultraModeActive || !projectPath}
            className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-all duration-300 hover-lift hover-glow ${
              ultraModeActive
                ? 'dark:bg-gradient-to-r dark:from-yellow-600 dark:to-orange-600 light:bg-gradient-to-r light:from-yellow-400 light:to-orange-400 cursor-not-allowed opacity-75'
                : 'dark:bg-gradient-to-r dark:from-purple-600 dark:via-pink-600 dark:to-purple-700 dark:hover:from-purple-700 dark:hover:via-pink-700 dark:hover:to-purple-800 light:bg-gradient-to-r light:from-purple-500 light:via-pink-500 light:to-purple-600 light:hover:from-purple-600 light:hover:via-pink-600 light:hover:to-purple-700 shadow-xl hover:shadow-purple-500/30'
            }`}
          >
            <div className={`p-1 rounded-lg ${ultraModeActive ? 'bg-yellow-400/20' : 'bg-white/20'}`}>
              <Zap className={`w-4 h-4 ${ultraModeActive ? 'text-yellow-300' : 'text-white'} transition-transform duration-200 hover:scale-110`} />
            </div>
            <span className="text-white">
              {ultraModeActive ? 'Ultra Mode Running...' : 'Launch Ultra Mode'}
            </span>
            {!ultraModeActive && (
              <div className="ml-2 flex items-center gap-1">
                <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                <div className="w-1 h-1 bg-white rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-1 h-1 bg-white rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
            )}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2.5 animate-fade-in">
        <div className="flex-1 relative">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe what you want to build or modify with AI assistance..."
            className={`w-full p-3 text-sm dark:bg-neutral-800/50 light:bg-white/50 border-2 rounded-xl resize-none transition-all duration-300 focus:outline-none focus:ring-2 backdrop-blur-sm ${
              ultraModeActive
                ? 'dark:border-neutral-600 light:border-gray-300 cursor-not-allowed opacity-50'
                : 'dark:border-neutral-600/50 dark:focus:border-blue-400 dark:focus:bg-neutral-800 light:border-gray-300/50 light:focus:border-blue-500 light:focus:bg-white dark:hover:border-neutral-500 dark:hover:bg-neutral-800/70 light:hover:border-gray-400 light:hover:bg-white/70'
            }`}
            rows={3}
            disabled={ultraModeActive}
          />
          {!ultraModeActive && (
            <div className="absolute bottom-3 right-3 text-xs dark:text-neutral-500 light:text-gray-500">
              {prompt.length}/1000
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={ultraModeActive || !prompt.trim()}
          aria-label="Send prompt to AI assistant"
          className={`group h-11 px-3.5 rounded-xl flex items-center gap-1.5 transition-all duration-200 hover-lift font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900 light:focus-visible:ring-offset-gray-100 ${
            ultraModeActive || !prompt.trim()
              ? 'dark:bg-neutral-700 light:bg-gray-300 cursor-not-allowed opacity-50'
              : 'dark:bg-gradient-to-r dark:from-blue-600 dark:to-purple-600 dark:hover:from-blue-700 dark:hover:to-purple-700 light:bg-gradient-to-r light:from-blue-500 light:to-purple-500 light:hover:from-blue-600 light:hover:to-purple-600 shadow-md hover:shadow-blue-500/30 dark:focus-visible:ring-blue-400 light:focus-visible:ring-blue-500'
          }`}
        >
          <Send className={`w-4 h-4 transition-transform duration-200 ${!ultraModeActive && prompt.trim() ? 'group-hover:scale-110' : ''}`} />
          <span className="hidden md:inline dark:text-white light:text-white">Send</span>
        </button>
      </form>

      {/* Request History */}
      <div className="mt-4 dark:bg-neutral-800/30 light:bg-white/30 rounded-xl p-4 backdrop-blur-sm dark:border-neutral-700/30 light:border-gray-200/30 border">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium dark:text-neutral-300 light:text-gray-700">Recent Requests</span>
          <span className="text-xs dark:text-neutral-500 light:text-gray-500 ml-auto">{sessionRequests.length} total</span>
        </div>
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
          {sessionRequests.length === 0 ? (
            <div className="text-center py-4 dark:text-neutral-500 light:text-gray-500 text-sm">
              No requests yet. Start by sending a prompt!
            </div>
          ) : (
            sessionRequests.slice().reverse().slice(0, 5).map((request, index) => (
              <div
                key={request.id}
                className={`flex items-center justify-between rounded-lg border backdrop-blur-sm px-3 py-2 text-sm transition-all duration-200 hover-scale animate-slide-in ${
                  request.status === 'completed' ? 'dark:border-green-500/30 dark:bg-green-500/5 light:border-green-300/30 light:bg-green-50/50' :
                  request.status === 'running' ? 'dark:border-blue-500/30 dark:bg-blue-500/5 light:border-blue-300/30 light:bg-blue-50/50' :
                  request.status === 'failed' ? 'dark:border-red-500/30 dark:bg-red-500/5 light:border-red-300/30 light:bg-red-50/50' :
                  'dark:border-neutral-700/50 dark:bg-neutral-800/30 light:border-gray-300/50 light:bg-gray-100/30'
                }`}
                style={{animationDelay: `${index * 0.05}s`}}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    request.status === 'completed' ? 'bg-green-400 shadow-green-400/50 shadow-lg' :
                    request.status === 'running' ? 'bg-blue-400 animate-pulse shadow-blue-400/50 shadow-lg' :
                    request.status === 'failed' ? 'bg-red-400 shadow-red-400/50 shadow-lg' :
                    'bg-yellow-400 shadow-yellow-400/50 shadow-lg'
                  }`} />
                  <span className="truncate dark:text-neutral-300 light:text-gray-700 font-medium" title={request.prompt}>
                    {request.prompt}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${
                    request.status === 'completed' ? 'dark:bg-green-500/20 dark:text-green-400 light:bg-green-100 light:text-green-700' :
                    request.status === 'running' ? 'dark:bg-blue-500/20 dark:text-blue-400 light:bg-blue-100 light:text-blue-700' :
                    request.status === 'failed' ? 'dark:bg-red-500/20 dark:text-red-400 light:bg-red-100 light:text-red-700' :
                    'dark:bg-yellow-500/20 dark:text-yellow-400 light:bg-yellow-100 light:text-yellow-700'
                  }`}>
                    {request.status}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => cancelJob(request.jobId)}
                      disabled={request.status !== 'running'}
                      className="p-1 rounded dark:hover:bg-neutral-700 light:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Cancel job"
                    >
                      <Square className="w-3 h-3 text-yellow-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => retryJob(request.jobId)}
                      disabled={request.status === 'running'}
                      className="p-1 rounded dark:hover:bg-neutral-700 light:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Retry job"
                    >
                      <RotateCcw className="w-3 h-3 text-blue-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
