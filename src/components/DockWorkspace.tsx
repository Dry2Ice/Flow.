'use client';

import { useEffect, useRef, useCallback, useState, lazy, Suspense, useMemo } from 'react';
import {
  DockviewReact,
  DockviewReadyEvent,
  IDockviewPanelProps,
  DockviewApi,
} from 'dockview';
import { FileBrowser } from '@/components/FileBrowser';
import { ProjectManager } from '@/components/ProjectManager';
import { AIChat } from '@/components/AIChat';
import { SystemLogsPanel } from '@/components/WorkspaceDiagnostics';
import { DevelopmentPlan } from '@/components/DevelopmentPlan';
import { PromptInput } from '@/components/PromptInput';
import { AIErrorBoundary } from '@/components/AIErrorBoundary';

// Lazy load heavy components
const CodeEditor = lazy(() => import('@/components/CodeEditor').then(module => ({ default: module.CodeEditor })));
const CodePreview = lazy(() => import('@/components/CodePreview').then(module => ({ default: module.CodePreview })));

// Loading skeleton for lazy components
const ComponentSkeleton = ({ title }: { title: string }) => (
  <div
    className="h-full flex items-center justify-center p-8"
    role="status"
    aria-label={`Loading ${title}`}
  >
    <div className="text-center">
      <div
        className="w-12 h-12 border-4 border-neutral-600 border-t-neutral-400 rounded-full animate-spin mx-auto mb-4"
        aria-hidden="true"
      />
      <p className="text-sm text-neutral-400">Loading {title}...</p>
    </div>
  </div>
);

// Panel accessibility configuration
const PANEL_ACCESSIBILITY = {
  files: {
    title: '📁 Files',
    ariaLabel: 'File browser panel - view and manage project files',
    description: 'Browse, open, and manage files in your project'
  },
  projects: {
    title: '🗂 Projects',
    ariaLabel: 'Project manager panel - create and switch between projects',
    description: 'Create new projects and switch between existing ones'
  },
  editor: {
    title: '✏️ Editor',
    ariaLabel: 'Code editor panel - write and edit source code',
    description: 'Monaco editor for writing and editing code files'
  },
  preview: {
    title: '👁 Preview',
    ariaLabel: 'Code preview panel - view rendered output',
    description: 'Live preview of HTML, CSS, and JavaScript code'
  },
  chat: {
    title: '💬 AI Chat',
    ariaLabel: 'AI chat panel - interact with AI assistant',
    description: 'Chat interface for AI-powered code assistance'
  },
  logs: {
    title: '📋 Logs',
    ariaLabel: 'System logs panel - view application logs and errors',
    description: 'View system logs, AI responses, and error messages'
  },
  plan: {
    title: '🎯 Dev Plan',
    ariaLabel: 'Development plan panel - track tasks and progress',
    description: 'Manage development tasks, track progress, and handle bugs'
  }
};

// Enhanced component wrapper with accessibility
const createAccessibleComponent = (
  Component: React.ReactNode,
  panelId: string
) => {
  const config = PANEL_ACCESSIBILITY[panelId as keyof typeof PANEL_ACCESSIBILITY];
  return (
    <div
      role="tabpanel"
      aria-labelledby={`${panelId}-tab`}
      aria-label={config.ariaLabel}
      aria-describedby={`${panelId}-description`}
      className="h-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-inset"
      tabIndex={-1}
    >
      <div id={`${panelId}-description`} className="sr-only">
        {config.description}
      </div>
      {Component}
    </div>
  );
};

// Map panel id → component with lazy loading and accessibility
const components: Record<string, React.FC<IDockviewPanelProps>> = {
  files: () => createAccessibleComponent(<FileBrowser />, 'files'),
  projects: () => createAccessibleComponent(<ProjectManager />, 'projects'),
  editor: () => createAccessibleComponent(
    <Suspense fallback={<ComponentSkeleton title="Code Editor" />}>
      <CodeEditor />
    </Suspense>,
    'editor'
  ),
  preview: () => createAccessibleComponent(
    <Suspense fallback={<ComponentSkeleton title="Code Preview" />}>
      <CodePreview />
    </Suspense>,
    'preview'
  ),
  chat: () => createAccessibleComponent(
    <div className="flex h-full flex-col">
      <AIErrorBoundary sessionId="chat-ai">
        <AIChat />
      </AIErrorBoundary>
      <PromptInput />
    </div>,
    'chat'
  ),
  logs: () => createAccessibleComponent(<SystemLogsPanel />, 'logs'),
  plan: () => createAccessibleComponent(
    <AIErrorBoundary sessionId="plan-ai">
      <DevelopmentPlan />
    </AIErrorBoundary>,
    'plan'
  ),
};

