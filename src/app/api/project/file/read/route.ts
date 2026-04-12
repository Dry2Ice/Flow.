import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  getWorkspaceRoot,
  logSecurityWarning,
  resolveWorkspacePath,
  WorkspaceSecurityError,
} from '@/lib/workspace-security';

const MAX_FILE_SIZE_BYTES = 1024 * 1024;
const BINARY_CHECK_BYTES = 4096;

function isBinaryBuffer(buffer: Buffer): boolean {
  const inspectLength = Math.min(buffer.length, BINARY_CHECK_BYTES);

  if (inspectLength === 0) {
    return false;
  }

  let suspiciousBytes = 0;

  for (let i = 0; i < inspectLength; i += 1) {
    const byte = buffer[i];

    if (byte === 0) {
      return true;
    }

    const isControlCharacter = byte < 7 || (byte > 14 && byte < 32);
    if (isControlCharacter) {
      suspiciousBytes += 1;
    }
  }

  return suspiciousBytes / inspectLength > 0.25;
}

export async function POST(request: NextRequest) {
  let projectPathInput: unknown = 'unavailable';
  let filePathInput: unknown = 'unavailable';

  try {
    const { projectPath, filePath } = await request.json();
    projectPathInput = projectPath;
    filePathInput = filePath;

    const workspaceRoot = getWorkspaceRoot();
    const resolvedProjectPath = resolveWorkspacePath(projectPath, workspaceRoot);
    const resolvedFilePath = resolveWorkspacePath(path.join(projectPath, filePath), workspaceRoot);

    if (!resolvedFilePath.startsWith(`${resolvedProjectPath}${path.sep}`)) {
      return NextResponse.json({ error: 'Access denied', reason: 'outside_project' }, { status: 403 });
    }

    if (!fs.existsSync(resolvedFilePath)) {
      return NextResponse.json({ error: 'File not found', reason: 'file_not_found' }, { status: 404 });
    }

    const fileStat = fs.statSync(resolvedFilePath);

    if (!fileStat.isFile()) {
      return NextResponse.json({ error: 'Not a file', reason: 'invalid_file_type' }, { status: 400 });
    }

    if (fileStat.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'File is too large to open', reason: 'file_too_large' }, { status: 413 });
    }

    const rawContent = fs.readFileSync(resolvedFilePath);

    if (isBinaryBuffer(rawContent)) {
      return NextResponse.json({ error: 'Binary files are not supported', reason: 'binary_file' }, { status: 415 });
    }

    return NextResponse.json({
      content: rawContent.toString('utf8'),
      path: filePath,
      size: fileStat.size,
      lastModifiedMs: fileStat.mtimeMs,
    });
  } catch (error) {
    if (error instanceof WorkspaceSecurityError) {
      if (error.status === 403) {
        logSecurityWarning('project/file/read', error.reason, { projectPathInput, filePathInput });
      }

      return NextResponse.json({ error: error.message, reason: error.reason }, { status: error.status });
    }

    if ((error as NodeJS.ErrnoException)?.code === 'EACCES') {
      return NextResponse.json({ error: 'Permission denied', reason: 'permission_denied' }, { status: 403 });
    }

    console.error('Failed to read project file:', error);
    return NextResponse.json({ error: 'Failed to read file', reason: 'read_failed' }, { status: 500 });
  }
}
