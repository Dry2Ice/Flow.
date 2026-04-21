import { NextRequest, NextResponse } from 'next/server';
import {
  addRuntimeTrustedRoot,
  getConfiguredTrustedRoots,
  getWorkspaceRoot,
  logSecurityWarning,
  resolveWorkspacePath,
  WorkspaceSecurityError,
} from '@/lib/workspace-security';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, confirm } = body;

    if (confirm !== true) {
      return NextResponse.json(
        { error: 'Explicit confirmation is required', reason: 'trusted_root_confirmation_required' },
        { status: 403 }
      );
    }

    if (typeof projectPath !== 'string' || !projectPath.trim()) {
      return NextResponse.json({ error: 'projectPath is required' }, { status: 400 });
    }

    const workspaceRoot = getWorkspaceRoot();
    addRuntimeTrustedRoot(projectPath);

    resolveWorkspacePath(projectPath, workspaceRoot, {
      trustedRoots: getConfiguredTrustedRoots(workspaceRoot),
    });

    return NextResponse.json({ success: true, trustedRoots: getConfiguredTrustedRoots(workspaceRoot) });
  } catch (error) {
    if (error instanceof WorkspaceSecurityError) {
      if (error.status === 403) {
        let rawInput: unknown;
        try {
          rawInput = (await request.clone().json())?.projectPath;
        } catch {
          rawInput = 'unavailable';
        }
        logSecurityWarning('workspace/trust', error.reason, rawInput);
      }
      return NextResponse.json({ error: error.message, reason: error.reason }, { status: error.status });
    }

    console.error('Failed to trust workspace path:', error);
    return NextResponse.json({ error: 'Failed to trust workspace path' }, { status: 500 });
  }
}
