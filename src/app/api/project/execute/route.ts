// src/app/api/project/execute/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { codeExecutor } from '@/lib/code-executor';
import { buildProject, lintProject, runProjectTests } from '@/lib/project-ops';

export async function POST(request: NextRequest) {
  try {
    const { code, filePath, projectPath, action = 'execute' } = await request.json();

    if (action === 'execute' && (!code || !filePath)) {
      return NextResponse.json(
        { error: 'Code and filePath are required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'execute':
        // Execute the code
        result = await codeExecutor.executeCode(code, filePath);
        break;

      case 'test':
        // Run tests
        result = await runProjectTests(projectPath || process.cwd());
        break;

      case 'lint':
        // Lint the code
        result = await lintProject(projectPath || process.cwd());
        break;

      case 'build':
        // Build the project
        result = await buildProject(projectPath || process.cwd());
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: result.success,
      output: result.output,
      error: result.error,
      logs: result.logs,
      action,
      filePath
    });

  } catch (error) {
    console.error('Code execution failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown execution error',
        logs: []
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'test';

  try {
    let result;

    switch (action) {
      case 'test':
        result = await runProjectTests(process.cwd());
        break;

      case 'build':
        result = await buildProject(process.cwd());
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: result.success,
      output: result.output,
      error: result.error,
      logs: result.logs,
      action
    });

  } catch (error) {
    console.error('Project operation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        logs: []
      },
      { status: 500 }
    );
  }
}
