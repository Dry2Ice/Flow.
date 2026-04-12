import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  getWorkspaceRoot,
  logSecurityWarning,
  resolveWorkspacePath,
  WorkspaceSecurityError,
} from '@/lib/workspace-security';

function resolveProjectFilePath(projectRoot: string, filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  if (!normalized || normalized.includes('..')) {
    throw new WorkspaceSecurityError(403, 'invalid_file_path', 'Access denied');
  }

  const resolved = path.resolve(projectRoot, normalized);
  const projectPrefix = projectRoot.endsWith(path.sep) ? projectRoot : `${projectRoot}${path.sep}`;
  if (resolved !== projectRoot && !resolved.startsWith(projectPrefix)) {
    throw new WorkspaceSecurityError(403, 'file_outside_project', 'Access denied');
  }

  return resolved;
}

export async function POST(request: NextRequest) {
  try {
    const { projectPath, filePath } = await request.json();
    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
    }

    const workspaceRoot = getWorkspaceRoot();
    const resolvedProjectPath = resolveWorkspacePath(projectPath, workspaceRoot);
    const resolvedFilePath = resolveProjectFilePath(resolvedProjectPath, filePath);

    if (!fs.existsSync(resolvedFilePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const content = fs.readFileSync(resolvedFilePath, 'utf8');
    return NextResponse.json({ success: true, filePath, content });
  } catch (error) {
    if (error instanceof WorkspaceSecurityError) {
      if (error.status === 403) {
        let rawInput: unknown;
        try {
          const body = await request.clone().json();
          rawInput = `${body?.projectPath || ''}/${body?.filePath || ''}`;
        } catch {
          rawInput = 'unavailable';
        }
        logSecurityWarning('project/file', error.reason, rawInput);
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to read file:', error);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
