import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  getWorkspaceRoot,
  logSecurityWarning,
  resolveWorkspacePath,
  WorkspaceSecurityError,
} from '@/lib/workspace-security';

function ensureDirectory(dirPath: string, createdDirectories: string[]) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    createdDirectories.push(dirPath);
  }
}

function writeFileWithErrorHandling(
  filePath: string,
  content: string,
  createdFiles: string[]
) {
  try {
    fs.writeFileSync(filePath, content);
    createdFiles.push(filePath);
  } catch (error) {
    throw new Error(
      `Failed to write file "${filePath}": ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, path: projectPath } = await request.json();
    const createdDirectories: string[] = [];
    const createdFiles: string[] = [];

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const workspaceRoot = getWorkspaceRoot();
    const resolvedProjectPath = resolveWorkspacePath(projectPath, workspaceRoot);
    const createdDirectories: string[] = [];
    const createdFiles: string[] = [];

    ensureDirectory(resolvedProjectPath, createdDirectories);

    const srcDir = path.join(resolvedProjectPath, 'src');
    const appDir = path.join(srcDir, 'app');
    const publicDir = path.join(resolvedProjectPath, 'public');

    ensureDirectory(appDir, createdDirectories);
    ensureDirectory(publicDir, createdDirectories);

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

    writeFileWithErrorHandling(
      path.join(resolvedProjectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      createdFiles
    );

    const tsconfigContent = JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          lib: ['dom', 'dom.iterable', 'esnext'],
          strict: true,
          noEmit: true,
          module: 'esnext',
          moduleResolution: 'bundler',
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: 'preserve',
          incremental: true,
          plugins: [{ name: 'next' }]
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
        exclude: ['node_modules']
      },
      null,
      2
    );

    writeFileWithErrorHandling(
      path.join(resolvedProjectPath, 'tsconfig.json'),
      tsconfigContent,
      createdFiles
    );

    const gitignoreContent = `.next
node_modules
out
.env
.env.local
.env.*.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
`;

    writeFileWithErrorHandling(
      path.join(resolvedProjectPath, '.gitignore'),
      gitignoreContent,
      createdFiles
    );

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

    writeFileWithErrorHandling(path.join(appDir, 'layout.tsx'), layoutContent, createdFiles);
    writeFileWithErrorHandling(path.join(appDir, 'page.tsx'), pageContent, createdFiles);

    return NextResponse.json({
      success: true,
      message: `Project ${name} created successfully at ${projectPath}`,
      created: {
        directories: createdDirectories,
        files: createdFiles
      }
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
