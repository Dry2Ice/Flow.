// src/components/PromptInput.tsx

'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { nvidiaNimService } from '@/lib/nvidia-nim';
import { DevelopmentTask } from '@/types';

export function PromptInput() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { addMessage, setGenerating, activeFile, openFiles, addTask } = useAppStore();

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

      const response = await nvidiaNimService.generateCode({
        prompt,
        context: {
          currentCode: currentFile?.content,
          filePath: activeFile || undefined,
        },
      });

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
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to build or modify..."
            className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
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