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
  try {
    const { name, path: projectPath } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const workspaceRoot = getWorkspaceRoot();
    const resolvedProjectPath = resolveWorkspacePath(projectPath, workspaceRoot);

    if (!fs.existsSync(resolvedProjectPath)) {
      fs.mkdirSync(resolvedProjectPath, { recursive: true });
    }

    const srcDir = path.join(resolvedProjectPath, 'src');
    const appDir = path.join(srcDir, 'app');
    const publicDir = path.join(resolvedProjectPath, 'public');

    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
    }

    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const packageJson = {
      name: name.toLowerCase().replace(/\s+/g, '-'),
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'eslint',
      },
      dependencies: {
        next: '^16.1.3',
        react: '^19.2.3',
        'react-dom': '^19.2.3',
      },
      devDependencies: {
        typescript: '^5.9.3',
        '@types/node': '^24.10.2',
        '@types/react': '^19.2.7',
        '@types/react-dom': '^19.2.3',
      },
    };

    fs.writeFileSync(path.join(resolvedProjectPath, 'package.json'), JSON.stringify(packageJson, null, 2));

    const layoutContent = `export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}`;

    const pageContent = `export default function Home() {
  return (
    <main>
      <h1>Welcome to ${name}</h1>
      <p>This is your new project!</p>
    </main>
  )
}`;

    fs.writeFileSync(path.join(appDir, 'layout.tsx'), layoutContent);
    fs.writeFileSync(path.join(appDir, 'page.tsx'), pageContent);

    return NextResponse.json({
      success: true,
      message: `Project ${name} created successfully`,
      projectPath,
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
        logSecurityWarning('projects/create', error.reason, rawInput);
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to create project:', error);
    return NextResponse.json(
      { error: 'Failed to create project', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
