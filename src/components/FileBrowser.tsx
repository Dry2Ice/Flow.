// src/components/FileBrowser.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Code,
  Database,
  File,
  FileText,
  Folder,
  FolderOpen,
  GitCommit,
  History,
  Image as ImageIcon,
  RotateCcw,
  Save,
  Settings,
  Undo2,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { FileNode } from '@/types';
import { FileContextMenu } from './FileContextMenu';

export function FileBrowser() {
  const {
    currentProject,
    openFile,
    activeFile,
    gitInitialized,
    commits,
    initializeGitRepo,
    saveActiveFile,
    loadCommitHistory,
    rollbackToCommit,
    restoreActiveFile,
  } = useAppStore();

  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selectedCommit, setSelectedCommit] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [gitStatus, setGitStatus] = useState<{
    modified: string[];
    not_added: string[];
    deleted: string[];
  } | null>(null);

  useEffect(() => {
    if (currentProject && !currentProject.isDemo) {
      void loadCommitHistory();
    }
  }, [currentProject, loadCommitHistory]);

  const loadGitStatus = async () => {
    const projectPath = currentProject?.path;
    if (!projectPath || !gitInitialized || currentProject?.isDemo) {
      setGitStatus(null);
      return;
    }

    try {
      const res = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', projectPath }),
      });
      const data = await res.json();
      if (data.success) {
        setGitStatus({
          modified: Array.isArray(data.modified) ? data.modified : [],
          not_added: Array.isArray(data.not_added) ? data.not_added : [],
          deleted: Array.isArray(data.deleted) ? data.deleted : [],
        });
      }
    } catch {
      // non-critical
    }
  };

  useEffect(() => {
    void loadGitStatus();
  }, [currentProject?.path, currentProject?.isDemo, gitInitialized]);

  useEffect(() => {
    if (commits.length > 0 && !selectedCommit) {
      setSelectedCommit(commits[0].hash);
    }
  }, [commits, selectedCommit]);

  const refreshFileTree = async () => {
    if (!currentProject || currentProject.isDemo) {
      return;
    }

    const response = await fetch('/api/project/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath: currentProject.path }),
    });

    const data = await response.json();
    if (data.files) {
      useAppStore.getState().updateProject({ files: data.files });
      await loadGitStatus();
    }
  };

  const flattenFileTree = (nodes: FileNode[]): FileNode[] => {
    const files: FileNode[] = [];

    for (const node of nodes) {
      if (node.type === 'file') {
        files.push(node);
      }

      if (node.children?.length) {
        files.push(...flattenFileTree(node.children));
      }
    }

    return files;
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredFiles = useMemo(() => {
    if (!currentProject || !normalizedSearch) {
      return [];
    }

    return flattenFileTree(currentProject.files).filter((node) => node.name.toLowerCase().includes(normalizedSearch));
  }, [currentProject, normalizedSearch]);

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
        return <Code className="mr-2 h-4 w-4 text-blue-400" />;
      case 'html':
      case 'htm':
      case 'xml':
        return <FileText className="mr-2 h-4 w-4 text-orange-400" />;
      case 'css':
      case 'scss':
      case 'sass':
      case 'less':
        return <FileText className="mr-2 h-4 w-4 text-blue-500" />;
      case 'json':
        return <Database className="mr-2 h-4 w-4 text-yellow-400" />;
      case 'md':
        return <FileText className="mr-2 h-4 w-4 text-gray-400" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <ImageIcon className="mr-2 h-4 w-4 text-green-400" />;
      case 'config':
      case 'conf':
      case 'ini':
      case 'toml':
      case 'yaml':
      case 'yml':
        return <Settings className="mr-2 h-4 w-4 text-gray-500" />;
      default:
        return <File className="mr-2 h-4 w-4 text-neutral-400" />;
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

  const handleNewFile = async (parentPath: string) => {
    if (!currentProject) {
      return;
    }

    const name = window.prompt('New file name:');
    if (!name) {
      return;
    }

    await fetch('/api/project/file/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath: currentProject.path,
        filePath: `${parentPath}/${name}`,
        content: '',
      }),
    });

    await refreshFileTree();
  };

  const handleNewFolder = async (parentPath: string) => {
    if (!currentProject) {
      return;
    }

    const name = window.prompt('New folder name:');
    if (!name) {
      return;
    }

    await fetch('/api/project/file/mkdir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath: currentProject.path,
        dirPath: `${parentPath}/${name}`,
      }),
    });

    await refreshFileTree();
  };

  const handleRename = async (node: FileNode) => {
    if (!currentProject) {
      return;
    }

    setRenamingPath(node.path);
    setRenameValue(node.name);

    const name = window.prompt('New name:', node.name);
    if (!name || name === node.name) {
      setRenamingPath(null);
      setRenameValue('');
      return;
    }

    setRenameValue(name);
    const newPath = node.path.replace(/[^/]+$/, name);

    await fetch('/api/project/file/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath: currentProject.path,
        oldPath: node.path,
        newPath,
      }),
    });

    setRenamingPath(null);
    setRenameValue('');
    await refreshFileTree();
  };

  const handleDelete = async (node: FileNode) => {
    if (!currentProject) {
      return;
    }

    if (!window.confirm(`Delete "${node.name}"? This cannot be undone.`)) {
      return;
    }

    await fetch('/api/project/file/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath: currentProject.path,
        filePath: node.path,
      }),
    });

    await refreshFileTree();
  };

  const renderFileNode = (node: FileNode, depth = 0) => {
    const isExpanded = expandedDirs.has(node.path);

    return (
      <div key={node.path}>
        <div
          className={`group flex items-center rounded-md px-2 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800/80 ${
            depth > 0 ? 'ml-4' : ''
          } ${renamingPath === node.path ? 'ring-1 ring-blue-500/60' : ''}`}
          onClick={() => (node.type === 'directory' ? toggleDir(node.path) : void handleFileClick(node))}
          onContextMenu={(event) => {
            event.preventDefault();
            setContextMenu({ x: event.clientX, y: event.clientY, node });
          }}
        >
          {node.type === 'directory' ? (
            <>
              {isExpanded ? <ChevronDown className="mr-1 h-4 w-4" /> : <ChevronRight className="mr-1 h-4 w-4" />}
              {isExpanded ? (
                <FolderOpen className="mr-2 h-4 w-4 text-blue-400" />
              ) : (
                <Folder className="mr-2 h-4 w-4 text-blue-400" />
              )}
            </>
          ) : (
            <>
              <div className="mr-1 h-4 w-4" />
              {getFileIcon(node.name)}
            </>
          )}
          <span className="flex-1 truncate">{node.name}</span>

          {gitStatus && (() => {
            const rel = node.path.startsWith(`${currentProject.path}/`)
              ? node.path.slice(currentProject.path.length + 1)
              : node.path;

            if (gitStatus.modified.includes(rel) || gitStatus.modified.includes(node.path)) {
              return (
                <span className="ml-auto shrink-0 rounded bg-orange-400/10 px-1 text-[10px] font-bold text-orange-400">
                  M
                </span>
              );
            }
            if (gitStatus.not_added.includes(rel) || gitStatus.not_added.includes(node.path)) {
              return (
                <span className="ml-auto shrink-0 rounded bg-green-400/10 px-1 text-[10px] font-bold text-green-400">
                  U
                </span>
              );
            }
            if (gitStatus.deleted.includes(rel) || gitStatus.deleted.includes(node.path)) {
              return (
                <span className="ml-auto shrink-0 rounded bg-red-400/10 px-1 text-[10px] font-bold text-red-400">
                  D
                </span>
              );
            }
            return null;
          })()}

          {renamingPath === node.path && renameValue && (
            <span className="ml-2 truncate text-[10px] text-blue-300">→ {renameValue}</span>
          )}

          {node.type === 'file' && (
            <div className="ml-2 text-xs text-neutral-500 opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </div>

        {node.type === 'directory' && isExpanded && node.children && (
          <div>{node.children.map((child) => renderFileNode(child, depth + 1))}</div>
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
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">{currentProject.name}</h3>
        <button
          onClick={() => void refreshFileTree()}
          title="Refresh file tree"
          className="rounded p-1 text-neutral-400 transition hover:text-neutral-200"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mb-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search files..."
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-300 placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {!currentProject.isDemo && (
        <div className="mb-3 space-y-2 border-b border-neutral-700/70 pb-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => void initializeGitRepo()}
              className="flex items-center justify-center gap-1 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs hover:border-neutral-500"
            >
              <GitCommit className="h-3.5 w-3.5" />
              Init Repo
            </button>
            <button
              onClick={() => void loadCommitHistory()}
              className="flex items-center justify-center gap-1 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs hover:border-neutral-500"
            >
              <History className="h-3.5 w-3.5" />
              History
            </button>
            <button
              onClick={async () => {
                await saveActiveFile();
                await loadGitStatus();
              }}
              disabled={!activeFile}
              className="flex items-center justify-center gap-1 rounded-md border border-sky-500/40 bg-sky-500/15 px-2 py-1.5 text-xs text-sky-200 hover:bg-sky-500/25 disabled:border-neutral-700 disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </button>
            <button
              onClick={() => void restoreActiveFile()}
              disabled={!activeFile}
              className="flex items-center justify-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-1.5 text-xs text-amber-200 hover:bg-amber-500/25 disabled:border-neutral-700 disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              <RotateCcw className="h-3.5 w-3.5" />
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
              <Undo2 className="h-3.5 w-3.5" />
              Rollback
            </button>
          </div>
        </div>
      )}

      <div className="space-y-0.5">
        {normalizedSearch
          ? filteredFiles.map((node) => (
              <div
                key={node.path}
                className="group flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800/80"
                onClick={() => void handleFileClick(node)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setContextMenu({ x: event.clientX, y: event.clientY, node });
                }}
              >
                <div className="mr-1 h-4 w-4" />
                {getFileIcon(node.name)}
                <div className="min-w-0 flex-1">
                  <div className="truncate">{node.name}</div>
                  <div className="truncate text-[10px] text-neutral-500">{node.path}</div>
                </div>
              </div>
            ))
          : currentProject.files.map((file) => renderFileNode(file))}
      </div>

      {contextMenu && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeType={contextMenu.node.type}
          onNewFile={() => void handleNewFile(contextMenu.node.type === 'directory' ? contextMenu.node.path : contextMenu.node.path.replace(/\/[^/]+$/, ''))}
          onNewFolder={() =>
            void handleNewFolder(
              contextMenu.node.type === 'directory' ? contextMenu.node.path : contextMenu.node.path.replace(/\/[^/]+$/, '')
            )
          }
          onRename={() => void handleRename(contextMenu.node)}
          onDelete={() => void handleDelete(contextMenu.node)}
          onCopyPath={() => void navigator.clipboard?.writeText(contextMenu.node.path)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
