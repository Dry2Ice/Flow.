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
  let dirPathInput: unknown = 'unavailable';

  try {
    const { projectPath, dirPath } = await request.json();
    projectPathInput = projectPath;
    dirPathInput = dirPath;

    const workspaceRoot = getWorkspaceRoot();
    const resolvedProjectPath = resolveWorkspacePath(projectPath, workspaceRoot);
    const resolvedDirPath = resolveWorkspacePath(path.join(projectPath, dirPath), workspaceRoot);

    if (!resolvedDirPath.startsWith(`${resolvedProjectPath}${path.sep}`)) {
      return NextResponse.json({ error: 'Access denied', reason: 'outside_project' }, { status: 403 });
    }

    fs.mkdirSync(resolvedDirPath, { recursive: true });
    return NextResponse.json({ success: true, path: dirPath });
  } catch (error) {
    if (error instanceof WorkspaceSecurityError) {
      if (error.status === 403) {
        logSecurityWarning('project/file/mkdir', error.reason, { projectPathInput, dirPathInput });
      }

      return NextResponse.json({ error: error.message, reason: error.reason }, { status: error.status });
    }

    if ((error as NodeJS.ErrnoException)?.code === 'EACCES') {
      return NextResponse.json({ error: 'Permission denied', reason: 'permission_denied' }, { status: 403 });
    }

    console.error('Failed to create directory:', error);
    return NextResponse.json({ error: 'Failed to create directory', reason: 'mkdir_failed' }, { status: 500 });
  }
}
