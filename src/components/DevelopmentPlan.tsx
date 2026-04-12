// src/components/DevelopmentPlan.tsx

"use client";

import { useState } from 'react';
import { CheckCircle, Circle, Clock, AlertTriangle, Plus, Play, Search, Edit, Trash2, CheckSquare, Square } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { DevelopmentTask, TaskItem } from '@/types';
import type { DevelopmentPlan } from '@/types';

export function DevelopmentPlan() {
  const {
    plans,
    currentPlan,
    tasks,
    currentTask,
    addPlan,
    updatePlan,
    setCurrentPlan,
    deletePlan,
    addTask,
    updateTask,
    setCurrentTask,
    promptPresets
  } = useAppStore();

  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);

  const getStatusIcon = (status: DevelopmentTask['status'] | DevelopmentPlan['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'partially_completed':
        return <CheckCircle className="w-4 h-4 text-yellow-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'cancelled':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Circle className="w-4 h-4 text-neutral-400" />;
    }
  };

  const getStatusText = (status: DevelopmentTask['status'] | DevelopmentPlan['status']) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'partially_completed':
        return 'Partially Completed';
      case 'in_progress':
        return 'In Progress';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Pending';
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

  const handleAddPlan = () => {
    if (!newPlanTitle.trim()) return;

    const plan: DevelopmentPlan = {
      id: crypto.randomUUID(),
      title: newPlanTitle,
      description: '',
      status: 'pending',
      tasks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addPlan(plan);
    setNewPlanTitle('');
    setShowPlanForm(false);
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;

    const task: DevelopmentTask = {
      id: crypto.randomUUID(),
      title: newTaskTitle,
      description: '',
      status: 'pending',
      priority: 'medium',
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addTask(task);
    setNewTaskTitle('');
    setShowTaskForm(false);
  };

  const handleCheckPlan = async (plan: DevelopmentPlan) => {
    // Use Code Analysis & Planning preset to check plan status
    const analysisPreset = promptPresets.find(p => p.id === 'analyze');
    if (!analysisPreset) return;

    // Implementation for checking plan would go here
    console.log('Checking plan:', plan.title);
  };

  const handleExecutePlan = async (plan: DevelopmentPlan) => {
    // Use Active Development preset to execute plan
    const devPreset = promptPresets.find(p => p.id === 'develop');
    if (!devPreset) return;

    updatePlan(plan.id, { status: 'in_progress' });
    // Implementation for executing plan would go here
    console.log('Executing plan:', plan.title);
  };

  const handleCheckTask = async (task: DevelopmentTask) => {
    // Use Code Analysis & Planning preset to check task status
    const analysisPreset = promptPresets.find(p => p.id === 'analyze');
    if (!analysisPreset) return;

    // Implementation for checking task would go here
    console.log('Checking task:', task.title);
  };

  const handleExecuteTask = async (task: DevelopmentTask) => {
    // Use Active Development preset to execute task
    const devPreset = promptPresets.find(p => p.id === 'develop');
    if (!devPreset) return;

    updateTask(task.id, { status: 'in_progress' });
    // Implementation for executing task would go here
    console.log('Executing task:', task.title);
  };

  const handleToggleItem = (taskId: string, itemId: string, completed: boolean) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedItems = task.items.map(item =>
      item.id === itemId ? { ...item } : item
    );

    updateTask(taskId, { items: updatedItems });
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
        <h3 className="text-lg font-semibold text-neutral-200">Development Plans</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Add new plan */}
        <div className="space-y-2">
          {!showPlanForm ? (
            <button
              onClick={() => setShowPlanForm(true)}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Plan
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={newPlanTitle}
                onChange={(e) => setNewPlanTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddPlan()}
                placeholder="Plan title..."
                className="flex-1 px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddPlan}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowPlanForm(false);
                  setNewPlanTitle('');
                }}
                className="px-3 py-2 bg-neutral-600 hover:bg-neutral-700 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Plans */}
        {plans.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-neutral-300 mb-2">Plans</h4>
            <div className="space-y-3">
              {plans.map(plan => (
                <div
                  key={plan.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    currentPlan?.id === plan.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-neutral-600 hover:border-neutral-500'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(plan.status)}
                      <h5 className="font-medium text-neutral-200">{plan.title}</h5>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCheckPlan(plan)}
                        className="p-1 text-neutral-400 hover:text-blue-400 transition-colors"
                        title="Check plan status"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleExecutePlan(plan)}
                        className="p-1 text-neutral-400 hover:text-green-400 transition-colors"
                        title="Execute plan"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deletePlan(plan.id)}
                        className="p-1 text-neutral-400 hover:text-red-400 transition-colors"
                        title="Delete plan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-neutral-400 mb-2">
                    {plan.tasks.length} tasks • Status: {getStatusText(plan.status)}
                  </div>

                  {/* Tasks in plan */}
                  {plan.tasks.length > 0 && (
                    <div className="space-y-2 mt-3 pt-3 border-t border-neutral-600">
                      {plan.tasks.map(task => (
                        <div key={task.id} className="p-2 bg-neutral-800 rounded border border-neutral-700">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              {getStatusIcon(task.status)}
                              <span className="text-sm text-neutral-300">{task.title}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleCheckTask(task)}
                                className="p-1 text-neutral-500 hover:text-blue-400 transition-colors"
                                title="Check task"
                              >
                                <Search className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleExecuteTask(task)}
                                className="p-1 text-neutral-500 hover:text-green-400 transition-colors"
                                title="Execute task"
                              >
                                <Play className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Task items */}
                          {task.items.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {task.items.map(item => (
                                <div key={item.id} className="flex items-center gap-2 text-xs">
                                  <button
                                    onClick={() => handleToggleItem(task.id, item.id, !item.completed)}
                                    className="text-neutral-500 hover:text-neutral-300"
                                  >
                                    {item.completed ? (
                                      <CheckSquare className="w-3 h-3" />
                                    ) : (
                                      <Square className="w-3 h-3" />
                                    )}
                                  </button>
                                  <span className={`flex-1 ${item.completed ? 'line-through text-neutral-500' : 'text-neutral-400'}`}>
                                    {item.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add new task (outside plans) */}
        <div className="space-y-2">
          {!showTaskForm ? (
            <button
              onClick={() => setShowTaskForm(true)}
              className="w-full px-3 py-2 bg-neutral-700 hover:bg-neutral-600 rounded text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Task title..."
                className="flex-1 px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddTask}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowTaskForm(false);
                  setNewTaskTitle('');
                }}
                className="px-3 py-2 bg-neutral-600 hover:bg-neutral-700 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Standalone Tasks (not in plans) */}
        {tasks.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-neutral-300 mb-2">Standalone Tasks</h4>
            <div className="space-y-2">
              {tasks.map(task => (
                <div
                  key={task.id}
                  className={`p-3 bg-neutral-800 rounded-lg border cursor-pointer transition-colors ${
                    currentTask?.id === task.id ? 'border-blue-500 bg-neutral-700' : 'border-neutral-700 hover:bg-neutral-700'
                  }`}
                  onClick={() => setCurrentTask(task)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(task.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-300 break-words">{task.title}</p>
                        <p className="text-xs text-neutral-500">
                          Status: {getStatusText(task.status)} • Priority: {task.priority}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCheckTask(task)}
                        className="p-1 text-neutral-500 hover:text-blue-400 transition-colors"
                        title="Check task"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleExecuteTask(task)}
                        className="p-1 text-neutral-500 hover:text-green-400 transition-colors"
                        title="Execute task"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Task items */}
                  {task.items.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {task.items.map(item => (
                        <div key={item.id} className="flex items-center gap-2 text-xs">
                          <button
                            onClick={() => handleToggleItem(task.id, item.id, !item.completed)}
                            className="text-neutral-500 hover:text-neutral-300"
                          >
                            {item.completed ? (
                              <CheckSquare className="w-3 h-3" />
                            ) : (
                              <Square className="w-3 h-3" />
                            )}
                          </button>
                          <span className={`flex-1 ${item.completed ? 'line-through text-neutral-500' : 'text-neutral-400'}`}>
                            {item.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
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

        {plans.length === 0 && tasks.length === 0 && (
          <div className="text-center text-neutral-500 py-8">
            <div className="text-4xl mb-4">📋</div>
            <p>No plans or tasks yet</p>
            <p className="text-sm">Create your first development plan or task above</p>
          </div>
        )}
      </div>
    </div>
  );
}