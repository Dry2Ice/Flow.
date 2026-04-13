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
- [x] Customizable resizable workspace layout with five distinct zones (Files/Projects, Code+Preview, Chat/Logs, Plan/Bugs, Statistics)
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
- [x] Compact segmented AI preset control (chip-style) with responsive wrapping, keyboard focus states, and dual-theme contrast tuning
- [x] Dark/Light mode toggle with smooth transitions and persistent preferences
- [x] Tailwind v4 dark variant now bound to `.dark` class in `globals.css` so ThemeToggle class-based switching applies `dark:` utilities correctly
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
- [x] Five independent workspace zones: Files/Projects, Code+Preview, Chat/Logs, Plan/Bugs, and dedicated Statistics panel
- [x] Centralized control buttons in header center (Statistics focus, Theme toggle, Settings)
- [x] Resizable panel system allowing customization of all five workspace zones
- [x] Real-time project metrics including token consumption, language distribution, file sizes, and development activity
- [x] Prompt preset editing now updates Zustand store state directly and persists `promptPresets`/`activePreset` to localStorage via selector subscriptions
- [x] Nvidia NIM token settings now preserve user-provided integer values for `contextTokens` and `maxTokens` across UI parsing, API validation, and outbound request payloads
- [x] Trusted-root allowlist for project APIs: absolute project paths now require explicit trusted root confirmation while preserving traversal/out-of-bound protections
- [x] Configurable project indexing policies in `POST /api/project/files` (extensions, depth/file/size limits) with optional full-scan mode and skipped-files completeness reporting
- [x] Ultra Mode request execution now passes per-step `presetId` directly into request dispatch to avoid active preset race conditions; UI preset switch updates once after workflow completion
- [x] Sequential plan execution in DevelopmentPlan: plan-level run now executes related tasks one by one with progress indicator, start/finish logs, and status rollup based on task outcomes
- [x] HTML preview runtime errors are now captured via iframe `onLoad` listener and logged into session logs (`program_run`) using store `addLog`
- [x] Light theme activation fixed by defining Tailwind `@variant light` in globals and toggling `.light` class alongside `.dark` in ThemeToggle to ensure `light:` utilities apply correctly
- [x] Removed unused legacy `SettingsButton` event-dispatch helper from `src/app/page.tsx` to keep modal-opening flow consistent with direct state control
- [x] AI responses now support structured FILE blocks that are parsed/applied to in-memory editor state and persisted to disk for non-demo projects
- [x] Demo-project AI edits now emit an informational log entry clarifying that changes are applied in-editor only and intentionally not written to disk

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
| 2026-04-12 | Hardened project API routes with WORKSPACE_ROOT validation, traversal prevention, recursion/file-count limits, and security warning logs |
| Initial | Template created with base setup |
| 2026-04-12 | Hardened `POST /api/projects/create` with explicit `src/app` directory creation, robust file-write error handling, generated `tsconfig.json` + `.gitignore`, and response metadata for created files/directories |
| 2026-04-12 | Added multi-session chat/request architecture, per-job cancel/retry flow, and execution manager integration |
| 2026-04-12 | Hardened AI request orchestration with dependency-aware dispatch and fixed request status lifecycle |
| 2026-04-12 | Refactored `analyzeProjectStructure` in `src/lib/nvidia-nim.ts`: removed duplicate structure summary block, moved all per-file logic into `forEach`, replaced out-of-scope `content` usage with `hasExpress`, and introduced strict analysis types (`ProjectStructureAnalysis`, `ProjectFileForAnalysis`). |
| 2026-04-12 | Improved AI workflow efficiency: enabled parallel prompt submissions, added per-session active request counters, attached project context snapshots to each AI request, and introduced adaptive context summarization timeline/focus areas. |
| 2026-04-13 | Updated Settings modal preset saving to call `updatePromptPreset` action; added `useAppStore.subscribe` selectors to persist prompt presets and active preset id in localStorage so edited prompts survive reload and are reflected immediately in PromptInput flows. |
| 2026-04-13 | Updated NIM configuration flow to accept `contextTokens = 0` as unlimited: backend validation now allows zero, request builder explicitly omits `context_tokens` when value is zero, and Settings modal helper text/input handling now matches the backend contract. |
| 2026-04-13 | Relaxed token constraints end-to-end: removed `min`/`max` HTML limits for Context/Max tokens, replaced fallback parsing with safe integer parsing in Settings modal, loosened API validation for these fields to integer-only checks, and updated NIM request builder to forward exact user-provided integer values (except invalid inputs). |
| 2026-04-13 | Added trusted-root allowlist mode for project path resolution: `POST /api/projects/create`, `POST /api/projects/load`, and `POST /api/project/files` now support explicit `trustedRoot` + `confirmTrustedRoot` registration to allow absolute paths without disabling workspace boundary protections. |
| 2026-04-13 | Rebuilt `Allotment` workspace into five independent horizontal panels (Files/Projects, Code+Preview, Chat/Logs, Plan/Bugs, Statistics), added persisted `statsPanel` sizing with updated defaults/reset behavior, and changed top-bar statistics button to focus/open the dedicated statistics panel instead of swapping left content. |
| 2026-04-13 | Refactored `POST /api/project/files` indexing into explicit policies (default/full) with configurable extension/depth/file-size limits, added full-scan performance warning mode via request flag, and introduced skipped-files report grouped by reason (`size`/`type`/`limit`) for context completeness visibility. |
| 2026-04-13 | Redesigned `PromptInput` preset selector into compact segmented chips, reduced prompt submit button footprint, and tuned hover/focus behavior for accessibility plus narrow-screen resilience in both themes. |
| 2026-04-13 | Fixed `PromptInput` Ultra Mode preset race condition by adding optional `presetId` to `runRequest`, forwarding it into request preset resolution, and deferring `setActivePreset` until the full Ultra Mode loop completes. |
| 2026-04-13 | Updated `DevelopmentPlan` plan execution flow: if a plan has related tasks, run `handleExecuteTask` sequentially (await each), show live `current / total` progress near the execute button, add start/end execution logs in Russian, and roll up final plan status from task statuses (`completed` / `in_progress`). |
| 2026-04-13 | Header AI status is now derived from `nim-settings` presence (`apiKey` + `baseUrl`), listens to `settings-saved` window events for live updates, and `SettingsModal` now dispatches `settings-saved` after successful configuration save. |
| 2026-04-13 | Added runtime error interception for HTML preview iframe in `CodePreview` via `onLoad` + `contentWindow.error` listener, logging session-scoped errors to store logs. |
| 2026-04-13 | Unified workspace center split defaults by setting `panelSizes.centerVertical` initial state to `60`, matching `SettingsModal` reset layout defaults so Code+Preview vertical proportions reset consistently. |
| 2026-04-13 | Added `@variant dark (&:where(.dark, .dark *));` in `src/app/globals.css` to switch Tailwind v4 dark mode from media-query-based behavior to `.dark` class-based behavior used by `ThemeToggle`; verified `src/app/layout.tsx` `<html>` has no hardcoded `dark`/`light` class. |
| 2026-04-13 | Reduced five primary workspace pane minimum widths to 180/280 thresholds and rebalanced default horizontal layout percentages (`17/36/19/16/12`) across store initialization and Settings reset to prevent minSize overflow and horizontal scrollbar pressure at default viewport widths. |
| 2026-04-13 | Replaced starter metadata in `src/app/layout.tsx` with Flow-specific title/description and gated header "Ultra Mode Ready"/"Real-time Sync" status chips behind configured API + non-demo project checks in `src/app/page.tsx`. |

| 2026-04-13 | Fixed AI file-application pipeline: NIM system prompt now mandates `<<<FILE>>>` blocks, parser extracts file edits into `changes`, and executor applies updates to open files plus writes non-demo project changes to disk via `/api/project/file/write`. |
| 2026-04-13 | Added demo-mode AI file-change logging in executor so users see that edits are applied in-memory and intentionally skipped for disk persistence when working in the demo project. |
