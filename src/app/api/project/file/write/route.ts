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

export async function POST(request: NextRequest) {
  let projectPathInput: unknown = 'unavailable';
  let filePathInput: unknown = 'unavailable';

  try {
    const { projectPath, filePath, content, expectedLastModifiedMs } = await request.json();
    projectPathInput = projectPath;
    filePathInput = filePath;

    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'Invalid content', reason: 'invalid_content' }, { status: 400 });
    }

    const workspaceRoot = getWorkspaceRoot();
    const resolvedProjectPath = resolveWorkspacePath(projectPath, workspaceRoot);
    const resolvedFilePath = resolveWorkspacePath(path.join(projectPath, filePath), workspaceRoot);

    if (!resolvedFilePath.startsWith(`${resolvedProjectPath}${path.sep}`)) {
      return NextResponse.json({ error: 'Access denied', reason: 'outside_project' }, { status: 403 });
    }

    const fileExists = fs.existsSync(resolvedFilePath);

    if (!fileExists) {
      // Create parent directories if needed, then create the file
      const parentDir = path.dirname(resolvedFilePath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(resolvedFilePath, content, 'utf8');
      const newStat = fs.statSync(resolvedFilePath);
      return NextResponse.json({
        success: true,
        created: true,
        path: filePath,
        lastModifiedMs: newStat.mtimeMs,
        size: newStat.size,
      });
    }

    const currentStat = fs.statSync(resolvedFilePath);

    if (!currentStat.isFile()) {
      return NextResponse.json({ error: 'Not a file', reason: 'invalid_file_type' }, { status: 400 });
    }

    if (currentStat.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'File is too large to edit', reason: 'file_too_large' }, { status: 413 });
    }

    if (typeof expectedLastModifiedMs === 'number' && currentStat.mtimeMs !== expectedLastModifiedMs) {
      return NextResponse.json(
        {
          error: 'File was changed on disk. Reload and retry save.',
          reason: 'write_conflict',
          actualLastModifiedMs: currentStat.mtimeMs,
        },
        { status: 409 }
      );
    }

    fs.writeFileSync(resolvedFilePath, content, 'utf8');
    const updatedStat = fs.statSync(resolvedFilePath);

    return NextResponse.json({
      success: true,
      path: filePath,
      lastModifiedMs: updatedStat.mtimeMs,
      size: updatedStat.size,
    });
  } catch (error) {
    if (error instanceof WorkspaceSecurityError) {
      if (error.status === 403) {
        logSecurityWarning('project/file/write', error.reason, { projectPathInput, filePathInput });
      }

      return NextResponse.json({ error: error.message, reason: error.reason }, { status: error.status });
    }

    if ((error as NodeJS.ErrnoException)?.code === 'EACCES') {
      return NextResponse.json({ error: 'Permission denied', reason: 'permission_denied' }, { status: 403 });
    }

    console.error('Failed to write project file:', error);
    return NextResponse.json({ error: 'Failed to write file', reason: 'write_failed' }, { status: 500 });
  }
}
