import { CodeEditor } from '@/components/CodeEditor';
import { FileBrowser } from '@/components/FileBrowser';
import { PromptInput } from '@/components/PromptInput';
import { DevelopmentPlan } from '@/components/DevelopmentPlan';
import { DiffViewer } from '@/components/DiffViewer';
import { SettingsModal } from '@/components/SettingsModal';
import { useAppStore } from '@/lib/store';
import { useEffect } from 'react';

export default function Home() {
  const { sidebarOpen, diffViewerOpen, currentProject, addProject } = useAppStore();

  // Create demo project on first load
  useEffect(() => {
    if (!currentProject) {
      const demoProject = {
        id: 'demo',
        name: 'Demo Project',
        path: '/demo',
        files: [
          {
            name: 'index.html',
            path: 'index.html',
            type: 'file' as const
          },
          {
            name: 'styles.css',
            path: 'styles.css',
            type: 'file' as const
          },
          {
            name: 'script.js',
            path: 'script.js',
            type: 'file' as const
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      addProject(demoProject);
    }
  }, [currentProject, addProject]);

  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-neutral-800 border-b border-neutral-700 p-4">
        <h1 className="text-xl font-semibold">AI Code Assistant</h1>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - File Browser */}
        {sidebarOpen && (
          <div className="w-64 bg-neutral-800 border-r border-neutral-700">
            <FileBrowser />
          </div>
        )}

        {/* Main editor area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1">
            <CodeEditor />
          </div>

          {/* Prompt input */}
          <div className="border-t border-neutral-700">
            <PromptInput />
          </div>
        </div>

        {/* Right sidebar - Development Plan */}
        <div className="w-80 bg-neutral-800 border-l border-neutral-700">
          <DevelopmentPlan />
        </div>
      </div>

      {/* Diff Viewer Modal */}
      {diffViewerOpen && <DiffViewer />}

      {/* Settings Modal */}
      <SettingsModal />
    </main>
  );
}
