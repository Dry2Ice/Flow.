// src/components/ProjectManager.tsx

"use client";

import { useState } from 'react';
import { FolderOpen, Plus, Trash2, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Project } from '@/types';

export function ProjectManager() {
  const { projects, currentProject, createProject, loadProject, switchProject, deleteProject } = useAppStore();
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectPath, setNewProjectPath] = useState('');
  const [loadProjectPath, setLoadProjectPath] = useState('');

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !newProjectPath.trim()) return;

    setIsLoading(true);
    try {
      await createProject(newProjectName, newProjectPath);
      setIsCreating(false);
      setNewProjectName('');
      setNewProjectPath('');
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadProject = async () => {
    if (!loadProjectPath.trim()) return;

    setIsLoading(true);
    try {
      await loadProject(loadProjectPath);
      setLoadProjectPath('');
    } catch (error) {
      console.error('Failed to load project:', error);
      alert('Failed to load project: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = (projectId: string, projectName: string) => {
    if (confirm(`Are you sure you want to delete project "${projectName}"? This will not delete the actual files.`)) {
      deleteProject(projectId);
    }
  };

  return (
    <div className="p-4 bg-neutral-800 border-b border-neutral-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-200">Projects</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center gap-1 transition-colors"
            disabled={isLoading}
          >
            <Plus className="w-4 h-4" />
            New
          </button>
          <button
            onClick={() => {
              // Refresh current project files
              if (currentProject) {
                loadProject(currentProject.path);
              }
            }}
            className="px-3 py-1 bg-neutral-600 hover:bg-neutral-700 rounded text-sm flex items-center gap-1 transition-colors"
            disabled={isLoading || !currentProject}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Current Project */}
      {currentProject && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
          <div className="flex items-center gap-2 mb-1">
            <FolderOpen className="w-4 h-4 text-blue-400" />
            <span className="font-medium text-blue-400">Current Project</span>
          </div>
          <p className="text-sm text-neutral-300">{currentProject.name}</p>
          <p className="text-xs text-neutral-500 mt-1">{currentProject.path}</p>
          {currentProject.isDemo && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded mt-1 inline-block">
              Demo Project
            </span>
          )}
        </div>
      )}

      {/* Create New Project */}
      {isCreating && (
        <div className="mb-4 p-3 bg-neutral-700 rounded border border-neutral-600">
          <h4 className="text-sm font-medium text-neutral-200 mb-3">Create New Project</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Project Name</label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="My Awesome Project"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Project Directory</label>
              <input
                type="text"
                value={newProjectPath}
                onChange={(e) => setNewProjectPath(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="/path/to/project"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateProject}
                disabled={isLoading || !newProjectName.trim() || !newProjectPath.trim()}
                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-neutral-600 disabled:cursor-not-allowed rounded text-sm transition-colors"
              >
                {isLoading ? 'Creating...' : 'Create Project'}
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewProjectName('');
                  setNewProjectPath('');
                }}
                className="px-3 py-2 bg-neutral-600 hover:bg-neutral-700 rounded text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Existing Project */}
      <div className="mb-4 p-3 bg-neutral-700 rounded border border-neutral-600">
        <h4 className="text-sm font-medium text-neutral-200 mb-3">Load Existing Project</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Project Directory</label>
            <input
              type="text"
              value={loadProjectPath}
              onChange={(e) => setLoadProjectPath(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="/path/to/existing/project"
            />
          </div>
          <button
            onClick={handleLoadProject}
            disabled={isLoading || !loadProjectPath.trim()}
            className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-neutral-600 disabled:cursor-not-allowed rounded text-sm transition-colors"
          >
            {isLoading ? 'Loading...' : 'Load Project'}
          </button>
        </div>
      </div>

      {/* Project List */}
      {projects.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-neutral-200 mb-3">Recent Projects</h4>
          <div className="space-y-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`p-3 border rounded cursor-pointer transition-colors ${
                  currentProject?.id === project.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-neutral-600 hover:border-neutral-500 hover:bg-neutral-700/50'
                }`}
                onClick={() => switchProject(project.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-200 truncate">{project.name}</p>
                    <p className="text-xs text-neutral-500 truncate">{project.path}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {project.isDemo && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1 py-0.5 rounded">
                        Demo
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id, project.name);
                      }}
                      className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
                      title="Delete project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}