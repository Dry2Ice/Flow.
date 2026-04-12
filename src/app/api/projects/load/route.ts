// src/app/api/projects/load/route.ts

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { path: projectPath } = await request.json();

    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project path is required' },
        { status: 400 }
      );
    }

    // Validate that the path exists
    if (!fs.existsSync(projectPath)) {
      return NextResponse.json(
        { error: 'Project directory does not exist' },
        { status: 404 }
      );
    }

    // Check if it's a valid project (has package.json or other indicators)
    const hasPackageJson = fs.existsSync(path.join(projectPath, 'package.json'));
    const hasSrc = fs.existsSync(path.join(projectPath, 'src'));
    const hasApp = fs.existsSync(path.join(projectPath, 'src', 'app'));

    if (!hasPackageJson && !hasSrc) {
      return NextResponse.json(
        { error: 'Directory does not appear to be a valid project' },
        { status: 400 }
      );
    }

    // Read basic file structure
    function readProjectStructure(dir: string, baseDir: string = dir, maxDepth = 3): any[] {
      if (maxDepth <= 0) return [];

      const structure: any[] = [];

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(baseDir, fullPath);

          // Skip common directories
          if (entry.isDirectory()) {
            if (!['node_modules', '.git', '.next', 'dist', 'build', '.vscode', '.idea'].includes(entry.name)) {
              structure.push({
                name: entry.name,
                path: relativePath,
                type: 'directory',
                children: readProjectStructure(fullPath, baseDir, maxDepth - 1)
              });
            }
          } else {
            // Only include important files
            const ext = path.extname(entry.name).toLowerCase();
            if (['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.html', '.css'].includes(ext) ||
                ['package.json', 'tsconfig.json', 'README.md'].includes(entry.name)) {
              structure.push({
                name: entry.name,
                path: relativePath,
                type: 'file'
              });
            }
          }
        }
      } catch (error) {
        console.error(`Failed to read directory ${dir}:`, error);
      }

      return structure;
    }

    const files = readProjectStructure(projectPath);

    return NextResponse.json({
      success: true,
      files,
      projectInfo: {
        hasPackageJson,
        hasNextJs: hasApp,
        path: projectPath,
        name: path.basename(projectPath)
      }
    });
  } catch (error) {
    console.error('Failed to load project:', error);
    return NextResponse.json(
      { error: 'Failed to load project', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}