const LAYOUT_KEY = 'flow.dockview-layout.v1';

// Type definitions for dockview layout structure
interface DockviewLayout {
  grid: {
    root: GridNode;
  };
  panels: Record<string, { id: string; title: string; component: string; ariaLabel?: string }>;
  activeGroup?: string;
}

interface GridNode {
  type: 'branch' | 'leaf';
  orientation?: 'VERTICAL' | 'HORIZONTAL';
  data?: (GridNode | LeafNode)[];
  id: string;
  size?: number;
}

interface LeafNode {
  type: 'leaf';
  data: { views: string[] };
  id: string;
  size?: number;
}

const DEFAULT_LAYOUT: DockviewLayout = {
  grid: {
    root: {
      type: 'branch',
      orientation: 'VERTICAL',
      data: [
        {
          type: 'branch',
          orientation: 'HORIZONTAL',
          size: 70,
          data: [
            { 
              type: 'leaf', 
              data: { views: ['files', 'projects'] }, 
              id: 'left-group', 
              size: 20 
            },
            {
              type: 'branch',
              orientation: 'HORIZONTAL',
              id: 'center-branch',
              data: [
                { 
                  type: 'leaf', 
                  data: { views: ['editor'] }, 
                  id: 'editor-group', 
                  size: 50 
                },
                { 
                  type: 'leaf', 
                  data: { views: ['preview'] }, 
                  id: 'preview-group', 
                  size: 50 
                },
              ],
            },
            { 
              type: 'leaf', 
              data: { views: ['chat', 'logs'] }, 
              id: 'right-group', 
              size: 25 
            },
          ],
        },
        { 
          type: 'leaf', 
          data: { views: ['plan'] }, 
          id: 'bottom-group', 
          size: 30 
        },
      ],
      id: 'root',
    },
    // REMOVED: width, height, and duplicate orientation at grid level
    // These fields are not part of dockview's expected schema and can cause validation errors
  },
  panels: {
    files: {
      id: 'files',
      title: PANEL_ACCESSIBILITY.files.title,
      component: 'files',
      ariaLabel: PANEL_ACCESSIBILITY.files.ariaLabel
    },
    projects: {
      id: 'projects',
      title: PANEL_ACCESSIBILITY.projects.title,
      component: 'projects',
      ariaLabel: PANEL_ACCESSIBILITY.projects.ariaLabel
    },
    editor: {
      id: 'editor',
      title: PANEL_ACCESSIBILITY.editor.title,
      component: 'editor',
      ariaLabel: PANEL_ACCESSIBILITY.editor.ariaLabel
    },
    preview: {
      id: 'preview',
      title: PANEL_ACCESSIBILITY.preview.title,
      component: 'preview',
      ariaLabel: PANEL_ACCESSIBILITY.preview.ariaLabel
    },
    chat: {
      id: 'chat',
      title: PANEL_ACCESSIBILITY.chat.title,
      component: 'chat',
      ariaLabel: PANEL_ACCESSIBILITY.chat.ariaLabel
    },
    logs: {
      id: 'logs',
      title: PANEL_ACCESSIBILITY.logs.title,
      component: 'logs',
      ariaLabel: PANEL_ACCESSIBILITY.logs.ariaLabel
    },
    plan: {
      id: 'plan',
      title: PANEL_ACCESSIBILITY.plan.title,
      component: 'plan',
      ariaLabel: PANEL_ACCESSIBILITY.plan.ariaLabel
    },
  },
  activeGroup: 'editor-group',
};

interface DockWorkspaceProps {
  onResetLayout?: (resetFn: () => void) => void;
}

