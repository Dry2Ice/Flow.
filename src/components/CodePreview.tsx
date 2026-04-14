// src/components/CodePreview.tsx

"use client";

import { useState, useEffect, useRef } from 'react';
import { Play, Eye, Code, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { codeExecutor } from '@/lib/code-executor';

export function CodePreview() {
  const { openFiles, activeFile, addLog, activeSessionId } = useAppStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [previewMode, setPreviewMode] = useState<'code' | 'preview'>('code');
  const [previewContent, setPreviewContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currentFile = openFiles.find(f => f.path === activeFile);

  useEffect(() => {
    if (currentFile) {
      // Auto-switch to preview mode for HTML files
      const extension = currentFile.path.split('.').pop()?.toLowerCase();
      if (extension === 'html' && previewMode === 'code') {
        setPreviewMode('preview');
      }

      if (previewMode === 'code') {
        setPreviewContent(currentFile.content);
      } else {
        // Generate preview based on file type
        generatePreview(currentFile);
      }
    }
  }, [currentFile, previewMode]);

  const generatePreview = async (file: { path: string; content: string }) => {
    setIsLoading(true);
    try {
      const extension = file.path.split('.').pop()?.toLowerCase();

      if (extension === 'html') {
        // For HTML files, we can render them directly
        setPreviewContent(file.content);
      } else if (extension === 'js' || extension === 'jsx') {
        // For JS files, show formatted code
        setPreviewContent(`// JavaScript Code Preview\n\n${file.content}`);
      } else if (extension === 'ts' || extension === 'tsx') {
        // For TS files, show formatted code
        setPreviewContent(`// TypeScript Code Preview\n\n${file.content}`);
      } else if (extension === 'css') {
        // For CSS files, show formatted styles
        setPreviewContent(`/* CSS Styles Preview */\n\n${file.content}`);
      } else if (extension === 'json') {
        // For JSON files, format and display
        try {
          const parsed = JSON.parse(file.content);
          setPreviewContent(JSON.stringify(parsed, null, 2));
        } catch {
          setPreviewContent(file.content);
        }
      } else {
        // For other files, show raw content
        setPreviewContent(file.content);
      }
    } catch (error) {
      setPreviewContent(`Error generating preview: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };


  const handleIframeLoad = () => {
    iframeRef.current?.contentWindow?.addEventListener('error', (event) => {
      addLog({
        id: crypto.randomUUID(),
        sessionId: activeSessionId,
        timestamp: new Date(),
        type: 'error',
        message: `Preview error: ${event.message}`,
        details: `${event.filename}:${event.lineno}:${event.colno}`,
        source: 'program_run',
      });
    });
  };

  const runCode = async () => {
    if (!currentFile) return;

    setIsLoading(true);
    try {
      const result = await codeExecutor.executeCode(
        currentFile.content,
        currentFile.path,
        {
          files: { [currentFile.path]: currentFile.content },
          entryPoint: currentFile.path
        }
      );

      // Add execution log
      addLog({
        id: crypto.randomUUID(),
        sessionId: activeSessionId,
        timestamp: new Date(),
        type: result.success ? 'success' : 'error',
        message: result.success
          ? `Code executed successfully: ${currentFile.path}`
          : `Code execution failed: ${result.error || 'Unknown error'}`,
        details: result.logs.join('\n'),
        source: 'program_run',
      });

      if (result.success) {
        // For HTML, update the preview content
        if (currentFile.path.endsWith('.html')) {
          setPreviewContent(result.output);
        } else {
          // For other code, show execution results
          setPreviewContent(`// Execution Results for ${currentFile.path}\n\n${result.output}\n\n// Console Output:\n${result.logs.map(log => `// ${log}`).join('\n')}`);
        }
      } else {
        setPreviewContent(`// Execution Error in ${currentFile.path}\n\nError: ${result.error}\n\n// Console Output:\n${result.logs.map(log => `// ${log}`).join('\n')}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
      setPreviewContent(`// Execution Error in ${currentFile?.path}\n\n${errorMessage}`);

      addLog({
        id: crypto.randomUUID(),
        sessionId: activeSessionId,
        timestamp: new Date(),
        type: 'error',
        message: `Code execution failed: ${currentFile?.path}`,
        details: errorMessage,
        source: 'program_run',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-neutral-950/40">
      {/* Preview Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-300">Preview</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewMode('code')}
            className={`rounded-md p-1.5 transition-colors ${
              previewMode === 'code'
                ? 'bg-blue-600 text-white'
                : 'text-neutral-400 hover:text-neutral-300'
            }`}
            title="Code View"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPreviewMode('preview')}
            className={`rounded-md p-1.5 transition-colors ${
              previewMode === 'preview'
                ? 'bg-blue-600 text-white'
                : 'text-neutral-400 hover:text-neutral-300'
            }`}
            title="Preview View"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={runCode}
            disabled={isLoading}
            className="rounded-md p-1.5 text-emerald-300 transition-colors hover:bg-emerald-500/10 hover:text-emerald-200 disabled:text-neutral-500"
            title="Run Code"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto p-3">
        {currentFile ? (
          <div className="h-full">
            {previewMode === 'code' ? (
              <pre className="whitespace-pre-wrap rounded-md border border-neutral-800/80 bg-neutral-950/60 p-3 text-xs text-neutral-300 font-mono">
                {previewContent}
              </pre>
            ) : (
              <div className="h-full">
                {currentFile.path.endsWith('.html') ? (
                  <iframe
                    ref={iframeRef}
                    srcDoc={previewContent}
                    onLoad={handleIframeLoad}
                    className="w-full h-full border-0 bg-white"
                    title="HTML Preview"
                  />
                ) : (
                  <pre className="whitespace-pre-wrap rounded-md border border-neutral-800/80 bg-neutral-950/60 p-3 text-xs text-neutral-300 font-mono">
                    {previewContent}
                  </pre>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-neutral-500">
            <div className="text-center">
              <div className="text-4xl mb-4">👁️</div>
              <p>Select a file to preview</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
