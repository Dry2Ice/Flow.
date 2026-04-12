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
- [x] Flow interface with Monaco editor - modern AI-powered development environment
- [x] Nvidia NIM API integration with comprehensive settings
- [x] File browser and project management
- [x] Development plan tracking system
- [x] Code diff viewer
- [x] Prompt input for AI interaction
- [x] Git integration for version control and rollbacks
- [x] Advanced AI generation parameters (temperature, top-p, top-k, penalties, context limits)
- [x] Persistent settings storage in localStorage
- [x] AI behavior presets (bug detection, analysis, development) with modern card-based selection
- [x] Editable system prompts for custom AI behavior
- [x] General system prompt with core development principles
- [x] Ultra Mode: 3-step comprehensive code enhancement workflow (Analysis → Development → Bug Fixing)
- [x] Project directory integration for full codebase context
- [x] Local file system integration with intelligent context limiting
- [x] Progress tracking for automated multi-step operations
- [x] Enhanced code interaction with precise line referencing
- [x] Rich file metadata and structural code analysis
- [x] Professional Monaco Editor with advanced features
- [x] Context-aware file prioritization and analysis
- [x] Customizable resizable workspace layout with five distinct zones (Files/Stats, Code+Preview, Plans, Chat, Analytics)
- [x] Interactive planning system with hierarchical task management
- [x] Auto-execution capabilities for plans and tasks with preset switching
- [x] Multi-status task tracking (pending, in-progress, partially-completed, completed)
- [x] AI-powered task checking and execution with Code Analysis & Active Development presets
- [x] Item-level task breakdown with individual completion tracking
- [x] Comprehensive logging system for AI operations and system events
- [x] Bug tracking system with severity levels and resolution tracking
- [x] Dual-mode chat/logs interface for AI interactions
- [x] Plans/bugs tabbed interface for project management
- [x] Horizontal and vertical panel splitting for optimal workflow
- [x] Live code preview with HTML rendering and execution simulation
- [x] Persistent panel sizing with reset to default functionality
- [x] Multi-project support with automatic and manual project creation
- [x] Project manager with tabbed interface for files and projects
- [x] API endpoints for project creation and loading
- [x] Persistent project management and switching
- [x] Hardened project creation API with safe app dir creation, per-file write errors, template tsconfig/.gitignore, and created paths response
- [x] Workspace-scoped API path hardening (env-based root, traversal blocking, recursion caps, security warning logs)
- [x] Session-aware AI chat state with isolated message/history per session
- [x] Job-level AI request tracking with `sessionId`/`jobId` for requests, logs, and messages
- [x] Job execution manager with per-job cancel/retry controls via `AbortController`
- [x] UI session switcher with scoped chat/log filtering to prevent cross-task mixing
- [x] AI request scheduler now supports blocked state, dependency checks over full queue, atomic pending→running claims, and recursive dispatch after batch completion
- [x] Session generation tracking now supports concurrent requests via `activeRequests` counters to prevent false idle states
- [x] Prompt pipeline now supports parallel user submissions without global input lock
- [x] Per-request project context snapshot is attached to each AI call for isolation
- [x] Project context now includes adaptive focus areas and rolling summary timeline for periodic systematization
- [x] Ultra Mode preset selection locked during execution to prevent interference
- [x] Modern Flow branding with gradient header and enhanced visual hierarchy
- [x] Comprehensive Analytics Dashboard with real-time metrics and project insights
- [x] Card-based AI preset selection with visual indicators and modern styling
- [x] Dark/Light mode toggle with smooth transitions and persistent preferences
- [x] Enhanced demo project with modern landing page showcasing Flow features
- [x] Improved onboarding experience with detailed task breakdown and feature highlights
- [x] Advanced Flow color palette with brand-specific gradients and CSS variables
- [x] Smooth animations and micro-interactions throughout the interface (fade-in, slide-in, hover effects)
- [x] Circular progress indicators in analytics dashboard with animated rings
- [x] Enhanced visual hierarchy with glassmorphism effects and backdrop blur
- [x] Improved typography with gradient text effects and better font weights
- [x] Custom scrollbar styling for better visual consistency
- [x] Interactive tab navigation with animated indicators and hover states
- [x] Enhanced Ultra Mode UI with progress animations and visual feedback
- [x] Professional request history with status badges and action buttons
- [x] Live status indicators and real-time updates throughout the interface
- [x] Comprehensive dark/light mode support across all components with proper color theming
- [x] Theme-aware gradients, borders, backgrounds, and text colors throughout the application
- [x] Smooth theme transitions with proper contrast ratios and accessibility
- [x] Enhanced theme toggle with tooltip and visual feedback
- [x] Comprehensive Project Statistics dashboard with file analysis, language distribution, code metrics, AI usage tracking, and project health indicators
- [x] Five-zone workspace layout: Files/Statistics (left), Code+Preview (center), Plans (right-top), Chat (right-bottom), Analytics (integrated)
- [x] Centralized control buttons in header center (Statistics toggle, Theme toggle, Settings)
- [x] Resizable panel system allowing customization of all five workspace zones
- [x] Real-time project metrics including token consumption, language distribution, file sizes, and development activity
- [x] Unified AI executor service extracted from `PromptInput` and reused by Development Plan actions with preset-based routing (`analyze` / `develop` / `debug`)
- [x] Development Plan/Bug actions now execute real AI calls, update status + `lastChecked`, and write action/result logs
- [x] Secure file-level read/write API routes with workspace path validation, binary-file detection, permission handling, and write conflict detection
- [x] File browser now loads real file contents from project API instead of placeholder text
- [x] Code editor now supports explicit save/reload workflow (Ctrl/Cmd+S) wired to project file API with conflict/error feedback
- [x] Editable prompt presets now persist in localStorage and are restored on app startup
- [x] Prompt preset updates now immediately refresh the selected preset context used by PromptInput

