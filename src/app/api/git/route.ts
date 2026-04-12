import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { gitService } from '@/lib/git';
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
    const { action, projectPath, filePath, content, commitMessage, commitHash, limit } = await request.json();
    const workspaceRoot = getWorkspaceRoot();
    const resolvedProjectPath = resolveWorkspacePath(projectPath, workspaceRoot);

    if (action === 'init') {
      const initialized = await gitService.initRepo(resolvedProjectPath);
      return NextResponse.json({ success: initialized });
    }

    if (action === 'save') {
      if (!filePath || typeof content !== 'string') {
        return NextResponse.json({ error: 'filePath and content are required' }, { status: 400 });
      }

      const resolvedFilePath = resolveProjectFilePath(resolvedProjectPath, filePath);
      const oldContent = fs.existsSync(resolvedFilePath) ? fs.readFileSync(resolvedFilePath, 'utf8') : '';

      if (oldContent === content) {
        return NextResponse.json({ success: true, skipped: true, oldContent, newContent: content });
      }

      fs.mkdirSync(path.dirname(resolvedFilePath), { recursive: true });
      fs.writeFileSync(resolvedFilePath, content, 'utf8');

      const isRepo = await gitService.isRepo(resolvedProjectPath);
      if (!isRepo) {
        await gitService.initRepo(resolvedProjectPath);
      }

      await gitService.addAll(resolvedProjectPath);
      await gitService.commit(resolvedProjectPath, commitMessage || `chore: update ${filePath}`);
      const log = await gitService.getLog(resolvedProjectPath, 1);

      return NextResponse.json({
        success: true,
        oldContent,
        newContent: content,
        latestCommit: log[0] || null,
      });
    }

    if (action === 'history') {
      const commits = await gitService.getLog(resolvedProjectPath, Number(limit) || 20);
      return NextResponse.json({ success: true, commits });
    }

    if (action === 'rollback') {
      if (!commitHash || typeof commitHash !== 'string') {
        return NextResponse.json({ error: 'commitHash is required' }, { status: 400 });
      }

      const success = await gitService.checkout(resolvedProjectPath, commitHash);
      return NextResponse.json({ success });
    }

    if (action === 'restore') {
      if (!filePath || typeof filePath !== 'string') {
        return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
      }
      const success = await gitService.restoreFile(resolvedProjectPath, filePath);
      const resolvedFilePath = resolveProjectFilePath(resolvedProjectPath, filePath);
      const restoredContent = fs.existsSync(resolvedFilePath) ? fs.readFileSync(resolvedFilePath, 'utf8') : '';

      return NextResponse.json({ success, content: restoredContent });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
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
        logSecurityWarning('git', error.reason, rawInput);
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Git operation failed:', error);
    return NextResponse.json({ error: 'Git operation failed' }, { status: 500 });
  }
}
