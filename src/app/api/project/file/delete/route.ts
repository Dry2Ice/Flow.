import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  getWorkspaceRoot,
  logSecurityWarning,
  resolveWorkspacePath,
  WorkspaceSecurityError,
} from '@/lib/workspace-security';

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

    fs.rmSync(resolvedFilePath, { recursive: true, force: true });
    return NextResponse.json({ success: true, path: filePath });
  } catch (error) {
    if (error instanceof WorkspaceSecurityError) {
      if (error.status === 403) {
        logSecurityWarning('project/file/delete', error.reason, { projectPathInput, filePathInput });
      }

      return NextResponse.json({ error: error.message, reason: error.reason }, { status: error.status });
    }

    if ((error as NodeJS.ErrnoException)?.code === 'EACCES') {
      return NextResponse.json({ error: 'Permission denied', reason: 'permission_denied' }, { status: 403 });
    }

    console.error('Failed to delete path:', error);
    return NextResponse.json({ error: 'Failed to delete path', reason: 'delete_failed' }, { status: 500 });
  }
}
