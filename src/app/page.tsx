"use client";

import { CodeEditor } from '@/components/CodeEditor';
import { FileBrowser } from '@/components/FileBrowser';
import { PromptInput } from '@/components/PromptInput';
import { DevelopmentPlan } from '@/components/DevelopmentPlan';
import { DiffViewer } from '@/components/DiffViewer';
import { SettingsModal } from '@/components/SettingsModal';
import { ProjectManager } from '@/components/ProjectManager';
import { CodePreview } from '@/components/CodePreview';
import { AIChat } from '@/components/AIChat';
import { useAppStore } from '@/lib/store';
import { useEffect, useState } from 'react';
import { FolderOpen, FileText } from 'lucide-react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';

export default function Home() {
  const { sidebarOpen, diffViewerOpen, currentProject, projects, setCurrentProject, panelSizes, setPanelSizes } = useAppStore();
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

      // Add demo project to store and open a default file
      const { openFile } = useAppStore.getState();
      useAppStore.setState({
        projects: [demoProject],
        currentProject: demoProject
      });

      // Open the HTML file by default to show content
      const htmlFile = demoProject.files.find(f => f.name === 'index.html');
      if (htmlFile) {
        openFile(htmlFile.path, `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Demo Project</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>Welcome to AI Code Assistant</h1>
        <p>This is a demo HTML file. You can edit it and see the preview update in real-time!</p>
        <button onclick="alert('Hello from AI Code Assistant!')">Click me!</button>
    </div>
    <script src="script.js"></script>
</body>
</html>`);
      }

      // Create demo plan and task
      const { addPlan, addTask } = useAppStore.getState();
      const demoPlan = {
        id: 'demo-plan',
        title: 'Demo Development Plan',
        description: 'A sample development plan to demonstrate the planning features',
        status: 'pending' as const,
        tasks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const demoTask = {
        id: 'demo-task',
        title: 'Welcome to AI Code Assistant',
        description: 'Get familiar with the AI-powered development environment',
        status: 'pending' as const,
        priority: 'medium' as const,
        items: [
          { id: 'item-1', title: 'Explore the code editor with syntax highlighting', completed: false, createdAt: new Date() },
          { id: 'item-2', title: 'Try the live HTML preview feature', completed: false, createdAt: new Date() },
          { id: 'item-3', title: 'Check out the AI chat interface', completed: false, createdAt: new Date() },
          { id: 'item-4', title: 'Create your first custom development plan', completed: false, createdAt: new Date() },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      addPlan(demoPlan);
      addTask(demoTask);
    } else if (!currentProject && projects.length > 0) {
      // Set current project if none is selected
      setCurrentProject(projects[0]);
    }
  }, [projects, currentProject, setCurrentProject]);

  // Save panel sizes to localStorage
  useEffect(() => {
    localStorage.setItem('workspace-layout', JSON.stringify(panelSizes));
  }, [panelSizes]);

  // Load panel sizes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('workspace-layout');
    if (saved) {
      try {
        const layout = JSON.parse(saved);
        setPanelSizes(layout);
      } catch (error) {
        console.error('Failed to load layout:', error);
      }
    }
  }, [setPanelSizes]);

  const handlePanelResize = (sizes: number[]) => {
    setPanelSizes({
      sidebar: sizes[0] || panelSizes.sidebar,
      centerVertical: sizes[1] || panelSizes.centerVertical,
      rightPanel: sizes[2] || panelSizes.rightPanel,
    });
  };

  const handleCenterResize = (sizes: number[]) => {
    // sizes[0] is code editor percentage, sizes[1] is preview percentage
    setPanelSizes({
      centerVertical: sizes[0] || panelSizes.centerVertical,
    });
  };

  const handleRightResize = (sizes: number[]) => {
    // sizes[0] is development plan percentage, sizes[1] is chat percentage
    setPanelSizes({
      rightVertical: sizes[0] || panelSizes.rightVertical,
    });
  };

  return (
    <main className="min-h-screen bg-neutral-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-neutral-800 border-b border-neutral-700 p-4">
        <h1 className="text-xl font-semibold">AI Code Assistant</h1>
      </header>

      {/* Main content with resizable panels */}
      <div className="flex-1 overflow-hidden">
        <Allotment
          defaultSizes={[panelSizes.sidebar, 100 - panelSizes.sidebar - panelSizes.rightPanel, panelSizes.rightPanel]}
          onChange={handlePanelResize}
        >
          {/* Left Panel - Files & Projects */}
          <Allotment.Pane minSize={200} maxSize={600}>
            <div className="h-full bg-neutral-800 border-r border-neutral-700 flex flex-col">
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
          </Allotment.Pane>

          {/* Center Area - Code & Preview (Horizontal split) */}
          <Allotment.Pane minSize={300}>
            <Allotment defaultSizes={[panelSizes.centerVertical, 100 - panelSizes.centerVertical]} onChange={handleCenterResize}>
              {/* Code Editor */}
              <Allotment.Pane minSize={200}>
                <CodeEditor />
              </Allotment.Pane>

              {/* Code Preview */}
              <Allotment.Pane minSize={150}>
                <CodePreview />
              </Allotment.Pane>
            </Allotment>
          </Allotment.Pane>

          {/* Right Panel - Plan & Chat */}
          <Allotment.Pane minSize={250} maxSize={800}>
            <Allotment vertical defaultSizes={[panelSizes.rightVertical, 100 - panelSizes.rightVertical]} onChange={handleRightResize}>
              {/* Development Plan */}
              <Allotment.Pane minSize={200}>
                <DevelopmentPlan />
              </Allotment.Pane>

              {/* AI Chat */}
              <Allotment.Pane minSize={150}>
                <AIChat />
              </Allotment.Pane>
            </Allotment>
          </Allotment.Pane>
        </Allotment>
      </div>

      {/* Prompt input at bottom */}
      <div className="border-t border-neutral-700 bg-neutral-800">
        <PromptInput />
      </div>

      {/* Diff Viewer Modal */}
      {diffViewerOpen && <DiffViewer />}

      {/* Settings Modal */}
      <SettingsModal />
    </main>
  );
}
