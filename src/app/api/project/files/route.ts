import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { FileWithMetadata } from '@/types';
import {
  getConfiguredTrustedRoots,
  getWorkspaceRoot,
  logSecurityWarning,
  registerTrustedProjectRoot,
  resolveWorkspacePath,
  WorkspaceSecurityError,
} from '@/lib/workspace-security';

type IndexingMode = 'default' | 'full';
type SkipReason = 'size' | 'type' | 'limit';

type IndexingPolicy = {
  maxRecursionDepth: number;
  maxFilesToRead: number;
  maxFileSizeBytes: number;
  supportedExtensions: Set<string>;
};

type SkippedFileReport = {
  path: string;
  reason: SkipReason;
  details: string;
};

const DEFAULT_SUPPORTED_EXTENSIONS = new Set([
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
]);

const FULL_SCAN_SUPPORTED_EXTENSIONS = new Set([
  ...DEFAULT_SUPPORTED_EXTENSIONS,
  '.mjs',
  '.cjs',
  '.vue',
  '.svelte',
  '.astro',
  '.less',
  '.sass',
  '.xml',
  '.yml',
  '.yaml',
  '.toml',
  '.ini',
  '.cfg',
  '.conf',
  '.env',
  '.sql',
  '.graphql',
  '.gql',
  '.sh',
  '.bash',
  '.zsh',
  '.ps1',
  '.bat',
  '.dockerfile',
]);

const INDEXING_POLICIES: Record<IndexingMode, IndexingPolicy> = {
  default: {
    maxRecursionDepth: 8,
    maxFilesToRead: 500,
    maxFileSizeBytes: 50_000,
    supportedExtensions: DEFAULT_SUPPORTED_EXTENSIONS,
  },
  full: {
    maxRecursionDepth: 16,
    maxFilesToRead: 2_000,
    maxFileSizeBytes: 500_000,
    supportedExtensions: FULL_SCAN_SUPPORTED_EXTENSIONS,
  },
};

const EXCLUDED_DIRECTORIES = new Set(['node_modules', '.git', '.next', 'dist', 'build']);
const MAX_SKIPPED_FILES_IN_REPORT = 300;

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
    const body = await request.json();
    const { projectPath, trustedRoot, confirmTrustedRoot, fullScan } = body;
    const indexingMode: IndexingMode = fullScan ? 'full' : 'default';
    const indexingPolicy = INDEXING_POLICIES[indexingMode];
    const workspaceRoot = getWorkspaceRoot();
    const trustedRoots = registerTrustedProjectRoot(getConfiguredTrustedRoots(workspaceRoot), projectPath, {
      trustedRoot,
      confirm: confirmTrustedRoot,
    });
    const resolvedProjectPath = resolveWorkspacePath(projectPath, workspaceRoot, { trustedRoots });

    if (!fs.existsSync(resolvedProjectPath)) {
      return NextResponse.json({ error: 'Project directory does not exist' }, { status: 404 });
    }

    const skippedFiles: SkippedFileReport[] = [];
    const skippedReasonCounts: Record<SkipReason, number> = { size: 0, type: 0, limit: 0 };
    let skippedFilesTruncated = false;

    const addSkippedFile = (entry: SkippedFileReport) => {
      skippedReasonCounts[entry.reason] += 1;
      if (skippedFiles.length < MAX_SKIPPED_FILES_IN_REPORT) {
        skippedFiles.push(entry);
      } else {
        skippedFilesTruncated = true;
      }
    };

    function readFilesRecursively(
      dir: string,
      baseDir: string = dir,
      depth = 0,
      files: Array<{ path: string; content: string }> = []
    ): Array<{ path: string; content: string }> {
      if (depth > indexingPolicy.maxRecursionDepth || files.length >= indexingPolicy.maxFilesToRead) {
        return files;
      }

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(baseDir, fullPath);

          if (files.length >= indexingPolicy.maxFilesToRead) {
            addSkippedFile({
              path: relativePath || '.',
              reason: 'limit',
              details: `Global file limit reached (${indexingPolicy.maxFilesToRead} files).`,
            });
            break;
          }

          if (entry.isDirectory()) {
            if (depth + 1 > indexingPolicy.maxRecursionDepth) {
              addSkippedFile({
                path: relativePath,
                reason: 'limit',
                details: `Directory depth limit reached (${indexingPolicy.maxRecursionDepth}).`,
              });
              continue;
            }

            if (!EXCLUDED_DIRECTORIES.has(entry.name)) {
              readFilesRecursively(fullPath, baseDir, depth + 1, files);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            const normalizedExt = ext || (entry.name.toLowerCase() === 'dockerfile' ? '.dockerfile' : '');

            if (!indexingPolicy.supportedExtensions.has(normalizedExt)) {
              addSkippedFile({
                path: relativePath,
                reason: 'type',
                details: `Unsupported extension "${normalizedExt || 'no extension'}" in ${indexingMode} mode.`,
              });
              continue;
            }

            try {
              const fileStats = fs.statSync(fullPath);
              if (fileStats.size > indexingPolicy.maxFileSizeBytes) {
                addSkippedFile({
                  path: relativePath,
                  reason: 'size',
                  details: `File size ${fileStats.size} exceeds limit ${indexingPolicy.maxFileSizeBytes} bytes.`,
                });
                continue;
              }

              const content = fs.readFileSync(fullPath, 'utf-8');
              files.push({
                path: relativePath,
                content,
              });
            } catch (error) {
              console.error(`Failed to read file ${relativePath}:`, error);
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
      mode: indexingMode,
      warnings: fullScan
        ? [
            'Full scan mode enabled: deeper traversal, broader file types, and larger files may increase indexing time and memory usage.',
          ]
        : [],
      summary: {
        totalFiles: sortedFiles.length,
        totalLines: sortedFiles.reduce((sum, f) => sum + (f.metadata?.lineCount || 0), 0),
        totalSize: sortedFiles.reduce((sum, f) => sum + (f.metadata?.size || 0), 0),
        languages: [...new Set(sortedFiles.map(f => f.metadata?.language).filter(Boolean))],
        indexingPolicy: {
          mode: indexingMode,
          maxRecursionDepth: indexingPolicy.maxRecursionDepth,
          maxFilesToRead: indexingPolicy.maxFilesToRead,
          maxFileSizeBytes: indexingPolicy.maxFileSizeBytes,
          supportedExtensions: [...indexingPolicy.supportedExtensions].sort(),
        },
        skippedFiles: {
          total: skippedReasonCounts.size + skippedReasonCounts.type + skippedReasonCounts.limit,
          byReason: skippedReasonCounts,
          truncated: skippedFilesTruncated,
          files: skippedFiles,
        },
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