## Current Structure

| File/Directory | Purpose | Status |
|----------------|---------|--------|
| `src/app/page.tsx` | Main Flow interface | ✅ Ready |
| `src/app/layout.tsx` | Root layout | ✅ Ready |
| `src/app/globals.css` | Global styles | ✅ Ready |
| `src/components/` | React components for the app | ✅ Ready |
| `src/lib/` | Utilities and services | ✅ Ready |
| `src/types/` | TypeScript type definitions | ✅ Ready |
| `.kilocode/` | AI context & recipes | ✅ Ready |

## Current Focus

Flow application is ready for use:

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
| 2026-04-12 | Replaced DevelopmentPlan placeholders with real AI execution via shared `executeAIRequest` service; added preset routing for check/execute/fix flows and post-response status/lastChecked/log updates |
| 2026-04-12 | Added persistent prompt preset storage/loading in Zustand store, implemented `updatePromptPreset`, and wired SettingsModal preset saving to update active PromptInput system prompt immediately |
| 2026-04-12 | Resolved npm dependency installation issue by removing legacy `react-diff-viewer` (React 15/16 peer requirement), keeping `react-diff-viewer-continued`, and generating an npm `package-lock.json` so `npm ci` works reliably |
| 2026-04-12 | Hardened project API routes with WORKSPACE_ROOT validation, traversal prevention, recursion/file-count limits, and security warning logs |
| Initial | Template created with base setup |
| 2026-04-12 | Hardened `POST /api/projects/create` with explicit `src/app` directory creation, robust file-write error handling, generated `tsconfig.json` + `.gitignore`, and response metadata for created files/directories |
| 2026-04-12 | Added multi-session chat/request architecture, per-job cancel/retry flow, and execution manager integration |
| 2026-04-12 | Hardened AI request orchestration with dependency-aware dispatch and fixed request status lifecycle |
| 2026-04-12 | Refactored `analyzeProjectStructure` in `src/lib/nvidia-nim.ts`: removed duplicate structure summary block, moved all per-file logic into `forEach`, replaced out-of-scope `content` usage with `hasExpress`, and introduced strict analysis types (`ProjectStructureAnalysis`, `ProjectFileForAnalysis`). |
| 2026-04-12 | Improved AI workflow efficiency: enabled parallel prompt submissions, added per-session active request counters, attached project context snapshots to each AI request, and introduced adaptive context summarization timeline/focus areas. |
| 2026-04-12 | Added `/api/project/file/read` and `/api/project/file/write` routes secured by `workspace-security`; integrated file browser loading and editor save/reload with permission/binary/conflict error handling. |
| 2026-04-12 | Updated Nvidia NIM config API validation to accept and validate all generation fields (temperature/topP/topK/contextTokens/maxTokens/penalties/stopSequences) and hardened NIM request body construction against NaN, invalid ranges, and empty stop arrays. |
