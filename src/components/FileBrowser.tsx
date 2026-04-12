// src/components/FileBrowser.tsx

"use client";

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Code, FileText, Settings, Database, Image as ImageIcon, Save, RotateCcw, History, GitCommit, Undo2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { FileNode } from '@/types';

export function FileBrowser() {
  const {
    currentProject,
    openFile,
    activeFile,
    commits,
    initializeGitRepo,
    saveActiveFile,
    loadCommitHistory,
    rollbackToCommit,
    restoreActiveFile
  } = useAppStore();
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selectedCommit, setSelectedCommit] = useState('');

  useEffect(() => {
    if (currentProject && !currentProject.isDemo) {
      void loadCommitHistory();
    }
  }, [currentProject, loadCommitHistory]);

  useEffect(() => {
    if (commits.length > 0 && !selectedCommit) {
      setSelectedCommit(commits[0].hash);
    }
  }, [commits, selectedCommit]);

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'cs':
      case 'php':
      case 'rb':
      case 'go':
      case 'rs':
        return <Code className="w-4 h-4 mr-2 text-blue-400" />;
      case 'html':
      case 'htm':
      case 'xml':
        return <FileText className="w-4 h-4 mr-2 text-orange-400" />;
      case 'css':
      case 'scss':
      case 'sass':
      case 'less':
        return <FileText className="w-4 h-4 mr-2 text-blue-500" />;
      case 'json':
        return <Database className="w-4 h-4 mr-2 text-yellow-400" />;
      case 'md':
        return <FileText className="w-4 h-4 mr-2 text-gray-400" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <ImageIcon className="w-4 h-4 mr-2 text-green-400" />;
      case 'config':
      case 'conf':
      case 'ini':
      case 'toml':
      case 'yaml':
      case 'yml':
        return <Settings className="w-4 h-4 mr-2 text-gray-500" />;
      default:
        return <File className="w-4 h-4 mr-2 text-neutral-400" />;
    }
  };

  const toggleDir = (path: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);
  };

  const handleFileClick = async (file: FileNode) => {
    if (file.type !== 'file') {
      return;
    }

    try {
      if (!currentProject || currentProject.isDemo) {
        const content = `// ${file.name}\n\n// This is placeholder content for ${file.name}`;
        openFile(file.path, content);
        return;
      }

      const response = await fetch('/api/project/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: currentProject.path,
          filePath: file.path,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load file');
      }

      openFile(file.path, data.content ?? '', data.lastModifiedMs);
    } catch (error) {
      console.error('Failed to load file:', error);
    }
  };

  const renderFileNode = (node: FileNode, depth = 0) => {
    const isExpanded = expandedDirs.has(node.path);

    return (
      <div key={node.path}>
        <div
          className={`flex items-center py-1 px-2 hover:bg-neutral-700 cursor-pointer text-sm group ${
            depth > 0 ? 'ml-4' : ''
          }`}
          onClick={() => node.type === 'directory' ? toggleDir(node.path) : handleFileClick(node)}
        >
          {node.type === 'directory' ? (
            <>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 mr-1" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-1" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 mr-2 text-blue-400" />
              ) : (
                <Folder className="w-4 h-4 mr-2 text-blue-400" />
              )}
            </>
          ) : (
            <>
              <div className="w-4 h-4 mr-1" />
              {getFileIcon(node.name)}
            </>
          )}
          <span className="truncate flex-1">{node.name}</span>

          {/* File metadata on hover */}
          {node.type === 'file' && (
            <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-neutral-500">
              {/* This would show file size, lines, etc. if we had metadata */}
            </div>
          )}
        </div>

        {node.type === 'directory' && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderFileNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!currentProject) {
    return (
      <div className="p-4 text-neutral-500">
        <p>No project selected</p>
      </div>
    );
  }

  return (
    <div className="p-2">
      <h3 className="text-sm font-semibold mb-2 text-neutral-300">
        {currentProject.name}
      </h3>
      {!currentProject.isDemo && (
        <div className="space-y-2 mb-3 pb-3 border-b border-neutral-700/70">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => void initializeGitRepo()}
              className="px-2 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded text-xs flex items-center justify-center gap-1"
            >
              <GitCommit className="w-3.5 h-3.5" />
              Init Repo
            </button>
            <button
              onClick={() => void loadCommitHistory()}
              className="px-2 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded text-xs flex items-center justify-center gap-1"
            >
              <History className="w-3.5 h-3.5" />
              History
            </button>
            <button
              onClick={() => void saveActiveFile()}
              disabled={!activeFile}
              className="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:text-neutral-500 rounded text-xs flex items-center justify-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
            <button
              onClick={() => void restoreActiveFile()}
              disabled={!activeFile}
              className="px-2 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-neutral-700 disabled:text-neutral-500 rounded text-xs flex items-center justify-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore
            </button>
          </div>

          <div className="flex gap-2">
            <select
              value={selectedCommit}
              onChange={(event) => setSelectedCommit(event.target.value)}
              className="flex-1 px-2 py-1 bg-neutral-700 border border-neutral-600 rounded text-xs"
            >
              <option value="">Select commit…</option>
              {commits.map((commit) => (
                <option key={commit.hash} value={commit.hash}>
                  {commit.hash.slice(0, 7)} — {commit.message}
                </option>
              ))}
            </select>
            <button
              onClick={() => selectedCommit && void rollbackToCommit(selectedCommit)}
              disabled={!selectedCommit}
              className="px-2 py-1 bg-red-600 hover:bg-red-700 disabled:bg-neutral-700 disabled:text-neutral-500 rounded text-xs flex items-center gap-1"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Rollback
            </button>
          </div>
        </div>
      )}
      <div className="space-y-1">
        {currentProject.files.map(file => renderFileNode(file))}
      </div>
    </div>
  );
}
