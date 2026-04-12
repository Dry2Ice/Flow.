// src/app/api/projects/create/route.ts

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { name, path: projectPath } = await request.json();

    if (!name || !projectPath) {
      return NextResponse.json(
        { error: 'Name and path are required' },
        { status: 400 }
      );
    }

    // Create project directory if it doesn't exist
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    // Create basic project structure
    const srcDir = path.join(projectPath, 'src');
    const publicDir = path.join(projectPath, 'public');

    if (!fs.existsSync(srcDir)) {
      fs.mkdirSync(srcDir, { recursive: true });
    }

    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Create basic files
    const packageJson = {
      name: name.toLowerCase().replace(/\s+/g, '-'),
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'eslint'
      },
      dependencies: {
        next: '^16.1.3',
        react: '^19.2.3',
        'react-dom': '^19.2.3'
      },
      devDependencies: {
        typescript: '^5.9.3',
        '@types/node': '^24.10.2',
        '@types/react': '^19.2.7',
        '@types/react-dom': '^19.2.3'
      }
    };

    fs.writeFileSync(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create basic Next.js files
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

    fs.writeFileSync(path.join(srcDir, 'app', 'layout.tsx'), layoutContent);
    fs.writeFileSync(path.join(srcDir, 'app', 'page.tsx'), pageContent);

    return NextResponse.json({
      success: true,
      message: `Project ${name} created successfully at ${projectPath}`
    });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json(
      { error: 'Failed to create project', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}