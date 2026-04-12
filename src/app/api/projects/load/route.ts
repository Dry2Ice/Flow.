import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  getWorkspaceRoot,
  logSecurityWarning,
  resolveWorkspacePath,
  WorkspaceSecurityError,
} from '@/lib/workspace-security';

const MAX_STRUCTURE_DEPTH = 4;
const MAX_STRUCTURE_ITEMS = 1200;

type ProjectStructureItem = {
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: ProjectStructureItem[];
};

export async function POST(request: NextRequest) {
  try {
    const { path: projectPath } = await request.json();
    const workspaceRoot = getWorkspaceRoot();
    const resolvedProjectPath = resolveWorkspacePath(projectPath, workspaceRoot);

    if (!fs.existsSync(resolvedProjectPath)) {
      return NextResponse.json({ error: 'Project directory does not exist' }, { status: 404 });
    }

    const hasPackageJson = fs.existsSync(path.join(resolvedProjectPath, 'package.json'));
    const hasSrc = fs.existsSync(path.join(resolvedProjectPath, 'src'));
    const hasApp = fs.existsSync(path.join(resolvedProjectPath, 'src', 'app'));

    if (!hasPackageJson && !hasSrc) {
      return NextResponse.json({ error: 'Directory does not appear to be a valid project' }, { status: 400 });
    }

    const traversalState = { count: 0 };

    function readProjectStructure(
      dir: string,
      baseDir: string = dir,
      depth = 0
    ): ProjectStructureItem[] {
      if (depth >= MAX_STRUCTURE_DEPTH || traversalState.count >= MAX_STRUCTURE_ITEMS) {
        return [];
      }

      const structure: ProjectStructureItem[] = [];

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (traversalState.count >= MAX_STRUCTURE_ITEMS) {
            break;
          }

          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(baseDir, fullPath);

          if (entry.isDirectory()) {
            if (!['node_modules', '.git', '.next', 'dist', 'build', '.vscode', '.idea'].includes(entry.name)) {
              traversalState.count += 1;
              structure.push({
                name: entry.name,
                path: relativePath,
                type: 'directory',
                children: readProjectStructure(fullPath, baseDir, depth + 1),
              });
            }
          } else {
            const ext = path.extname(entry.name).toLowerCase();
            if (
              ['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.html', '.css'].includes(ext) ||
              ['package.json', 'tsconfig.json', 'README.md'].includes(entry.name)
            ) {
              traversalState.count += 1;
              structure.push({
                name: entry.name,
                path: relativePath,
                type: 'file',
              });
            }
          }
        }
      } catch (error) {
        console.error('Failed to read project structure:', error);
      }

      return structure;
    }

    const files = readProjectStructure(resolvedProjectPath);

    return NextResponse.json({
      success: true,
      files,
      projectInfo: {
        hasPackageJson,
        hasNextJs: hasApp,
        path: projectPath,
        name: path.basename(resolvedProjectPath),
      },
    });
  } catch (error) {
    if (error instanceof WorkspaceSecurityError) {
      if (error.status === 403) {
        let rawInput: unknown;
        try {
          rawInput = (await request.clone().json())?.path;
        } catch {
          rawInput = 'unavailable';
        }
        logSecurityWarning('projects/load', error.reason, rawInput);
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to load project:', error);
    return NextResponse.json(
      { error: 'Failed to load project', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
