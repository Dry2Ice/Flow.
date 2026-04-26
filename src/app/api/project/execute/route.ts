import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';
import { codeExecutor } from '@/lib/code-executor';
import { lintProject } from '@/lib/project-ops';
import { getConfiguredTrustedRoots, getWorkspaceRoot, resolveWorkspacePath, WorkspaceSecurityError } from '@/lib/workspace-security';

interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  logs: string[];
  exitCode?: number;
}

const COMMAND_TIMEOUT_MS = 5 * 60_000;

export function detectPackageManager(projectPath: string): 'bun' | 'yarn' | 'pnpm' | 'npm' {
  if (fs.existsSync(path.join(projectPath, 'bun.lockb'))) return 'bun';
  if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml')) || fs.existsSync(path.join(projectPath, 'pnpm-lock.yml'))) return 'pnpm';
  return 'npm';
}

async function runProjectCommand(projectPathInput: string, action: 'build' | 'test'): Promise<ExecutionResult> {
  const workspaceRoot = getWorkspaceRoot();
  const trustedRoots = getConfiguredTrustedRoots(workspaceRoot);
  const projectPath = resolveWorkspacePath(projectPathInput || process.cwd(), workspaceRoot, { trustedRoots });
  const packageManager = detectPackageManager(projectPath);

  const args = packageManager === 'npm' ? ['run', action] : ['run', action];
  const logs: string[] = [];

  return new Promise((resolve) => {
    const child = spawn(packageManager, args, {
      cwd: projectPath,
      env: process.env,
      shell: process.platform === 'win32',
    });

    let settled = false;
    const finish = (result: ExecutionResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };

    child.stdout.on('data', (chunk: Buffer | string) => {
      const text = chunk.toString();
      logs.push(...text.split(/\r?\n/).filter(Boolean));
    });

    child.stderr.on('data', (chunk: Buffer | string) => {
      const text = chunk.toString();
      logs.push(...text.split(/\r?\n/).filter(Boolean));
    });

    child.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        finish({
          success: false,
          output: `${packageManager} is not installed or not available in PATH`,
          error: error.message,
          logs,
          exitCode: 127,
        });
        return;
      }

      finish({ success: false, output: `${action} failed to start`, error: error.message, logs });
    });

    child.on('close', (code, signal) => {
      const outputLines = logs.slice(-50);
      const output = outputLines.join('\n') || `${action} finished with exit code ${code ?? 'unknown'}`;
      finish({
        success: code === 0,
        output,
        logs,
        exitCode: typeof code === 'number' ? code : undefined,
        ...(signal ? { error: `${action} terminated by signal ${signal}` } : {}),
      });
    });

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      finish({
        success: false,
        output: `${action} timed out after ${COMMAND_TIMEOUT_MS}ms`,
        error: 'Command timeout',
        logs,
        exitCode: 124,
      });
    }, COMMAND_TIMEOUT_MS);
  });
}

export async function POST(request: NextRequest) {
  try {
    const { code, filePath, projectPath, action = 'execute' } = await request.json();

    if (action === 'execute' && (!code || !filePath)) {
      return NextResponse.json({ error: 'Code and filePath are required' }, { status: 400 });
    }

    let result: ExecutionResult;

    switch (action) {
      case 'execute':
        result = await codeExecutor.executeCode(code, filePath);
        break;
      case 'test':
        result = await runProjectCommand(projectPath || process.cwd(), 'test');
        break;
      case 'lint':
        result = await lintProject(projectPath || process.cwd());
        break;
      case 'build':
        result = await runProjectCommand(projectPath || process.cwd(), 'build');
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({
      success: result.success,
      output: result.output,
      error: result.error,
      logs: result.logs,
      exitCode: result.exitCode,
      action,
      filePath,
    });
  } catch (error) {
    if (error instanceof WorkspaceSecurityError) {
      return NextResponse.json({ success: false, error: error.message, logs: [] }, { status: error.status });
    }

    console.error('Code execution failed:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown execution error', logs: [] }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'test';

  try {
    let result: ExecutionResult;

    switch (action) {
      case 'test':
        result = await runProjectCommand(process.cwd(), 'test');
        break;
      case 'build':
        result = await runProjectCommand(process.cwd(), 'build');
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({
      success: result.success,
      output: result.output,
      error: result.error,
      logs: result.logs,
      exitCode: result.exitCode,
      action,
    });
  } catch (error) {
    if (error instanceof WorkspaceSecurityError) {
      return NextResponse.json({ success: false, error: error.message, logs: [] }, { status: error.status });
    }

    console.error('Project operation failed:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error', logs: [] }, { status: 500 });
  }
}
