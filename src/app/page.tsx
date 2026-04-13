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
import { ProjectStats } from '@/components/ProjectStats';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAppStore } from '@/lib/store';
import { useEffect, useState } from 'react';
import { FolderOpen, FileText, BarChart3, Zap, Activity, Settings } from 'lucide-react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';

export default function Home() {
  const { diffViewerOpen, currentProject, projects, setCurrentProject, panelSizes, setPanelSizes } = useAppStore();
  const [activeTab, setActiveTab] = useState<'files' | 'projects'>('files');
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);

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
      const { addPlan, addTask, addMessage } = useAppStore.getState();
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

      // Add demo message to chat
      addMessage('default-session', {
        id: 'demo-message',
        sessionId: 'default-session',
        role: 'assistant',
        content: '👋 **Welcome to Flow!**\n\nI\'m your AI development assistant. I can help you:\n\n• Generate and modify code\n• Debug and optimize existing code\n• Create documentation\n• Answer questions about development\n• Provide best practices\n\nTry asking me to create something or modify the code in the editor!',
        timestamp: new Date(),
      });
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

  useEffect(() => {
    const syncApiConfigurationState = () => {
      const savedSettings = localStorage.getItem('nim-settings');
      if (!savedSettings) {
        setApiConfigured(false);
        return;
      }

      try {
        const parsedSettings = JSON.parse(savedSettings);
        const hasApiKey = typeof parsedSettings.apiKey === 'string' && parsedSettings.apiKey.trim().length > 0;
        const hasBaseUrl = typeof parsedSettings.baseUrl === 'string' && parsedSettings.baseUrl.trim().length > 0;
        setApiConfigured(hasApiKey && hasBaseUrl);
      } catch (error) {
        console.error('Failed to parse nim-settings:', error);
        setApiConfigured(false);
      }
    };

    syncApiConfigurationState();
    window.addEventListener('settings-saved', syncApiConfigurationState);

    return () => {
      window.removeEventListener('settings-saved', syncApiConfigurationState);
    };
  }, []);

  const handleCenterResize = (sizes: number[]) => {
    // sizes[0] is code editor percentage, sizes[1] is preview percentage
    setPanelSizes({
      centerVertical: sizes[0] || panelSizes.centerVertical,
    });
  };

  const focusStatisticsPanel = () => {
    if (panelSizes.statsPanel >= 18) {
      return;
    }

    const targetStats = 22;
    const available = 100 - targetStats;
    const currentNonStats = panelSizes.filesPanel + panelSizes.codePanel + panelSizes.chatPanel + panelSizes.planPanel;
    const scale = currentNonStats > 0 ? available / currentNonStats : 0.25;

    setPanelSizes({
      filesPanel: Number((panelSizes.filesPanel * scale).toFixed(2)),
      codePanel: Number((panelSizes.codePanel * scale).toFixed(2)),
      chatPanel: Number((panelSizes.chatPanel * scale).toFixed(2)),
      planPanel: Number((panelSizes.planPanel * scale).toFixed(2)),
      statsPanel: targetStats,
    });
  };

  return (
    <main className="min-h-screen dark:bg-neutral-900 dark:text-white light:bg-gray-50 light:text-gray-900 flex flex-col transition-colors duration-300">
      {/* Header */}
      <header className="dark:bg-gradient-to-r dark:from-blue-900 dark:via-purple-900 dark:to-indigo-900 light:bg-gradient-to-r light:from-blue-50 light:via-purple-50 light:to-indigo-50 border-b dark:border-neutral-700 light:border-gray-200 p-4 shadow-xl relative overflow-hidden transition-colors duration-300">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-32 h-32 dark:bg-blue-400 light:bg-blue-300 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-4 right-1/3 w-24 h-24 dark:bg-purple-400 light:bg-purple-300 rounded-full blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-2 right-1/4 w-20 h-20 dark:bg-indigo-400 light:bg-indigo-300 rounded-full blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="flex items-center justify-between relative z-10">
          {/* Left side - Logo and title */}
          <div className="flex items-center gap-3 animate-slide-in">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg hover-scale hover-glow">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold dark:text-white light:text-gray-900 bg-gradient-to-r dark:from-white dark:to-blue-200 light:from-blue-600 light:to-purple-600 bg-clip-text text-transparent">
                Flow
              </h1>
              <p className="text-sm dark:text-blue-200 light:text-blue-600 font-medium">AI-Powered Development Platform</p>
            </div>
          </div>

          {/* Center - Control buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={focusStatisticsPanel}
              className="px-3 py-2 dark:bg-neutral-800/80 light:bg-white/80 dark:border-neutral-700/50 light:border-gray-200/50 border rounded-lg hover-lift backdrop-blur-sm transition-all duration-200"
              title="Open Project Statistics panel"
            >
              <BarChart3 className="w-5 h-5 transition-colors dark:text-neutral-300 light:text-gray-600" />
            </button>
            <ThemeToggle />
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="p-2 dark:bg-neutral-800/80 light:bg-white/80 dark:border-neutral-700/50 light:border-gray-200/50 border rounded-lg hover-lift backdrop-blur-sm transition-all duration-200"
              title="AI Settings"
            >
              <Settings className="w-5 h-5 dark:text-neutral-300 light:text-gray-600" />
            </button>
          </div>

          {/* Right side - Status */}
          <div className="flex items-center gap-4">
            {/* Connection status */}
            <div className="flex items-center gap-2 text-sm dark:text-neutral-300 light:text-gray-600 dark:bg-neutral-800/50 light:bg-white/50 px-3 py-1 rounded-full backdrop-blur-sm dark:border-neutral-700/50 light:border-gray-200/50 border">
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full animate-pulse shadow-lg ${apiConfigured ? 'bg-green-400 shadow-green-400/50' : 'bg-yellow-400 shadow-yellow-400/50'}`}></div>
                {apiConfigured ? (
                  <span className="font-medium">AI Ready</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSettingsModalOpen(true)}
                    className="font-medium hover:underline"
                  >
                    Configure API
                  </button>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="hidden md:flex items-center gap-4 text-xs dark:text-neutral-400 light:text-gray-500">
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span>Ultra Mode Ready</span>
              </div>
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                <span>Real-time Sync</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content with resizable panels */}
      <div className="flex-1 overflow-hidden">
        <Allotment
          defaultSizes={[
            panelSizes.filesPanel,
            panelSizes.codePanel,
            panelSizes.chatPanel,
            panelSizes.planPanel,
            panelSizes.statsPanel,
          ]}
          onChange={(sizes: number[]) => {
            setPanelSizes({
              filesPanel: sizes[0] || panelSizes.filesPanel,
              codePanel: sizes[1] || panelSizes.codePanel,
              chatPanel: sizes[2] || panelSizes.chatPanel,
              planPanel: sizes[3] || panelSizes.planPanel,
              statsPanel: sizes[4] || panelSizes.statsPanel,
            });
          }}
        >
          {/* Files / Projects */}
          <Allotment.Pane minSize={180} maxSize={600}>
            <div className="h-full dark:bg-neutral-800 light:bg-white border-r dark:border-neutral-700 light:border-gray-200 flex flex-col transition-colors duration-300">
              <div className="flex border-b dark:border-neutral-700/50 light:border-gray-200/50 dark:bg-neutral-800/30 light:bg-white/30 backdrop-blur-sm">
                <button
                  onClick={() => setActiveTab('files')}
                  className={`flex-1 px-4 py-4 text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 relative group ${
                    activeTab === 'files'
                      ? 'dark:text-blue-400 light:text-blue-600 border-b-2 border-blue-400 dark:bg-blue-500/10 light:bg-blue-50'
                      : 'dark:text-neutral-400 dark:hover:text-neutral-300 dark:hover:bg-neutral-700/30 light:text-gray-500 light:hover:text-gray-700 light:hover:bg-gray-100/30'
                  }`}
                >
                  <FileText className={`w-4 h-4 transition-transform duration-200 ${activeTab === 'files' ? 'scale-110' : 'group-hover:scale-105'}`} />
                  Files
                  {activeTab === 'files' && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('projects')}
                  className={`flex-1 px-4 py-4 text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 relative group ${
                    activeTab === 'projects'
                      ? 'dark:text-purple-400 light:text-purple-600 border-b-2 border-purple-400 dark:bg-purple-500/10 light:bg-purple-50'
                      : 'dark:text-neutral-400 dark:hover:text-neutral-300 dark:hover:bg-neutral-700/30 light:text-gray-500 light:hover:text-gray-700 light:hover:bg-gray-100/30'
                  }`}
                >
                  <FolderOpen className={`w-4 h-4 transition-transform duration-200 ${activeTab === 'projects' ? 'scale-110' : 'group-hover:scale-105'}`} />
                  Projects
                  {activeTab === 'projects' && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-purple-400 rounded-full animate-pulse"></div>
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
                {activeTab === 'files' && <FileBrowser />}
                {activeTab === 'projects' && <ProjectManager />}
              </div>
            </div>
          </Allotment.Pane>

          {/* Code + Preview */}
          <Allotment.Pane minSize={280}>
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

          {/* Chat / Logs */}
          <Allotment.Pane minSize={180} maxSize={700}>
            <AIChat />
          </Allotment.Pane>

          {/* Plan / Bugs */}
          <Allotment.Pane minSize={180} maxSize={800}>
            <DevelopmentPlan />
          </Allotment.Pane>

          {/* Statistics */}
          <Allotment.Pane minSize={180} maxSize={700}>
            <ProjectStats />
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
      <SettingsModal isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} />
    </main>
  );
}
