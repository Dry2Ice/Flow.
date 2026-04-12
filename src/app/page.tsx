"use client";

import { CodeEditor } from '@/components/CodeEditor';
import { FileBrowser } from '@/components/FileBrowser';
import { PromptInput } from '@/components/PromptInput';
import { DevelopmentPlan } from '@/components/DevelopmentPlan';
import { DiffViewer } from '@/components/DiffViewer';
import { SettingsModal } from '@/components/SettingsModal';
import { ProjectManager } from '@/components/ProjectManager';
import { useAppStore } from '@/lib/store';
import { useEffect, useState } from 'react';
import { FolderOpen, FileText } from 'lucide-react';

export default function Home() {
  const { sidebarOpen, diffViewerOpen, currentProject, projects, setCurrentProject } = useAppStore();
  const [activeTab, setActiveTab] = useState<'files' | 'projects'>('files');

  // Create demo project on first load
  useEffect(() => {
    if (projects.length === 0) {
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
        updatedAt: new Date(),
        isDemo: true
      };

      // Add demo project to store
      useAppStore.setState({
        projects: [demoProject],
        currentProject: demoProject
      });
    } else if (!currentProject && projects.length > 0) {
      // Set current project if none is selected
      setCurrentProject(projects[0]);
    }
  }, [projects, currentProject, setCurrentProject]);

  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-neutral-800 border-b border-neutral-700 p-4">
        <h1 className="text-xl font-semibold">AI Code Assistant</h1>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-96 bg-neutral-800 border-r border-neutral-700 flex flex-col">
            {/* Tab Navigation */}
            <div className="flex border-b border-neutral-700">
              <button
                onClick={() => setActiveTab('files')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'files'
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
                    : 'text-neutral-400 hover:text-neutral-300'
                }`}
              >
                <FileText className="w-4 h-4" />
                Files
              </button>
              <button
                onClick={() => setActiveTab('projects')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'projects'
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
                    : 'text-neutral-400 hover:text-neutral-300'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                Projects
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'files' && <FileBrowser />}
              {activeTab === 'projects' && <ProjectManager />}
            </div>
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
