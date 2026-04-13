// src/components/CodePreview.tsx

"use client";

import { useState, useEffect, useRef } from 'react';
import { Play, Eye, Code, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/lib/store';

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
      // In a real implementation, you might want to run the code in a sandbox
      // For now, just show a message
      setPreviewContent(`// Code execution simulation for ${currentFile.path}\n\n// This would execute the code in a safe environment\n\n// Result: Code executed successfully`);
    } catch (error) {
      setPreviewContent(`Error running code: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full bg-neutral-900 flex flex-col">
      {/* Preview Header */}
      <div className="flex items-center justify-between p-3 border-b border-neutral-700">
        <h3 className="text-sm font-medium text-neutral-200">Preview</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewMode('code')}
            className={`p-1 rounded transition-colors ${
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
            className={`p-1 rounded transition-colors ${
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
            className="p-1 text-green-400 hover:text-green-300 disabled:text-neutral-500 transition-colors"
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
      <div className="flex-1 overflow-auto p-4">
        {currentFile ? (
          <div className="h-full">
            {previewMode === 'code' ? (
              <pre className="text-sm text-neutral-300 whitespace-pre-wrap font-mono">
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
                  <pre className="text-sm text-neutral-300 whitespace-pre-wrap font-mono">
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