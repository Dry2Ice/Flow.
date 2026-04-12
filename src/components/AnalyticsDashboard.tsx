// src/components/AnalyticsDashboard.tsx

"use client";

import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { BarChart3, Code, Clock, Zap, TrendingUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const StatCard = ({ title, value, subtitle, icon: Icon, color }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color: string;
}) => (
  <div className={`bg-neutral-800 border border-neutral-700 rounded-lg p-4 ${color}`}>
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-medium text-neutral-300">{title}</h3>
      <Icon className="w-5 h-5 text-neutral-400" />
    </div>
    <div className="text-2xl font-bold text-white mb-1">{value}</div>
    {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
  </div>
);

export function AnalyticsDashboard() {
  const { projects, currentProject, logs, bugs, aiRequests, tasks } = useAppStore();

  const stats = useMemo(() => {
    const totalFiles = currentProject?.files.length || 0;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalBugs = bugs.length;
    const resolvedBugs = bugs.filter(b => b.status === 'resolved').length;
    const totalRequests = aiRequests.length;
    const successfulRequests = aiRequests.filter(r => r.status === 'completed').length;
    const totalTokens = aiRequests.reduce((sum, r) => sum + (r.actualTokens || 0), 0);

    return {
      totalFiles,
      totalTasks,
      completedTasks,
      taskCompletionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      totalBugs,
      resolvedBugs,
      bugResolutionRate: totalBugs > 0 ? (resolvedBugs / totalBugs) * 100 : 0,
      totalRequests,
      successfulRequests,
      requestSuccessRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      totalTokens,
      averageTokensPerRequest: totalRequests > 0 ? totalTokens / totalRequests : 0,
    };
  }, [currentProject, tasks, bugs, aiRequests]);

  const recentActivity = useMemo(() => {
    return logs
      .filter(log => log.type !== 'info')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5);
  }, [logs]);

  return (
    <div className="h-full bg-neutral-900 p-4 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Analytics Dashboard</h2>
          <p className="text-sm text-neutral-400">Project insights and development metrics</p>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Files"
          value={stats.totalFiles}
          subtitle="Total project files"
          icon={Code}
          color="border-blue-500/20"
        />
        <StatCard
          title="Tasks"
          value={`${stats.completedTasks}/${stats.totalTasks}`}
          subtitle={`${stats.taskCompletionRate.toFixed(1)}% completed`}
          icon={CheckCircle}
          color="border-green-500/20"
        />
        <StatCard
          title="Bugs"
          value={`${stats.resolvedBugs}/${stats.totalBugs}`}
          subtitle={`${stats.bugResolutionRate.toFixed(1)}% resolved`}
          icon={AlertTriangle}
          color="border-red-500/20"
        />
        <StatCard
          title="AI Requests"
          value={stats.totalRequests}
          subtitle={`${stats.requestSuccessRate.toFixed(1)}% success rate`}
          icon={Zap}
          color="border-purple-500/20"
        />
      </div>

      {/* AI Usage Stats */}
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4">
        <h3 className="text-sm font-medium text-neutral-300 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          AI Usage Analytics
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-lg font-semibold text-white">{stats.totalTokens.toLocaleString()}</div>
            <div className="text-xs text-neutral-500">Total tokens used</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-white">{stats.averageTokensPerRequest.toFixed(0)}</div>
            <div className="text-xs text-neutral-500">Avg tokens per request</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4">
        <h3 className="text-sm font-medium text-neutral-300 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Recent Activity
        </h3>
        <div className="space-y-2">
          {recentActivity.length === 0 ? (
            <p className="text-sm text-neutral-500">No recent activity</p>
          ) : (
            recentActivity.map((log) => (
              <div key={log.id} className="flex items-center gap-3 text-xs">
                <div className={`w-2 h-2 rounded-full ${
                  log.type === 'success' ? 'bg-green-400' :
                  log.type === 'error' ? 'bg-red-400' :
                  log.type === 'warning' ? 'bg-yellow-400' : 'bg-blue-400'
                }`} />
                <span className="text-neutral-300 truncate">{log.message}</span>
                <span className="text-neutral-500 ml-auto">
                  {log.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Project Health Indicator */}
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4">
        <h3 className="text-sm font-medium text-neutral-300 mb-3">Project Health</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-neutral-400">Task Completion</span>
              <span className="text-neutral-300">{stats.taskCompletionRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-neutral-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.taskCompletionRate}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-neutral-400">Bug Resolution</span>
              <span className="text-neutral-300">{stats.bugResolutionRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-neutral-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.bugResolutionRate}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-neutral-400">AI Success Rate</span>
              <span className="text-neutral-300">{stats.requestSuccessRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-neutral-700 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.requestSuccessRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}