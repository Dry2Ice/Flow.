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
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAppStore } from '@/lib/store';
import { useEffect, useState } from 'react';
import { FolderOpen, FileText, BarChart3 } from 'lucide-react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';

export default function Home() {
  const { sidebarOpen, diffViewerOpen, currentProject, projects, setCurrentProject, panelSizes, setPanelSizes } = useAppStore();
  const [activeTab, setActiveTab] = useState<'files' | 'projects' | 'analytics'>('files');

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
    <title>Flow Demo</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <div class="hero-section">
            <h1 class="hero-title">Welcome to <span class="gradient-text">Flow</span></h1>
            <p class="hero-subtitle">Experience the future of AI-powered development</p>
        </div>
        <div class="features">
            <div class="feature-card">
                <h3>⚡ Intelligent Code Generation</h3>
                <p>Transform ideas into code with advanced AI</p>
            </div>
            <div class="feature-card">
                <h3>📊 Real-time Analytics</h3>
                <p>Track progress and optimize your workflow</p>
            </div>
            <div class="feature-card">
                <h3>🔧 Modern Development Tools</h3>
                <p>Professional editor with live preview</p>
            </div>
        </div>
        <button onclick="alert('🚀 Welcome to Flow - Let\\'s build something amazing!')" class="cta-button">Get Started</button>
    </div>
    <script src="script.js"></script>
</body>
</html>`);
      }

      // Create demo plan and task
      const { addPlan, addTask } = useAppStore.getState();
      const demoPlan = {
        id: 'demo-plan',
        title: 'Flow Onboarding Journey',
        description: 'Complete guide to mastering Flow\'s AI-powered development features',
        status: 'pending' as const,
        tasks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const demoTask = {
        id: 'demo-task',
        title: 'Welcome to Flow',
        description: 'Discover the power of AI-driven development with Flow\'s comprehensive toolkit',
        status: 'pending' as const,
        priority: 'high' as const,
        items: [
          { id: 'item-1', title: 'Explore the Monaco code editor with advanced syntax highlighting', completed: false, createdAt: new Date() },
          { id: 'item-2', title: 'Experience real-time HTML preview with instant updates', completed: false, createdAt: new Date() },
          { id: 'item-3', title: 'Interact with Flow\'s intelligent AI chat system', completed: false, createdAt: new Date() },
          { id: 'item-4', title: 'Create and manage development plans with AI assistance', completed: false, createdAt: new Date() },
          { id: 'item-5', title: 'Use Ultra Mode for comprehensive code enhancement', completed: false, createdAt: new Date() },
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
      <header className="bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 border-b border-neutral-700 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Flow</h1>
              <p className="text-xs text-blue-200">AI-Powered Development</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-neutral-300">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Ready</span>
            </div>
          </div>
        </div>
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
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'analytics'
                      ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
                      : 'text-neutral-400 hover:text-neutral-300'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'files' && <FileBrowser />}
                {activeTab === 'projects' && <ProjectManager />}
                {activeTab === 'analytics' && <AnalyticsDashboard />}
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

      {/* Theme Toggle */}
      <ThemeToggle />
    </main>
  );
}
