// src/components/CodeEditor.tsx

"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { Save, RefreshCcw } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useAppStore } from '@/lib/store';

export function CodeEditor() {
  const editorRef = useRef<any>(null);
  const { activeFile, openFiles, updateFileContent } = useAppStore();
  const currentProject = useAppStore(state => state.currentProject);
  const openFile = useAppStore(state => state.openFile);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isReloading, setIsReloading] = useState(false);

  const currentFile = openFiles.find(f => f.path === activeFile);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const handleChange = (value: string | undefined) => {
    if (activeFile && value !== undefined) {
      updateFileContent(activeFile, value);
    }
  };

  const reloadFile = useCallback(async () => {
    if (!currentProject || !currentFile) {
      return;
    }

    setIsReloading(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/project/file/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: currentProject.path,
          filePath: currentFile.path,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reload file');
      }

      openFile(currentFile.path, data.content, data.lastModifiedMs);
      setSaveState('idle');
      setSaveMessage('File reloaded from disk');
    } catch (error) {
      setSaveState('error');
      setSaveMessage(error instanceof Error ? error.message : 'Failed to reload file');
    } finally {
      setIsReloading(false);
    }
  }, [currentFile, currentProject, openFile]);

  const saveFile = useCallback(async () => {
    if (!currentProject || !currentFile) {
      return;
    }

    setSaveState('saving');
    setSaveMessage(null);

    try {
      const response = await fetch('/api/project/file/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: currentProject.path,
          filePath: currentFile.path,
          content: currentFile.content,
          expectedLastModifiedMs: currentFile.lastModifiedMs,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.reason === 'write_conflict') {
          setSaveState('error');
          setSaveMessage('Write conflict: file changed on disk. Reload and try again.');
          return;
        }

        throw new Error(data.error || 'Failed to save file');
      }

      openFile(currentFile.path, currentFile.content, data.lastModifiedMs);
      setSaveState('saved');
      setSaveMessage('Saved');

      setTimeout(() => {
        setSaveState(previous => (previous === 'saved' ? 'idle' : previous));
      }, 1500);
    } catch (error) {
      setSaveState('error');
      setSaveMessage(error instanceof Error ? error.message : 'Failed to save file');
    }
  }, [currentFile, currentProject, openFile]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveFile();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [saveFile]);

  useEffect(() => {
    setSaveState('idle');
    setSaveMessage(null);
  }, [activeFile]);

  // Get language from file extension
  const getLanguage = (filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'py':
        return 'python';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      default:
        return 'plaintext';
    }
  };

  return (
    <div className="h-full w-full">
      {currentFile ? (
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2 text-xs text-neutral-300">
            <div className="truncate">{currentFile.path}</div>
            <div className="flex items-center gap-2">
              {saveMessage && (
                <span className={saveState === 'error' ? 'text-red-400' : 'text-emerald-400'}>
                  {saveMessage}
                </span>
              )}
              <button
                type="button"
                onClick={reloadFile}
                disabled={isReloading}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900/70 px-2 py-1 hover:border-neutral-500 disabled:opacity-50"
                title="Reload from disk"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Reload
              </button>
              <button
                type="button"
                onClick={saveFile}
                disabled={saveState === 'saving'}
                className="inline-flex items-center gap-1 rounded-md border border-sky-500/40 bg-sky-500/15 px-2 py-1 text-sky-100 hover:bg-sky-500/25 disabled:opacity-50"
                title="Save file (Ctrl/Cmd+S)"
              >
                <Save className="h-3.5 w-3.5" />
                {saveState === 'saving' ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <Editor
              height="100%"
              language={getLanguage(currentFile.path)}
              value={currentFile.content}
              onChange={handleChange}
              onMount={handleEditorDidMount}
              theme="vs-dark"
              options={{
                minimap: { enabled: true, size: 'proportional' },
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                renderWhitespace: 'selection',
                bracketPairColorization: { enabled: true },
                guides: {
                  bracketPairs: true,
                  indentation: true
                },
                suggest: {
                  showKeywords: true,
                  showSnippets: true
                },
                quickSuggestions: {
                  other: true,
                  comments: true,
                  strings: true
                },
                parameterHints: { enabled: true },
                hover: { enabled: true },
                contextmenu: true,
                mouseWheelZoom: true,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                renderLineHighlight: 'all',
                selectionHighlight: true,
                occurrencesHighlight: 'singleFile',
                codeLens: true,
                folding: true,
                foldingHighlight: true,
                showFoldingControls: 'mouseover',
                matchBrackets: 'always',
                autoClosingBrackets: 'always',
                autoClosingQuotes: 'always',
                autoSurround: 'languageDefined',
                trimAutoWhitespace: true,
                formatOnPaste: true,
                formatOnType: true
              }}
            />
          </div>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-neutral-500">
          <div className="text-center">
            <div className="text-4xl mb-4">📁</div>
            <p>Select a file to start coding</p>
          </div>
        </div>
      )}
    </div>
  );
}
