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
  let oldPathInput: unknown = 'unavailable';
  let newPathInput: unknown = 'unavailable';

  try {
    const { projectPath, oldPath, newPath } = await request.json();
    projectPathInput = projectPath;
    oldPathInput = oldPath;
    newPathInput = newPath;

    const workspaceRoot = getWorkspaceRoot();
    const resolvedProjectPath = resolveWorkspacePath(projectPath, workspaceRoot);
    const resolvedOldPath = resolveWorkspacePath(path.join(projectPath, oldPath), workspaceRoot);
    const resolvedNewPath = resolveWorkspacePath(path.join(projectPath, newPath), workspaceRoot);

    if (
      !resolvedOldPath.startsWith(`${resolvedProjectPath}${path.sep}`) ||
      !resolvedNewPath.startsWith(`${resolvedProjectPath}${path.sep}`)
    ) {
      return NextResponse.json({ error: 'Access denied', reason: 'outside_project' }, { status: 403 });
    }

    fs.renameSync(resolvedOldPath, resolvedNewPath);
    return NextResponse.json({ success: true, oldPath, newPath });
  } catch (error) {
    if (error instanceof WorkspaceSecurityError) {
      if (error.status === 403) {
        logSecurityWarning('project/file/rename', error.reason, { projectPathInput, oldPathInput, newPathInput });
      }

      return NextResponse.json({ error: error.message, reason: error.reason }, { status: error.status });
    }

    if ((error as NodeJS.ErrnoException)?.code === 'EACCES') {
      return NextResponse.json({ error: 'Permission denied', reason: 'permission_denied' }, { status: 403 });
    }

    console.error('Failed to rename path:', error);
    return NextResponse.json({ error: 'Failed to rename path', reason: 'rename_failed' }, { status: 500 });
  }
}
