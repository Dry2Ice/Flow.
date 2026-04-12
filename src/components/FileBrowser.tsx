// src/components/FileBrowser.tsx

"use client";

import { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Code, FileText, Settings, Database, Image } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { FileNode } from '@/types';

export function FileBrowser() {
  const { currentProject, openFile } = useAppStore();
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        return <Image className="w-4 h-4 mr-2 text-green-400" />;
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
    if (file.type !== 'file' || !currentProject) {
      return;
    }

    setErrorMessage(null);

    try {
      const response = await fetch('/api/project/file/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: currentProject.path,
          filePath: file.path,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load file');
      }

      openFile(file.path, data.content, data.lastModifiedMs);
    } catch (error) {
      console.error('Failed to load file:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load file');
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
      {errorMessage && (
        <div className="mb-2 rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-300">
          {errorMessage}
        </div>
      )}
      <div className="space-y-1">
        {currentProject.files.map(file => renderFileNode(file))}
      </div>
    </div>
  );
}
