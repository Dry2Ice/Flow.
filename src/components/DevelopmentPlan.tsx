"use client";

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Bug,
  CheckCircle,
  CheckSquare,
  Circle,
  Clock,
  Edit3,
  PlusCircle,
  Play,
  Search,
  Square,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import { executeAIRequest } from '@/lib/ai-executor';
import { useAppStore } from '@/lib/store';
import { BugReport, DevelopmentTask } from '@/types';
import type { DevelopmentPlan, TaskItem } from '@/types';

interface DevelopmentPlanProps {
  initialTab?: 'plan' | 'errors';
}

export function DevelopmentPlan({ initialTab = 'plan' }: DevelopmentPlanProps = {}) {
  const {
    plans,
    tasks,
    bugs,
    logs,
    aiRequests,
    updatePlan,
    addPlan,
    deletePlan,
    addTask,
    updateTask,
    deleteTask,
    addBug,
    updateBug,
    deleteBug,
    addLog,
    activeSessionId,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'plan' | 'errors'>(initialTab);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [executingPlanId, setExecutingPlanId] = useState<string | null>(null);
  const [planExecutionProgress, setPlanExecutionProgress] = useState({ current: 0, total: 0 });
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [manualErrorTitle, setManualErrorTitle] = useState('');
  const [manualErrorDescription, setManualErrorDescription] = useState('');
  const [manualErrorSeverity, setManualErrorSeverity] = useState<BugReport['severity']>('medium');
  const [isNewPlanFormOpen, setIsNewPlanFormOpen] = useState(false);
  const [isNewTaskFormOpen, setIsNewTaskFormOpen] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanDescription, setNewPlanDescription] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<DevelopmentTask['priority']>('medium');
  const [taskFormError, setTaskFormError] = useState('');

  const activePlan = useMemo(() => {
    if (plans.length === 0) return null;
    if (!activePlanId) return plans[0];
    return plans.find((plan) => plan.id === activePlanId) ?? plans[0];
  }, [plans, activePlanId]);

  const planTasks = activePlan?.tasks ?? [];

  const getStatusIcon = (status: DevelopmentTask['status'] | DevelopmentPlan['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-emerald-400" aria-hidden="true" />;
      case 'partially_completed':
        return <Clock className="h-4 w-4 text-amber-400" aria-hidden="true" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-sky-400" aria-hidden="true" />;
      case 'cancelled':
        return <AlertTriangle className="h-4 w-4 text-rose-400" aria-hidden="true" />;
      default:
        return <Circle className="h-4 w-4 text-neutral-500" aria-hidden="true" />;
    }
  };

  const getStatusText = (status: DevelopmentTask['status'] | DevelopmentPlan['status']) => {
    if (status === 'completed') return 'Completed';
    if (status === 'partially_completed') return 'Partially completed';
    if (status === 'in_progress') return 'Not completed';
    if (status === 'cancelled') return 'Not completed';
    return 'Not completed';
  };

  const inferWorkStatus = (
    explanation: string | undefined,
    fallback: DevelopmentTask['status'] | DevelopmentPlan['status']
  ): DevelopmentTask['status'] | DevelopmentPlan['status'] => {
    if (!explanation) return fallback;
    const text = explanation.toLowerCase();
    if (text.includes('partial')) return 'partially_completed';
    if (text.includes('completed') || text.includes('done') || text.includes('finished')) return 'completed';
    if (text.includes('in progress') || text.includes('progress')) return 'in_progress';
    if (text.includes('pending') || text.includes('not started')) return 'pending';
    return fallback;
  };

  const patchTaskInPlans = (taskId: string, patch: Partial<DevelopmentTask>) => {
    plans.forEach((plan) => {
      if (!plan.tasks.some((task) => task.id === taskId)) return;
      updatePlan(plan.id, {
        tasks: plan.tasks.map((task) => (task.id === taskId ? { ...task, ...patch, updatedAt: new Date() } : task)),
      });
    });
  };

  const updateTaskEverywhere = (taskId: string, patch: Partial<DevelopmentTask>) => {
    updateTask(taskId, patch);
    patchTaskInPlans(taskId, patch);
  };

  const recomputeStatusFromSubtasks = (items: TaskItem[]): DevelopmentTask['status'] => {
    if (items.length === 0) return 'pending';
    const completed = items.filter((item) => item.completed).length;
    if (completed === items.length) return 'completed';
    if (completed > 0) return 'partially_completed';
    return 'pending';
  };

  const handleToggleSubtask = (task: DevelopmentTask, subtaskId: string) => {
    const items = task.items.map((item) => (item.id === subtaskId ? { ...item, completed: !item.completed } : item));
    updateTaskEverywhere(task.id, {
      items,
      status: recomputeStatusFromSubtasks(items),
      updatedAt: new Date(),
    });
  };

  const handleCheckTask = async (task: DevelopmentTask) => {
    const result = await executeAIRequest({
      requestType: 'analysis',
      presetId: 'analyze',
      prompt: `Check task status and return current progress.\nTask title: ${task.title}\nTask description: ${task.description || 'No description'}\nCurrent status: ${task.status}\nSubtasks count: ${task.items.length}`,
    });

    const nextStatus = inferWorkStatus(result.responseText, task.status);
    updateTaskEverywhere(task.id, { status: nextStatus, lastChecked: new Date() });

    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      jobId: result.jobId,
      timestamp: new Date(),
      type: result.ok ? 'success' : 'error',
      message: result.ok
        ? `Task \"${task.title}\" checked. Status: ${nextStatus}.`
        : `Failed to check task \"${task.title}\": ${result.error || 'Unknown error'}`,
      source: 'ai_execution',
      relatedTask: task.id,
    });
  };

  const handleExecuteTask = async (task: DevelopmentTask) => {
    const nextStartStatus: DevelopmentTask['status'] = task.status === 'pending' ? 'in_progress' : task.status;
    updateTaskEverywhere(task.id, { status: nextStartStatus });

    const result = await executeAIRequest({
      requestType: 'implementation',
      presetId: 'develop',
      prompt: `Execute task.\nTask title: ${task.title}\nTask description: ${task.description || 'No description'}\nCurrent status: ${task.status}\nSubtasks: ${task.items.map((item) => `${item.completed ? '[x]' : '[ ]'} ${item.title}`).join('; ') || 'No subtasks'}`,
    });

    const nextStatus = inferWorkStatus(result.responseText, 'in_progress');
    updateTaskEverywhere(task.id, { status: nextStatus, lastChecked: new Date() });

    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId,
      jobId: result.jobId,
      timestamp: new Date(),
      type: result.ok ? 'success' : 'error',
      message: result.ok
        ? `Task \"${task.title}\" execution updated status to ${nextStatus}.`
        : `Failed to execute task \"${task.title}\": ${result.error || 'Unknown error'}`,
      source: 'ai_execution',
      relatedTask: task.id,
    });
  };

  const handleCheckAllTasks = async (plan: DevelopmentPlan) => {
    for (const task of plan.tasks) {
      await handleCheckTask(task);
    }

    const refreshed = useAppStore.getState().plans.find((item) => item.id === plan.id);
    const latestTasks = refreshed?.tasks ?? [];
    const done = latestTasks.filter((task) => task.status === 'completed').length;
    const nextStatus: DevelopmentPlan['status'] = done === latestTasks.length && latestTasks.length > 0
      ? 'completed'
      : done > 0
        ? 'partially_completed'
        : 'pending';

    updatePlan(plan.id, { status: nextStatus, lastChecked: new Date() });
  };

  const handleExecutePlan = async (plan: DevelopmentPlan) => {
    if (plan.tasks.length === 0) return;

    setExecutingPlanId(plan.id);
    setPlanExecutionProgress({ current: 0, total: plan.tasks.length });
    updatePlan(plan.id, { status: 'in_progress' });

    let progress = 0;
    for (const task of plan.tasks) {
      await handleExecuteTask(task);
      progress += 1;
      setPlanExecutionProgress({ current: progress, total: plan.tasks.length });
    }

    const refreshed = useAppStore.getState().plans.find((item) => item.id === plan.id);
    const latestTasks = refreshed?.tasks ?? [];
    const allDone = latestTasks.length > 0 && latestTasks.every((task) => task.status === 'completed');
    const someDone = latestTasks.some((task) => task.status === 'completed' || task.status === 'partially_completed');

    updatePlan(plan.id, {
      status: allDone ? 'completed' : someDone ? 'partially_completed' : 'pending',
      lastChecked: new Date(),
    });

    setExecutingPlanId(null);
    setPlanExecutionProgress({ current: 0, total: 0 });
  };

  const startEditDescription = (task: DevelopmentTask) => {
    setEditingTaskId(task.id);
    setDescriptionDraft(task.description || '');
  };

  const saveDescription = (taskId: string) => {
    updateTaskEverywhere(taskId, { description: descriptionDraft, updatedAt: new Date() });
    setEditingTaskId(null);
    setDescriptionDraft('');
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

  const handleCheckBug = async (bug: BugReport) => {
    updateBug(bug.id, { status: 'investigating' });
    const result = await executeAIRequest({
      requestType: 'analysis',
      presetId: 'analyze',
      prompt: `Analyze error status.\nError: ${bug.title}\nDescription: ${bug.description}\nCurrent status: ${bug.status}\nSeverity: ${bug.severity}`,
    });

    updateBug(bug.id, { status: result.ok ? 'investigating' : bug.status, lastChecked: new Date() });
  };

  const handleFixBug = async (bug: BugReport) => {
    updateBug(bug.id, { status: 'fixing' });
    const result = await executeAIRequest({
      requestType: 'debugging',
      presetId: 'debug',
      prompt: `Fix this error.\nTitle: ${bug.title}\nDescription: ${bug.description}\nSeverity: ${bug.severity}\nRelated files: ${bug.relatedFiles.join(', ') || 'N/A'}`,
    });

    updateBug(bug.id, {
      status: result.ok ? 'resolved' : 'fixing',
      lastChecked: new Date(),
    });
  };

  const getTrackingSource = (source: BugReport['source']) => {
    if (source === 'user_reported') return 'User';
    return 'AI';
  };

  const createAutoBugFromSignal = (title: string, description: string, source: BugReport['source']) => {
    const duplicate = bugs.some(
      (bug) => bug.title.toLowerCase() === title.toLowerCase() || bug.description.toLowerCase() === description.toLowerCase()
    );

    if (duplicate) return false;

    const now = new Date();
    addBug({
      id: crypto.randomUUID(),
      title,
      description,
      status: 'open',
      severity: source === 'program_error' ? 'high' : 'medium',
      source,
      relatedFiles: [],
      relatedTasks: [],
      createdAt: now,
      updatedAt: now,
    });
    return true;
  };

  const handleAutoAddErrors = () => {
    let added = 0;

    logs
      .filter((log) => log.type === 'error')
      .forEach((log) => {
        const source: BugReport['source'] = log.source === 'user_action' ? 'user_reported' : 'program_error';
        const wasAdded = createAutoBugFromSignal(
          `Error log: ${log.message.slice(0, 60)}`,
          `${log.message}${log.details ? `\nDetails: ${log.details}` : ''}`,
          source
        );
        if (wasAdded) added += 1;
      });

    aiRequests
      .filter((request) => request.status === 'failed' && request.error)
      .forEach((request) => {
        const wasAdded = createAutoBugFromSignal(
          `AI action failed (${request.type})`,
          request.error ?? 'Unknown AI failure',
          'ai_detected'
        );
        if (wasAdded) added += 1;
      });

    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId || undefined,
      timestamp: new Date(),
      type: added > 0 ? 'success' : 'info',
      source: 'user_action',
      message: added > 0 ? `Auto-added ${added} error(s) from logs and AI actions.` : 'No new errors found to auto-add.',
    });
  };

  const handleManualAdd = () => {
    const title = manualErrorTitle.trim();
    const description = manualErrorDescription.trim();
    if (!title || !description) return;

    const now = new Date();
    addBug({
      id: crypto.randomUUID(),
      title,
      description,
      status: 'open',
      severity: manualErrorSeverity,
      source: 'user_reported',
      relatedFiles: [],
      relatedTasks: [],
      createdAt: now,
      updatedAt: now,
    });

    addLog({
      id: crypto.randomUUID(),
      sessionId: activeSessionId || undefined,
      timestamp: now,
      type: 'info',
      source: 'user_action',
      message: `User added error: ${title}`,
    });

    setManualErrorTitle('');
    setManualErrorDescription('');
    setManualErrorSeverity('medium');
  };

  const handleCreatePlan = () => {
    const title = newPlanTitle.trim();
    if (!title) return;

    const now = new Date();
    const plan: DevelopmentPlan = {
      id: crypto.randomUUID(),
      title,
      description: newPlanDescription.trim(),
      status: 'pending',
      tasks: [],
      createdAt: now,
      updatedAt: now,
    };

    addPlan(plan);
    setActivePlanId(plan.id);
    setNewPlanTitle('');
    setNewPlanDescription('');
    setIsNewPlanFormOpen(false);
  };

  const handleAddTask = () => {
    if (!activePlan) return;

    const title = newTaskTitle.trim();
    if (!title) {
      setTaskFormError('Title is required');
      return;
    }

    const now = new Date();
    const task: DevelopmentTask = {
      id: crypto.randomUUID(),
      title,
      description: newTaskDescription.trim(),
      priority: newTaskPriority,
      status: 'pending',
      items: [],
      createdAt: now,
      updatedAt: now,
    };

    addTask(task);
    updatePlan(activePlan.id, {
      tasks: [...activePlan.tasks, task],
      updatedAt: now,
    });

    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskPriority('medium');
    setTaskFormError('');
    setIsNewTaskFormOpen(false);
  };

  const handleDeleteTask = (taskId: string) => {
    if (!activePlan) return;

    deleteTask(taskId);
    updatePlan(activePlan.id, {
      tasks: activePlan.tasks.filter((task) => task.id !== taskId),
      updatedAt: new Date(),
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-700/80">
        <div className="grid grid-cols-2 border-b border-neutral-700/80">
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'plan' ? 'bg-blue-500/10 text-blue-400' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Plan
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'errors' ? 'bg-red-500/10 text-red-400' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Errors ({bugs.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'plan' ? (
          <div className="space-y-4">
            <section className="space-y-2 rounded-xl border border-neutral-700 bg-neutral-900/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-neutral-100">Планы</h3>
                <button
                  onClick={() => setIsNewPlanFormOpen((value) => !value)}
                  className="rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-900"
                >
                  {isNewPlanFormOpen ? 'Свернуть форму плана' : 'Новый план'}
                </button>
              </div>

              {isNewPlanFormOpen && (
                <div className="space-y-2 rounded-lg border border-neutral-700 bg-neutral-950 p-3">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Новый план</h4>
                  <input
                    value={newPlanTitle}
                    onChange={(event) => setNewPlanTitle(event.target.value)}
                    placeholder="Title"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                  />
                  <textarea
                    value={newPlanDescription}
                    onChange={(event) => setNewPlanDescription(event.target.value)}
                    placeholder="Description"
                    className="min-h-20 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                  />
                  <button
                    onClick={handleCreatePlan}
                    className="inline-flex items-center gap-2 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
                  >
                    <PlusCircle className="h-4 w-4" />
                    + Создать план
                  </button>
                </div>
              )}
            </section>

            {plans.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-700 p-6 text-center text-sm text-neutral-400">
                No development plans yet.
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.18em] text-neutral-500">Active plan</label>
                  <select
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
                    value={activePlan?.id ?? ''}
                    onChange={(event) => setActivePlanId(event.target.value)}
                  >
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.title}
                      </option>
                    ))}
                  </select>
                </div>

                {activePlan && (
                  <section className="space-y-3 rounded-xl border border-neutral-700 bg-neutral-900/60 p-4">
                    <header className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-neutral-100">{activePlan.title}</h3>
                        <p className="text-xs text-neutral-400">Status: {getStatusText(activePlan.status)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            deletePlan(activePlan.id);
                            setActivePlanId(null);
                          }}
                          className="rounded-md border border-rose-500/40 bg-rose-500/10 p-1.5 text-rose-300 hover:bg-rose-500/20"
                          title="Delete plan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {executingPlanId === activePlan.id && planExecutionProgress.total > 0 && (
                        <span className="rounded-md bg-blue-500/10 px-2 py-1 text-xs text-blue-300">
                          {planExecutionProgress.current}/{planExecutionProgress.total}
                        </span>
                      )}
                    </header>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleCheckAllTasks(activePlan)}
                        className="rounded-lg border border-blue-500/50 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-500/20"
                      >
                        Check all tasks
                      </button>
                      <button
                        onClick={() => handleExecutePlan(activePlan)}
                        disabled={executingPlanId === activePlan.id}
                        className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-60"
                      >
                        Execute plan
                      </button>
                    </div>

                    <div className="space-y-2 rounded-lg border border-neutral-700 bg-neutral-950 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Новая задача</h4>
                        <button
                          onClick={() => setIsNewTaskFormOpen((value) => !value)}
                          className="rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-xs font-semibold text-neutral-200 hover:bg-neutral-900"
                        >
                          {isNewTaskFormOpen ? 'Свернуть' : 'Раскрыть'}
                        </button>
                      </div>

                      {isNewTaskFormOpen && (
                        <div className="space-y-2">
                          <input
                            value={newTaskTitle}
                            onChange={(event) => {
                              setNewTaskTitle(event.target.value);
                              if (taskFormError) setTaskFormError('');
                            }}
                            placeholder="Title (required)"
                            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                          />
                          <textarea
                            value={newTaskDescription}
                            onChange={(event) => setNewTaskDescription(event.target.value)}
                            placeholder="Description"
                            className="min-h-20 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                          />
                          <select
                            value={newTaskPriority}
                            onChange={(event) => setNewTaskPriority(event.target.value as DevelopmentTask['priority'])}
                            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                          >
                            <option value="high">high</option>
                            <option value="medium">medium</option>
                            <option value="low">low</option>
                          </select>
                          {taskFormError && <p className="text-xs text-rose-300">{taskFormError}</p>}
                          <button
                            onClick={handleAddTask}
                            className="inline-flex items-center gap-2 rounded-md border border-blue-500/50 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-500/20"
                          >
                            <PlusCircle className="h-4 w-4" />
                            + Добавить задачу
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {planTasks.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-neutral-700 p-3 text-xs text-neutral-500">
                          This plan has no tasks.
                        </div>
                      ) : (
                        planTasks.map((task) => (
                          <article key={task.id} className="rounded-lg border border-neutral-700 bg-neutral-900 p-3">
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(task.status)}
                                <h4 className="text-sm font-medium text-neutral-100">{task.title}</h4>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleCheckTask(task)}
                                  className="rounded p-1 text-neutral-400 hover:bg-blue-500/10 hover:text-blue-300"
                                  title="Check task status"
                                >
                                  <Search className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleExecuteTask(task)}
                                  className="rounded p-1 text-neutral-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                                  title={task.status === 'partially_completed' || task.status === 'in_progress' ? 'Continue task' : 'Execute task'}
                                >
                                  <Play className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => startEditDescription(task)}
                                  className="rounded p-1 text-neutral-400 hover:bg-violet-500/10 hover:text-violet-300"
                                  title="Edit task description"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="rounded p-1 text-neutral-400 hover:bg-rose-500/10 hover:text-rose-300"
                                  title="Delete task"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <p className="mb-2 text-xs text-neutral-400">{getStatusText(task.status)}</p>

                            {editingTaskId === task.id ? (
                              <div className="mb-3 space-y-2">
                                <textarea
                                  value={descriptionDraft}
                                  onChange={(event) => setDescriptionDraft(event.target.value)}
                                  className="min-h-20 w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-2 text-xs text-neutral-100"
                                  placeholder="Describe this task"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => saveDescription(task.id)}
                                    className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingTaskId(null)}
                                    className="rounded bg-neutral-700 px-2 py-1 text-xs font-medium text-neutral-200"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="mb-3 text-xs text-neutral-500">{task.description || 'No description yet.'}</p>
                            )}

                            <div className="space-y-1">
                              {task.items.length === 0 ? (
                                <p className="text-xs text-neutral-600">No subtasks.</p>
                              ) : (
                                task.items.map((item) => (
                                  <label key={item.id} className="flex cursor-pointer items-center gap-2 text-xs text-neutral-300">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSubtask(task, item.id)}
                                      className="text-neutral-500 hover:text-neutral-300"
                                      title="Toggle subtask"
                                    >
                                      {item.completed ? (
                                        <CheckSquare className="h-3.5 w-3.5" />
                                      ) : (
                                        <Square className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                    <span className={item.completed ? 'text-neutral-500 line-through' : ''}>{item.title}</span>
                                  </label>
                                ))
                              )}
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <section className="rounded-xl border border-neutral-700 bg-neutral-900/40 p-3">
              <header className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-100">Error intake</h3>
                <button
                  onClick={handleAutoAddErrors}
                  className="rounded-md border border-blue-500/40 bg-blue-500/10 px-2.5 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-500/20"
                >
                  Auto-add from logs + AI actions
                </button>
              </header>

              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={manualErrorTitle}
                  onChange={(event) => setManualErrorTitle(event.target.value)}
                  placeholder="Manual error title"
                  className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                />
                <select
                  value={manualErrorSeverity}
                  onChange={(event) => setManualErrorSeverity(event.target.value as BugReport['severity'])}
                  className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                >
                  <option value="low">Low severity</option>
                  <option value="medium">Medium severity</option>
                  <option value="high">High severity</option>
                  <option value="critical">Critical severity</option>
                </select>
              </div>

              <textarea
                value={manualErrorDescription}
                onChange={(event) => setManualErrorDescription(event.target.value)}
                placeholder="Describe the issue for tracking..."
                className="mt-2 min-h-20 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
              />

              <button
                onClick={handleManualAdd}
                className="mt-2 inline-flex items-center gap-2 rounded-md border border-violet-500/50 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-500/20"
              >
                <PlusCircle className="h-4 w-4" />
                Add error manually
              </button>
            </section>

            {bugs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-700 p-6 text-center text-sm text-neutral-400">
                No errors reported.
              </div>
            ) : (
              bugs.map((bug) => (
                <article key={bug.id} className={`rounded-lg border p-3 ${getBugSeverityColor(bug.severity)}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      <h4 className="text-sm font-semibold text-neutral-100">{bug.title}</h4>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCheckBug(bug)}
                        className="rounded p-1 text-neutral-300 hover:bg-blue-500/10"
                        title="Check bug (analysis preset)"
                      >
                        <Search className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleFixBug(bug)}
                        className="rounded p-1 text-neutral-300 hover:bg-emerald-500/10"
                        title="Fix bug (bug fixing preset)"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteBug(bug.id)} className="rounded p-1 text-neutral-300 hover:bg-red-500/10">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mb-2 grid grid-cols-3 gap-2 text-[11px] text-neutral-300">
                    <div>
                      <span className="text-neutral-400">Description</span>
                    </div>
                    <div>
                      <span className="text-neutral-400">Status</span>
                      <p className="font-semibold uppercase tracking-wide">{bug.status}</p>
                    </div>
                    <div>
                      <span className="text-neutral-400">Source</span>
                      <p className="inline-flex items-center gap-1 font-semibold">
                        {getTrackingSource(bug.source) === 'AI' ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                        {getTrackingSource(bug.source)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-200/90">{bug.description}</p>
                </article>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
