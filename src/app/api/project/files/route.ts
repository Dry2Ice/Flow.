// src/app/api/project/files/route.ts

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { projectPath } = await request.json();

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

    // Read all files recursively
    function readFilesRecursively(dir: string, baseDir: string = dir): Array<{ path: string; content: string }> {
      const files: Array<{ path: string; content: string }> = [];

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(baseDir, fullPath);

          if (entry.isDirectory()) {
            // Skip common directories
            if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(entry.name)) {
              files.push(...readFilesRecursively(fullPath, baseDir));
            }
          } else if (entry.isFile()) {
            // Only include common code files
            const ext = path.extname(entry.name).toLowerCase();
            if (['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.html', '.css', '.scss', '.json', '.md', '.txt'].includes(ext)) {
              try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                // Limit file size to avoid memory issues
                if (content.length < 50000) { // ~50KB limit per file
                  files.push({
                    path: relativePath,
                    content: content
                  });
                }
              } catch (error) {
                console.error(`Failed to read file ${fullPath}:`, error);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Failed to read directory ${dir}:`, error);
      }

      return files;
    }

    const projectFiles = readFilesRecursively(projectPath);

    return NextResponse.json({ files: projectFiles });
  } catch (error) {
    console.error('Failed to read project files:', error);
    return NextResponse.json(
      { error: 'Failed to read project files' },
      { status: 500 }
    );
  }
}