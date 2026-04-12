// src/components/FileBrowser.tsx

"use client";

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Code, FileText, Settings, Database, Image } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { FileNode } from '@/types';

export function FileBrowser() {
  const { currentProject, openFile } = useAppStore();
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

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
    if (file.type === 'file') {
      try {
        // In a real app, you'd fetch the file content from the server
        // For now, we'll use placeholder content
        const content = `// ${file.name}\n\n// This is placeholder content for ${file.name}`;
        openFile(file.path, content);
      } catch (error) {
        console.error('Failed to load file:', error);
      }
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
      <div className="space-y-1">
        {currentProject.files.map(file => renderFileNode(file))}
      </div>
    </div>
  );
}