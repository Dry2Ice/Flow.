// src/app/api/project/files/route.ts

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { FileWithMetadata } from '@/types';

// Helper function to determine language from file extension
function getLanguageFromExtension(extension: string): string {
  const languageMap: { [key: string]: string } = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'ps1': 'powershell',
    'dockerfile': 'dockerfile',
    'toml': 'toml',
    'ini': 'ini',
    'cfg': 'ini',
    'conf': 'ini'
  };
  return languageMap[extension] || 'plaintext';
}

export async function POST(request: NextRequest) {
  try {
    const { projectPath } = await request.json();

    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project path is required' },
        { status: 400 }
      );
    }

    // Validate that the path exists
    if (!fs.existsSync(projectPath)) {
      return NextResponse.json(
        { error: 'Project directory does not exist' },
        { status: 404 }
      );
    }

    // Read all files recursively
    function readFilesRecursively(dir: string, baseDir: string = dir): Array<{ path: string; content: string }> {
      const files: Array<{ path: string; content: string }> = [];

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(baseDir, fullPath);

          if (entry.isDirectory()) {
            // Skip common directories
            if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(entry.name)) {
              files.push(...readFilesRecursively(fullPath, baseDir));
            }
          } else if (entry.isFile()) {
            // Only include common code files
            const ext = path.extname(entry.name).toLowerCase();
            if (['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.html', '.css', '.scss', '.json', '.md', '.txt'].includes(ext)) {
              try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                // Limit file size to avoid memory issues
                if (content.length < 50000) { // ~50KB limit per file
                  files.push({
                    path: relativePath,
                    content: content
                  });
                }
              } catch (error) {
                console.error(`Failed to read file ${fullPath}:`, error);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Failed to read directory ${dir}:`, error);
      }

      return files;
    }

    const projectFiles = readFilesRecursively(projectPath);

    // Add metadata to files
    const filesWithMetadata = projectFiles.map(file => {
      const lines = file.content.split('\n');
      const extension = file.path.split('.').pop()?.toLowerCase() || '';

      // Basic code analysis
      const isBinary = file.content.includes('\0'); // Simple binary detection
      const hasImports = /import|require|from|#include|using/.test(file.content);
      const hasExports = /export|module\.exports|exports\./.test(file.content);

      return {
        ...file,
        metadata: {
          extension,
          lineCount: lines.length,
          size: file.content.length,
          isBinary,
          hasImports,
          hasExports,
          language: getLanguageFromExtension(extension),
          lastModified: fs.statSync(path.join(projectPath, file.path)).mtime.toISOString()
        }
      } as FileWithMetadata;
    });

    // Sort files by relevance (source files first, then config, then other)
    const sortedFiles = filesWithMetadata.sort((a, b) => {
      const extA = a.metadata?.extension || '';
      const extB = b.metadata?.extension || '';

      const priority = (ext: string) => {
        if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs'].includes(ext)) return 1;
        if (['html', 'css', 'scss', 'sass'].includes(ext)) return 2;
        if (['json', 'md', 'txt'].includes(ext)) return 3;
        return 4;
      };

      return priority(extA) - priority(extB);
    });

    return NextResponse.json({
      files: sortedFiles,
      summary: {
        totalFiles: sortedFiles.length,
        totalLines: sortedFiles.reduce((sum, f) => sum + (f.metadata?.lineCount || 0), 0),
        totalSize: sortedFiles.reduce((sum, f) => sum + (f.metadata?.size || 0), 0),
        languages: [...new Set(sortedFiles.map(f => f.metadata?.language).filter(Boolean))]
      }
    });
  } catch (error) {
    console.error('Failed to read project files:', error);
    return NextResponse.json(
      { error: 'Failed to read project files' },
      { status: 500 }
    );
  }
}