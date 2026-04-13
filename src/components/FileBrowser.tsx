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
          className={`group flex items-center rounded-md px-2 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800/80 ${
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
    <div className="p-3">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
        {currentProject.name}
      </h3>
      {!currentProject.isDemo && (
        <div className="mb-3 space-y-2 border-b border-neutral-700/70 pb-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => void initializeGitRepo()}
              className="flex items-center justify-center gap-1 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs hover:border-neutral-500"
            >
              <GitCommit className="w-3.5 h-3.5" />
              Init Repo
            </button>
            <button
              onClick={() => void loadCommitHistory()}
              className="flex items-center justify-center gap-1 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs hover:border-neutral-500"
            >
              <History className="w-3.5 h-3.5" />
              History
            </button>
            <button
              onClick={() => void saveActiveFile()}
              disabled={!activeFile}
              className="flex items-center justify-center gap-1 rounded-md border border-sky-500/40 bg-sky-500/15 px-2 py-1.5 text-xs text-sky-200 hover:bg-sky-500/25 disabled:border-neutral-700 disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
            <button
              onClick={() => void restoreActiveFile()}
              disabled={!activeFile}
              className="flex items-center justify-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-1.5 text-xs text-amber-200 hover:bg-amber-500/25 disabled:border-neutral-700 disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore
            </button>
          </div>

          <div className="flex gap-2">
            <select
              value={selectedCommit}
              onChange={(event) => setSelectedCommit(event.target.value)}
              className="flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs"
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
              className="flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/15 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/25 disabled:border-neutral-700 disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Rollback
            </button>
          </div>
        </div>
      )}
      <div className="space-y-0.5">
        {currentProject.files.map(file => renderFileNode(file))}
      </div>
    </div>
  );
}