export function DockWorkspace({ onResetLayout }: DockWorkspaceProps) {
  const apiRef = useRef<DockviewApi | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [layoutSaved, setLayoutSaved] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Keyboard navigation support
  const panelOrder = useMemo(() => ['files', 'projects', 'editor', 'preview', 'chat', 'logs', 'plan'], []);

  const handleKeyboardNavigation = useCallback((event: KeyboardEvent) => {
    if (!apiRef.current) return;

    const activeGroup = apiRef.current.activeGroup;
    if (!activeGroup) return;

    const currentIndex = panelOrder.findIndex(id =>
      activeGroup.panels.some(panel => panel.id === id)
    );

    if (currentIndex === -1) return;

    let targetIndex = currentIndex;

    // Handle arrow key navigation
    if (event.ctrlKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      targetIndex = Math.max(0, currentIndex - 1);
    } else if (event.ctrlKey && event.key === 'ArrowRight') {
      event.preventDefault();
      targetIndex = Math.min(panelOrder.length - 1, currentIndex + 1);
    }

    if (targetIndex !== currentIndex) {
      const targetPanelId = panelOrder[targetIndex];
      const targetPanel = activeGroup.panels.find(p => p.id === targetPanelId);
      if (targetPanel) {
        activeGroup.focus();
        // Focus will be managed by dockview's internal focus management
      }
    }
  }, [panelOrder]);

  // Add keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardNavigation);
    return () => document.removeEventListener('keydown', handleKeyboardNavigation);
  }, [handleKeyboardNavigation]);

  // Debounced layout save (500ms delay)
  const saveLayout = useCallback(() => {
    if (!apiRef.current) return;

    // Set unsaved changes flag immediately
    setUnsavedChanges(true);

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const layout = apiRef.current!.toJSON();
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
        setLayoutSaved(true);
        setUnsavedChanges(false);
        setTimeout(() => setLayoutSaved(false), 2000); // Hide indicator after 2s
      } catch {
        // ignore save errors
      }
    }, 500);
  }, []);

  const loadLayout = useCallback((api: DockviewApi) => {
    try {
      const saved = localStorage.getItem(LAYOUT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate that the saved layout has valid structure
        if (parsed && typeof parsed === 'object') {
          // Comprehensive validation: check grid structure, string ids, and leaf data
          const isValidLayout = validateLayout(parsed);
          if (isValidLayout) {
            try {
              api.fromJSON(parsed);
              return;
            } catch (fromJsonError) {
              console.warn('[DockWorkspace] fromJSON failed with saved layout, clearing and using default:', fromJsonError);
              localStorage.removeItem(LAYOUT_KEY);
            }
          } else {
            console.warn('[DockWorkspace] Invalid layout structure detected, clearing and using default');
            localStorage.removeItem(LAYOUT_KEY);
          }
        }
      }
    } catch (error) {
      console.warn('[DockWorkspace] Failed to load saved layout, using default:', error);
      // Clear potentially corrupted data
      localStorage.removeItem(LAYOUT_KEY);
      // fall through to default layout
    }
    // Load default layout as fallback
    api.fromJSON(DEFAULT_LAYOUT);
  }, []);

  /**
   * Validates dockview layout structure to ensure compatibility.
   * Checks:
   * - All nodes have string ids (required by dockview for group identification)
   * - Leaf nodes have data.views as string array
   * - No extraneous fields at grid level (width, height, orientation cause errors)
   */
  const validateLayout = (layout: unknown): boolean => {
    // Basic structure check
    if (!layout || typeof layout !== 'object') {
      console.warn('[DockWorkspace] Layout is not an object');
      return false;
    }

    const layoutObj = layout as Record<string, unknown>;
    
    // Check required top-level properties
    if (!layoutObj.grid || typeof layoutObj.grid !== 'object') {
      console.warn('[DockWorkspace] Missing or invalid grid property');
      return false;
    }

    const gridObj = layoutObj.grid as Record<string, unknown>;
    
    if (!gridObj.root || typeof gridObj.root !== 'object') {
      console.warn('[DockWorkspace] Missing or invalid grid.root property');
      return false;
    }

    // Validate node recursively
    const validateNode = (node: unknown, depth = 0): boolean => {
      if (!node || typeof node !== 'object') {
        console.warn(`[DockWorkspace] Node at depth ${depth} is not an object`);
        return false;
      }

      const nodeObj = node as Record<string, unknown>;

      // Check id exists and is a non-empty string (critical for dockview)
      if (typeof nodeObj.id !== 'string' || nodeObj.id.trim() === '') {
        console.warn(`[DockWorkspace] Invalid node id at depth ${depth}:`, nodeObj.id);
        return false;
      }

      // Check type field
      const nodeType = nodeObj.type;
      if (nodeType !== 'branch' && nodeType !== 'leaf') {
        console.warn(`[DockWorkspace] Invalid node type at depth ${depth}:`, nodeType);
        return false;
      }

      // For leaf nodes, validate data.views
      if (nodeType === 'leaf') {
        const data = nodeObj.data;
        if (!data || typeof data !== 'object') {
          console.warn(`[DockWorkspace] Leaf node "${nodeObj.id}" missing data property`);
          return false;
        }
        const dataObj = data as Record<string, unknown>;
        if (!Array.isArray(dataObj.views)) {
          console.warn(`[DockWorkspace] Leaf node "${nodeObj.id}" missing views array`);
          return false;
        }
        // Ensure all views are strings
        if (!dataObj.views.every((v: unknown) => typeof v === 'string')) {
          console.warn(`[DockWorkspace] Leaf node "${nodeObj.id}" has non-string views`);
          return false;
        }
      }

      // Recursively validate child nodes in data array
      if (nodeObj.data && Array.isArray(nodeObj.data)) {
        for (const child of nodeObj.data) {
          if (!validateNode(child, depth + 1)) {
            return false;
          }
        }
      }

      return true;
    };

    try {
      const rootObj = gridObj.root as Record<string, unknown>;
      
      // Check for extraneous fields at grid level that can cause dockview errors
      const extraneousFields = ['width', 'height'];
      for (const field of extraneousFields) {
        if (field in gridObj) {
          console.warn(`[DockWorkspace] Extraneous field "${field}" at grid level may cause issues`);
        }
      }

      return validateNode(rootObj);
    } catch (error) {
      console.error('[DockWorkspace] Layout validation threw exception:', error);
      return false;
    }
  };

  const resetLayout = useCallback(() => {
    if (!apiRef.current) return;
    localStorage.removeItem(LAYOUT_KEY);
    apiRef.current.fromJSON(DEFAULT_LAYOUT);
  }, []);

  // Cleanup timeout on unmount and save immediately
  useEffect(() => {
    return () => {
      // Save immediately on unmount if there are unsaved changes
      if (saveTimeoutRef.current && unsavedChanges && apiRef.current) {
        clearTimeout(saveTimeoutRef.current);
        try {
          const layout = apiRef.current.toJSON();
          localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
        } catch {
          // ignore save errors on unmount
        }
      } else if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [unsavedChanges]);

  useEffect(() => {
    onResetLayout?.(resetLayout);
  }, [resetLayout, onResetLayout]);

  const onReady = useCallback((event: DockviewReadyEvent) => {
    apiRef.current = event.api;
    event.api.onDidLayoutChange(() => saveLayout());
    loadLayout(event.api);
  }, [loadLayout, saveLayout]);

  return (
    <div className="relative h-full w-full">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Skip to main content
      </a>

      <div
        id="main-content"
        role="main"
        aria-label="Flow IDE workspace with dockable panels"
        className="h-full w-full"
      >
        <DockviewReact
          className="dockview-theme-dark h-full w-full dockview-accessible"
          components={components}
          onReady={onReady}
          singleTabMode="fullwidth"
        />
      </div>

      {/* Layout indicators with better accessibility */}
      {layoutSaved && (
        <div
          className="absolute top-4 right-4 z-50 animate-fade-in"
          role="status"
          aria-live="polite"
          aria-label="Layout changes saved successfully"
        >
          <div className="bg-green-600/90 text-green-100 px-3 py-1 rounded-md text-sm font-medium shadow-lg backdrop-blur-sm border border-green-500/30">
            Layout saved
          </div>
        </div>
      )}

      {unsavedChanges && !layoutSaved && (
        <div
          className="absolute top-4 right-4 z-50"
          role="status"
          aria-live="polite"
          aria-label="Saving layout changes"
        >
          <div className="bg-amber-600/90 text-amber-100 px-3 py-1 rounded-md text-sm font-medium shadow-lg backdrop-blur-sm flex items-center gap-2 border border-amber-500/30">
            <div className="w-2 h-2 bg-amber-300 rounded-full animate-pulse" aria-hidden="true" />
            Saving layout...
          </div>
        </div>
      )}
    </div>
  );
}
