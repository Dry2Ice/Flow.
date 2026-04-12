import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { FileWithMetadata } from '@/types';
import {
  getWorkspaceRoot,
  logSecurityWarning,
  resolveWorkspacePath,
  WorkspaceSecurityError,
} from '@/lib/workspace-security';

const MAX_RECURSION_DEPTH = 8;
const MAX_FILES_TO_READ = 500;

function getLanguageFromExtension(extension: string): string {
  const languageMap: { [key: string]: string } = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    ps1: 'powershell',
    dockerfile: 'dockerfile',
    toml: 'toml',
    ini: 'ini',
    cfg: 'ini',
    conf: 'ini',
  };
  return languageMap[extension] || 'plaintext';
}

export async function POST(request: NextRequest) {
  try {
    const { projectPath } = await request.json();
    const workspaceRoot = getWorkspaceRoot();
    const resolvedProjectPath = resolveWorkspacePath(projectPath, workspaceRoot);

    if (!fs.existsSync(resolvedProjectPath)) {
      return NextResponse.json({ error: 'Project directory does not exist' }, { status: 404 });
    }

    function readFilesRecursively(
      dir: string,
      baseDir: string = dir,
      depth = 0,
      files: Array<{ path: string; content: string }> = []
    ): Array<{ path: string; content: string }> {
      if (depth > MAX_RECURSION_DEPTH || files.length >= MAX_FILES_TO_READ) {
        return files;
      }

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (files.length >= MAX_FILES_TO_READ) {
            break;
          }

          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(baseDir, fullPath);

          if (entry.isDirectory()) {
            if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(entry.name)) {
              readFilesRecursively(fullPath, baseDir, depth + 1, files);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (
              [
                '.js',
                '.jsx',
                '.ts',
                '.tsx',
                '.py',
                '.java',
                '.cpp',
                '.c',
                '.cs',
                '.php',
                '.rb',
                '.go',
                '.rs',
                '.html',
                '.css',
                '.scss',
                '.json',
                '.md',
                '.txt',
              ].includes(ext)
            ) {
              try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                if (content.length < 50000) {
                  files.push({
                    path: relativePath,
                    content,
                  });
                }
              } catch (error) {
                console.error(`Failed to read file ${relativePath}:`, error);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to read project directory:', error);
      }

      return files;
    }

    const projectFiles = readFilesRecursively(resolvedProjectPath);

    const filesWithMetadata = projectFiles.map(file => {
      const lines = file.content.split('\n');
      const extension = file.path.split('.').pop()?.toLowerCase() || '';

      const isBinary = file.content.includes('\0');
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
          lastModified: fs.statSync(path.join(resolvedProjectPath, file.path)).mtime.toISOString(),
        },
      } as FileWithMetadata;
    });

    const sortedFiles = filesWithMetadata.sort((a, b) => {
      const extA = a.metadata?.extension || '';
      const extB = b.metadata?.extension || '';

      const priority = (ext: string) => {
        if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs'].includes(ext)) {
          return 1;
        }
        if (['html', 'css', 'scss', 'sass'].includes(ext)) {
          return 2;
        }
        if (['json', 'md', 'txt'].includes(ext)) {
          return 3;
        }
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
        languages: [...new Set(sortedFiles.map(f => f.metadata?.language).filter(Boolean))],
      },
    });
  } catch (error) {
    if (error instanceof WorkspaceSecurityError) {
      if (error.status === 403) {
        let rawInput: unknown;
        try {
          rawInput = (await request.clone().json())?.projectPath;
        } catch {
          rawInput = 'unavailable';
        }
        logSecurityWarning('project/files', error.reason, rawInput);
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to read project files:', error);
    return NextResponse.json({ error: 'Failed to read project files' }, { status: 500 });
  }
}
