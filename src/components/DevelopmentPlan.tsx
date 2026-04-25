"use client";

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  CheckSquare,
  Circle,
  Clock,
  Edit3,
  PlusCircle,
  Play,
  Search,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
import { executeAIRequest } from '@/lib/ai-executor';
import { aiService } from '@/lib/ai-service';
import { useAppStore } from '@/lib/store';
import { DevelopmentTask } from '@/types';
import type { DevelopmentPlan, TaskItem } from '@/types';

interface DevelopmentPlanProps {
  initialTab?: 'plan';
}

export function DevelopmentPlan({ initialTab = 'plan' }: DevelopmentPlanProps = {}) {
  void initialTab;
  const {
    plans,
    tasks,
    updatePlan,
    addPlan,
    deletePlan,
    addTask,
    updateTask,
    deleteTask,
    addLog,
    activeSessionId,
    currentProject,
  } = useAppStore();

  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [executingPlanId, setExecutingPlanId] = useState<string | null>(null);
  const [planExecutionProgress, setPlanExecutionProgress] = useState({ current: 0, total: 0 });
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState('');
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
      <div className="flex-1 overflow-y-auto p-4">
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
                  className="inline-flex items-center gap-2 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
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
                          onClick={async () => {
                            if (!currentProject) return;

                            addLog({
                              id: crypto.randomUUID(),
                              sessionId: activeSessionId,
                              timestamp: new Date(),
                              type: 'info',
                              message: 'Running AI project analysis...',
                              source: 'ai_execution',
                            });

                            await aiService.buildProjectContext(currentProject.id);

                            addLog({
                              id: crypto.randomUUID(),
                              sessionId: activeSessionId,
                              timestamp: new Date(),
                              type: 'success',
                              message: 'Analysis complete — tasks updated',
                              source: 'ai_execution',
                            });
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-indigo-500/50 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-400 transition-colors hover:bg-indigo-500/20"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Analyze Project
                        </button>
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
                        <span className="rounded-md bg-blue-500/10 px-2 py-1 text-xs text-blue-700 dark:text-blue-300">
                          {planExecutionProgress.current}/{planExecutionProgress.total}
                        </span>
                      )}
                    </header>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleCheckAllTasks(activePlan)}
                        className="rounded-lg border border-blue-500/50 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-500/20"
                      >
                        Check all tasks
                      </button>
                      <button
                        onClick={() => handleExecutePlan(activePlan)}
                        disabled={executingPlanId === activePlan.id}
                        className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-60"
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
                            className="inline-flex items-center gap-2 rounded-md border border-blue-500/50 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-500/20"
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
                                  className="rounded p-1 text-neutral-400 hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-300"
                                  title="Check task status"
                                >
                                  <Search className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleExecuteTask(task)}
                                  className="rounded p-1 text-neutral-400 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-300"
                                  title={task.status === 'partially_completed' || task.status === 'in_progress' ? 'Continue task' : 'Execute task'}
                                >
                                  <Play className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => startEditDescription(task)}
                                  className="rounded p-1 text-neutral-400 hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-300"
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
      </div>
    </div>
  );
}
