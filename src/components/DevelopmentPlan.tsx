// src/components/DevelopmentPlan.tsx

"use client";

import { useState } from 'react';
import { CheckCircle, Circle, Clock, AlertTriangle, Plus, Play, Search, Edit, Trash2, CheckSquare, Square, Bug, XCircle } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { BugReport, DevelopmentTask, TaskItem } from '@/types';
import type { DevelopmentPlan } from '@/types';
import { executeAIRequest } from '@/lib/ai-executor';

export function DevelopmentPlan() {
  const {
    plans,
    currentPlan,
    tasks,
    currentTask,
    bugs,
    addPlan,
    updatePlan,
    setCurrentPlan,
    deletePlan,
    addTask,
    updateTask,
    setCurrentTask,
    updateBug,
    deleteBug,
    addLog,
    activeSessionId,
  } = useAppStore();

  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'plans' | 'bugs'>('plans');

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

  const inferWorkStatus = (
    explanation: string | undefined,
    fallback: DevelopmentTask['status'] | DevelopmentPlan['status']
  ): DevelopmentTask['status'] | DevelopmentPlan['status'] => {
    if (!explanation) return fallback;

    const text = explanation.toLowerCase();
    if (text.includes('partially') || text.includes('partial')) return 'partially_completed';
    if (text.includes('completed') || text.includes('done') || text.includes('finished')) return 'completed';
    if (text.includes('in progress') || text.includes('progress')) return 'in_progress';
    if (text.includes('pending') || text.includes('not started')) return 'pending';

    return fallback;
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
    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      timestamp: new Date(),
      type: 'info',
      message: `Checking plan "${plan.title}"`,
      source: 'user_action',
      relatedPlan: plan.id,
    });

    const result = await executeAIRequest({
      requestType: 'analysis',
      presetId: 'analyze',
      prompt: `Check plan status and return current progress.
Plan title: ${plan.title}
Plan description: ${plan.description || 'No description'}
Current status: ${plan.status}
Tasks count: ${plan.tasks.length}`,
    });

    const nextStatus = inferWorkStatus(result.responseText, plan.status);
    updatePlan(plan.id, { status: nextStatus, lastChecked: new Date() });

    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      jobId: result.jobId,
      timestamp: new Date(),
      type: result.ok ? 'success' : 'error',
      message: result.ok
        ? `Plan "${plan.title}" checked. Status: ${nextStatus}.`
        : `Failed to check plan "${plan.title}": ${result.error || 'Unknown error'}`,
      source: 'ai_execution',
      relatedPlan: plan.id,
    });
  };

  const handleExecutePlan = async (plan: DevelopmentPlan) => {
    updatePlan(plan.id, { status: 'in_progress' });
    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      timestamp: new Date(),
      type: 'info',
      message: `Executing plan "${plan.title}"`,
      source: 'user_action',
      relatedPlan: plan.id,
    });

    const result = await executeAIRequest({
      requestType: 'implementation',
      presetId: 'develop',
      prompt: `Execute this development plan.
Plan title: ${plan.title}
Plan description: ${plan.description || 'No description'}
Current status: ${plan.status}
Tasks: ${plan.tasks.map((task) => task.title).join(', ') || 'No tasks yet'}`,
    });

    const nextStatus = inferWorkStatus(result.responseText, 'in_progress');
    updatePlan(plan.id, { status: nextStatus, lastChecked: new Date() });

    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      jobId: result.jobId,
      timestamp: new Date(),
      type: result.ok ? 'success' : 'error',
      message: result.ok
        ? `Plan "${plan.title}" execution updated status to ${nextStatus}.`
        : `Failed to execute plan "${plan.title}": ${result.error || 'Unknown error'}`,
      source: 'ai_execution',
      relatedPlan: plan.id,
    });
  };

  const handleCheckTask = async (task: DevelopmentTask) => {
    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      timestamp: new Date(),
      type: 'info',
      message: `Checking task "${task.title}"`,
      source: 'user_action',
      relatedTask: task.id,
    });

    const result = await executeAIRequest({
      requestType: 'analysis',
      presetId: 'analyze',
      prompt: `Check task status and return current progress.
Task title: ${task.title}
Task description: ${task.description || 'No description'}
Current status: ${task.status}
Checklist items: ${task.items.length}`,
    });

    const nextStatus = inferWorkStatus(result.responseText, task.status);
    updateTask(task.id, { status: nextStatus, lastChecked: new Date() });

    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      jobId: result.jobId,
      timestamp: new Date(),
      type: result.ok ? 'success' : 'error',
      message: result.ok
        ? `Task "${task.title}" checked. Status: ${nextStatus}.`
        : `Failed to check task "${task.title}": ${result.error || 'Unknown error'}`,
      source: 'ai_execution',
      relatedTask: task.id,
    });
  };

  const handleExecuteTask = async (task: DevelopmentTask) => {
    updateTask(task.id, { status: 'in_progress' });
    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      timestamp: new Date(),
      type: 'info',
      message: `Executing task "${task.title}"`,
      source: 'user_action',
      relatedTask: task.id,
    });

    const result = await executeAIRequest({
      requestType: 'implementation',
      presetId: 'develop',
      prompt: `Execute task.
Task title: ${task.title}
Task description: ${task.description || 'No description'}
Current status: ${task.status}
Checklist: ${task.items.map((item) => `${item.completed ? '[x]' : '[ ]'} ${item.title}`).join('; ') || 'No items'}`,
    });

    const nextStatus = inferWorkStatus(result.responseText, 'in_progress');
    updateTask(task.id, { status: nextStatus, lastChecked: new Date() });

    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      jobId: result.jobId,
      timestamp: new Date(),
      type: result.ok ? 'success' : 'error',
      message: result.ok
        ? `Task "${task.title}" execution updated status to ${nextStatus}.`
        : `Failed to execute task "${task.title}": ${result.error || 'Unknown error'}`,
      source: 'ai_execution',
      relatedTask: task.id,
    });
  };

  const handleToggleItem = (taskId: string, itemId: string, completed: boolean) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedItems = task.items.map(item =>
      item.id === itemId ? { ...item, completed } : item
    );

    updateTask(taskId, { items: updatedItems });
  };

  const handleCheckBug = async (bug: BugReport) => {
    updateBug(bug.id, { status: 'investigating' });
    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      timestamp: new Date(),
      type: 'info',
      message: `Checking bug "${bug.title}"`,
      source: 'user_action',
    });

    const result = await executeAIRequest({
      requestType: 'analysis',
      presetId: 'analyze',
      prompt: `Analyze bug status.
Bug title: ${bug.title}
Description: ${bug.description}
Current status: ${bug.status}
Severity: ${bug.severity}`,
    });

    updateBug(bug.id, {
      status: result.ok ? 'investigating' : bug.status,
      lastChecked: new Date(),
    });

    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      jobId: result.jobId,
      timestamp: new Date(),
      type: result.ok ? 'success' : 'error',
      message: result.ok
        ? `Bug "${bug.title}" checked.`
        : `Failed to check bug "${bug.title}": ${result.error || 'Unknown error'}`,
      source: 'ai_execution',
    });
  };

  const handleFixBug = async (bug: BugReport) => {
    updateBug(bug.id, { status: 'fixing' });
    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      timestamp: new Date(),
      type: 'info',
      message: `Fixing bug "${bug.title}"`,
      source: 'user_action',
    });

    const result = await executeAIRequest({
      requestType: 'debugging',
      presetId: 'debug',
      prompt: `Fix bug and report result.
Bug title: ${bug.title}
Description: ${bug.description}
Severity: ${bug.severity}
Related files: ${bug.relatedFiles.join(', ') || 'N/A'}`,
    });

    updateBug(bug.id, {
      status: result.ok ? 'resolved' : 'fixing',
      lastChecked: new Date(),
    });

    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      jobId: result.jobId,
      timestamp: new Date(),
      type: result.ok ? 'success' : 'error',
      message: result.ok
        ? `Bug "${bug.title}" fix completed.`
        : `Failed to fix bug "${bug.title}": ${result.error || 'Unknown error'}`,
      source: 'ai_execution',
    });
  };

  const getBugSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'high':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'low':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      default:
        return 'text-neutral-400 bg-neutral-500/10 border-neutral-500/30';
    }
  };

  const getBugStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'text-red-400';
      case 'investigating':
        return 'text-yellow-400';
      case 'fixing':
        return 'text-blue-400';
      case 'resolved':
        return 'text-green-400';
      case 'closed':
        return 'text-neutral-400';
      default:
        return 'text-neutral-400';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-neutral-700">
        <div className="flex border-b border-neutral-700">
          <button
            onClick={() => setActiveTab('plans')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'plans'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
                : 'text-neutral-400 hover:text-neutral-300'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            Plans
          </button>
          <button
            onClick={() => setActiveTab('bugs')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'bugs'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
                : 'text-neutral-400 hover:text-neutral-300'
            }`}
          >
            <Bug className="w-4 h-4" />
            Bugs ({bugs.length})
          </button>
        </div>

        <div className="p-4">
          <h3 className="text-lg font-semibold text-neutral-200">
            {activeTab === 'plans' ? 'Development Plans' : 'Bug Reports'}
          </h3>
        </div>
      </div>

      {/* Content based on active tab */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'plans' ? (
          /* Plans Content */
          <div className="p-4 space-y-4">
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

            {plans.length === 0 && tasks.length === 0 && (
              <div className="text-center text-neutral-500 py-8">
                <div className="text-4xl mb-4">📋</div>
                <p>No plans or tasks yet</p>
                <p className="text-sm">Create your first development plan or task above</p>
              </div>
            )}
          </div>
        ) : (
          /* Bugs Content */
          <div className="p-4 space-y-4">
            {bugs.length === 0 ? (
              <div className="text-center text-neutral-500 py-8">
                <Bug className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No bugs reported yet</p>
                <p className="text-xs mt-2">Bugs will appear here when detected by AI or reported manually</p>
              </div>
            ) : (
              bugs.map(bug => (
                <div key={bug.id} className={`p-4 border rounded-lg ${getBugSeverityColor(bug.severity)}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5" />
                      <h5 className="font-medium text-neutral-200">{bug.title}</h5>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCheckBug(bug)}
                        className="p-1 text-neutral-400 hover:text-blue-400 transition-colors"
                        title="Check bug status"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleFixBug(bug)}
                        className="p-1 text-neutral-400 hover:text-green-400 transition-colors"
                        title="Fix bug"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteBug(bug.id)}
                        className="p-1 text-neutral-400 hover:text-red-400 transition-colors"
                        title="Delete bug report"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-neutral-300 mb-3">{bug.description}</p>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`font-medium ${getBugStatusColor(bug.status)}`}>
                        {bug.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-neutral-400">
                        {bug.severity.toUpperCase()} priority
                      </span>
                      <span className="text-neutral-400">
                        {bug.source.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-neutral-500">
                      {bug.createdAt.toLocaleDateString()}
                    </span>
                  </div>

                  {bug.relatedFiles.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-neutral-600">
                      <div className="text-xs text-neutral-400 mb-1">Related Files:</div>
                      <div className="flex flex-wrap gap-1">
                        {bug.relatedFiles.map((file, index) => (
                          <span key={index} className="text-xs bg-neutral-700 px-2 py-1 rounded">
                            {file}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {bug.resolution && (
                    <div className="mt-3 pt-3 border-t border-neutral-600">
                      <div className="text-xs text-neutral-400 mb-1">Resolution:</div>
                      <p className="text-sm text-neutral-300">{bug.resolution}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
