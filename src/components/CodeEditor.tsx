// src/components/CodeEditor.tsx

'use client';

import { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useAppStore } from '@/lib/store';

export function CodeEditor() {
  const editorRef = useRef<any>(null);
  const { activeFile, openFiles, updateFileContent } = useAppStore();

  const currentFile = openFiles.find(f => f.path === activeFile);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
  };

  const handleChange = (value: string | undefined) => {
    if (activeFile && value !== undefined) {
      updateFileContent(activeFile, value);
    }
  };

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
        <Editor
          height="100%"
          language={getLanguage(currentFile.path)}
          value={currentFile.content}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            wordWrap: 'on',
            automaticLayout: true,
          }}
        />
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