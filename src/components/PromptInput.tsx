// src/components/PromptInput.tsx

"use client";

import { useState } from 'react';
import { Send, Settings, Zap } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { nvidiaNimService } from '@/lib/nvidia-nim';
import { DevelopmentTask, PromptRequest } from '@/types';

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
    ultraModeActive,
    ultraModeStep,
    ultraModeTotalSteps,
    ultraModeCurrentStep,
    startUltraMode,
    updateUltraModeStep,
    endUltraMode
  } = useAppStore();

  const executeUltraMode = async () => {
    const ultraSteps = [
      {
        name: 'Code Analysis & Planning',
        presetId: 'analyze',
        prompt: 'Analyze the entire codebase comprehensively. Identify architectural issues, code quality problems, potential improvements, and create a detailed development plan with prioritized tasks. Focus on scalability, maintainability, and best practices.'
      },
      {
        name: 'Task Implementation',
        presetId: 'develop',
        prompt: 'Execute all the tasks identified in the previous analysis. Implement the improvements, refactor code where needed, and enhance the overall codebase quality. Make concrete code changes.'
      },
      {
        name: 'Bug Detection & Fixing',
        presetId: 'debug',
        prompt: 'Perform a thorough code review to detect any bugs, security issues, or runtime errors. Fix all identified problems and ensure the code is production-ready.'
      },
      {
        name: 'Final Verification',
        presetId: 'analyze',
        prompt: 'Verify that all changes are working correctly, no new issues were introduced, and the codebase meets high quality standards. Provide a summary of all improvements made.'
      }
    ];

    startUltraMode(ultraSteps.length);

    for (let i = 0; i < ultraSteps.length; i++) {
      const step = ultraSteps[i];
      updateUltraModeStep(i + 1, step.name);

      // Set the appropriate preset
      const preset = promptPresets.find(p => p.id === step.presetId);
      if (preset) {
        setActivePreset(preset);
      }

      try {
        const currentFile = openFiles.find(f => f.path === activeFile);

        // Load project files
        let projectFiles = openFiles.map(f => ({
          path: f.path,
          content: f.content
        }));

        if (projectPath) {
          try {
            const projectResponse = await fetch('/api/project/files', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
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
          prompt: step.prompt,
          preset: preset || undefined,
          generalPrompt,
          context: {
            currentFile: activeFile || undefined,
            selectedCode: currentFile?.content,
            projectFiles
          },
        };

        const response = await nvidiaNimService.generateCode(request);

        const assistantMessage = {
          role: 'assistant' as const,
          content: `[${step.name}] ${response.explanation}`,
          timestamp: new Date(),
          changes: response.changes,
        };

        addMessage(assistantMessage);

        // Apply code changes if any
        if (response.changes && response.changes.length > 0) {
          response.changes.forEach(change => {
            console.log('Applying change to:', change.filePath);
          });
        }

        // Add tasks to the store
        if (response.tasks) {
          response.tasks.forEach(task => {
            addTask(task);
          });
        }

        // Add a small delay between steps
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`Failed to execute ${step.name}:`, error);
        const errorMessage = {
          role: 'assistant' as const,
          content: `[${step.name}] Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          timestamp: new Date(),
        };
        addMessage(errorMessage);
      }
    }

    endUltraMode();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    const userMessage = {
      role: 'user' as const,
      content: prompt,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setIsLoading(true);
    setGenerating(true);

    try {
      const currentFile = openFiles.find(f => f.path === activeFile);

      // Load project files if project path is set
      let projectFiles = openFiles.map(f => ({
        path: f.path,
        content: f.content
      }));

      if (projectPath) {
        try {
          const projectResponse = await fetch('/api/project/files', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
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
          prompt,
          preset: activePreset || undefined,
          generalPrompt,
          context: {
            currentFile: activeFile || undefined,
            selectedCode: currentFile?.content,
            projectFiles
          },
        };

      const response = await nvidiaNimService.generateCode(request);

      const assistantMessage = {
        role: 'assistant' as const,
        content: response.explanation,
        timestamp: new Date(),
        changes: response.changes,
      };

      addMessage(assistantMessage);

      // Apply code changes if any
      if (response.changes && response.changes.length > 0) {
        response.changes.forEach(change => {
          // In a real app, you'd save the changes to the file system
          console.log('Applying change to:', change.filePath);
        });
      }

      // Add tasks to the store
      if (response.tasks) {
        response.tasks.forEach(task => {
          addTask(task);
        });
      }

    } catch (error) {
      console.error('Failed to generate code:', error);
      const errorMessage = {
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error while generating code. Please try again.',
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
      setGenerating(false);
      setPrompt('');
    }
  };

  return (
    <div className="p-4 bg-neutral-800">
      {/* Ultra Mode Progress */}
      {ultraModeActive && (
        <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-yellow-400">Ultra Mode Active</span>
            <span className="text-xs text-neutral-400">
              Step {ultraModeStep} of {ultraModeTotalSteps}
            </span>
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

      {/* Preset Selector */}
      <div className="mb-3 flex items-center gap-2">
        <label className="text-sm text-neutral-400">AI Mode:</label>
        <select
          value={activePreset?.id || ''}
          onChange={(e) => {
            const preset = promptPresets.find(p => p.id === e.target.value);
            if (preset) setActivePreset(preset);
          }}
          className="px-3 py-1 bg-neutral-700 border border-neutral-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading || ultraModeActive}
        >
          {promptPresets.map(preset => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
        {activePreset && (
          <span className="text-xs text-neutral-500 max-w-48 truncate" title={activePreset.description}>
            {activePreset.description}
          </span>
        )}

        {/* Ultra Mode Button */}
        <button
          onClick={executeUltraMode}
          disabled={isLoading || ultraModeActive || !projectPath}
          className="ml-auto px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-neutral-600 disabled:to-neutral-600 disabled:cursor-not-allowed rounded text-sm font-medium flex items-center gap-1 transition-all"
          title={!projectPath ? "Set project path in settings first" : "Execute comprehensive code analysis and improvement"}
        >
          <Zap className="w-4 h-4" />
          Ultra Mode
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
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
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
}