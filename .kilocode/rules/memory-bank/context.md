# Active Context: Next.js Starter Template

## Current State

**Template Status**: ✅ Ready for development

The template is a clean Next.js 16 starter with TypeScript and Tailwind CSS 4. It's ready for AI-assisted expansion to build any type of application.

## Recently Completed

- [x] Base Next.js 16 setup with App Router
- [x] TypeScript configuration with strict mode
- [x] Tailwind CSS 4 integration
- [x] ESLint configuration
- [x] Memory bank documentation
- [x] Recipe system for common features
- [x] AI Code Assistant interface with Monaco editor
- [x] Nvidia NIM API integration with comprehensive settings
- [x] File browser and project management
- [x] Development plan tracking system
- [x] Code diff viewer
- [x] Prompt input for AI interaction
- [x] Git integration for version control and rollbacks
- [x] Advanced AI generation parameters (temperature, top-p, top-k, penalties, context limits)
- [x] Persistent settings storage in localStorage
- [x] AI behavior presets (bug detection, analysis, development) with inline switching
- [x] Editable system prompts for custom AI behavior
- [x] Ultra Mode: 4-step comprehensive code enhancement workflow
- [x] Project directory integration for full codebase context
- [x] Local file system integration with intelligent context limiting
- [x] Progress tracking for automated multi-step operations

## Current Structure

| File/Directory | Purpose | Status |
|----------------|---------|--------|
| `src/app/page.tsx` | Main AI Code Assistant interface | ✅ Ready |
| `src/app/layout.tsx` | Root layout | ✅ Ready |
| `src/app/globals.css` | Global styles | ✅ Ready |
| `src/components/` | React components for the app | ✅ Ready |
| `src/lib/` | Utilities and services | ✅ Ready |
| `src/types/` | TypeScript type definitions | ✅ Ready |
| `.kilocode/` | AI context & recipes | ✅ Ready |

## Current Focus

AI Code Assistant application is ready for use:

1. Configure Nvidia NIM API in settings (gear icon)
2. Start coding by selecting files from the demo project
3. Use the prompt input at the bottom to ask AI for code generation
4. Track development tasks in the right panel
5. View code changes in the diff viewer

## Quick Start Guide

### To add a new page:

Create a file at `src/app/[route]/page.tsx`:
```tsx
export default function NewPage() {
  return <div>New page content</div>;
}
```

### To add components:

Create `src/components/` directory and add components:
```tsx
// src/components/ui/Button.tsx
export function Button({ children }: { children: React.ReactNode }) {
  return <button className="px-4 py-2 bg-blue-600 text-white rounded">{children}</button>;
}
```

### To add a database:

Follow `.kilocode/recipes/add-database.md`

### To add API routes:

Create `src/app/api/[route]/route.ts`:
```tsx
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Hello" });
}
```

## Available Recipes

| Recipe | File | Use Case |
|--------|------|----------|
| Add Database | `.kilocode/recipes/add-database.md` | Data persistence with Drizzle + SQLite |

## Pending Improvements

- [ ] Add more recipes (auth, email, etc.)
- [ ] Add example components
- [ ] Add testing setup recipe

## Session History

| Date | Changes |
|------|---------|
| Initial | Template created with base setup |
