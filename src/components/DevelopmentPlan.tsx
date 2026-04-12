// src/components/DevelopmentPlan.tsx

"use client";

import { useState } from 'react';
import { CheckCircle, Circle, Clock, AlertTriangle, Plus } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { DevelopmentTask } from '@/types';

export function DevelopmentPlan() {
  const { tasks, addTask, updateTask, currentTask, setCurrentTask } = useAppStore();
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const getStatusIcon = (status: DevelopmentTask['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'cancelled':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Circle className="w-4 h-4 text-neutral-400" />;
    }
  };

  const getPriorityColor = (priority: DevelopmentTask['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-neutral-400';
    }
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;

    const task: DevelopmentTask = {
      id: crypto.randomUUID(),
      title: newTaskTitle,
      description: '',
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addTask(task);
    setNewTaskTitle('');
  };

  const handleStatusChange = (taskId: string, status: DevelopmentTask['status']) => {
    updateTask(taskId, { status, updatedAt: new Date() });
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-neutral-700">
        <h3 className="text-lg font-semibold text-neutral-200">Development Plan</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Add new task */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
            placeholder="Add new task..."
            className="flex-1 px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddTask}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* In Progress */}
        {inProgressTasks.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-blue-400 mb-2">In Progress</h4>
            <div className="space-y-2">
              {inProgressTasks.map(task => (
                <div
                  key={task.id}
                  className={`p-3 bg-neutral-700 rounded-lg border cursor-pointer transition-colors ${
                    currentTask?.id === task.id ? 'border-blue-500 bg-neutral-600' : 'border-neutral-600 hover:bg-neutral-600'
                  }`}
                  onClick={() => setCurrentTask(task)}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(task.id, 'completed');
                      }}
                      className="mt-0.5"
                    >
                      {getStatusIcon(task.status)}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-200 break-words">{task.title}</p>
                      <p className={`text-xs ${getPriorityColor(task.priority)}`}>
                        {task.priority} priority
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending */}
        {pendingTasks.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-neutral-400 mb-2">Pending</h4>
            <div className="space-y-2">
              {pendingTasks.map(task => (
                <div
                  key={task.id}
                  className={`p-3 bg-neutral-800 rounded-lg border cursor-pointer transition-colors ${
                    currentTask?.id === task.id ? 'border-blue-500 bg-neutral-700' : 'border-neutral-700 hover:bg-neutral-700'
                  }`}
                  onClick={() => setCurrentTask(task)}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(task.id, 'in_progress');
                      }}
                      className="mt-0.5"
                    >
                      {getStatusIcon(task.status)}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-300 break-words">{task.title}</p>
                      <p className={`text-xs ${getPriorityColor(task.priority)}`}>
                        {task.priority} priority
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed */}
        {completedTasks.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-green-400 mb-2">Completed</h4>
            <div className="space-y-2">
              {completedTasks.map(task => (
                <div key={task.id} className="p-3 bg-neutral-800 rounded-lg border border-neutral-700">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(task.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-400 break-words line-through">{task.title}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tasks.length === 0 && (
          <div className="text-center text-neutral-500 py-8">
            <div className="text-4xl mb-4">📋</div>
            <p>No tasks yet</p>
            <p className="text-sm">Add your first task above</p>
          </div>
        )}
      </div>
    </div>
  );
}