// src/app/api/project/test/route.ts

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Test with current working directory
    const testPath = process.cwd();

    const entries = fs.readdirSync(testPath, { withFileTypes: true });
    const files = entries
      .filter(entry => entry.isFile())
      .slice(0, 10) // Limit to first 10 files
      .map(entry => ({
        name: entry.name,
        path: path.join(testPath, entry.name),
        size: fs.statSync(path.join(testPath, entry.name)).size
      }));

    return NextResponse.json({
      testPath,
      files,
      message: 'Project file reading is working'
    });
  } catch (error) {
    console.error('Test failed:', error);
    return NextResponse.json(
      { error: 'Project file reading test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}