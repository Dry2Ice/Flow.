// src/components/AnalyticsDashboard.tsx

"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { BarChart3, Code, Clock, Zap, TrendingUp, AlertTriangle, CheckCircle, XCircle, Target, Activity } from 'lucide-react';

// Circular Progress Component
const CircularProgress = ({ percentage, size = 60, strokeWidth = 4, color = "#667eea" }: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="dark:text-neutral-700 light:text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold dark:text-white light:text-gray-900">{percentage}%</span>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subtitle, icon: Icon, color, progress }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color: string;
  progress?: number;
}) => (
  <div className={`dark:bg-neutral-800 light:bg-white border dark:border-neutral-700 light:border-gray-200 rounded-xl p-4 hover-lift hover-glow ${color} animate-fade-in shadow-sm dark:shadow-none`}>
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="p-2 dark:bg-neutral-700 light:bg-gray-100 rounded-lg">
          <Icon className="w-5 h-5 dark:text-neutral-300 light:text-gray-600" />
        </div>
        <h3 className="text-sm font-medium dark:text-neutral-300 light:text-gray-700">{title}</h3>
      </div>
      {progress !== undefined && (
        <CircularProgress percentage={progress} size={40} color="rgb(102, 126, 234)" />
      )}
    </div>
    <div className="text-2xl font-bold dark:text-white light:text-gray-900 mb-1">{value}</div>
    {subtitle && <p className="text-xs dark:text-neutral-500 light:text-gray-500">{subtitle}</p>}
  </div>
);

export function AnalyticsDashboard() {
  const { projects, currentProject, logs, bugs, aiRequests, tasks } = useAppStore();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const stats = useMemo(() => {
    const totalFiles = currentProject?.files.length || 0;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalBugs = bugs.length;
    const resolvedBugs = bugs.filter(b => b.status === 'resolved').length;
    const totalRequests = aiRequests.length;
    const successfulRequests = aiRequests.filter(r => r.status === 'completed').length;
    const totalTokensSpent = aiRequests.reduce((sum, r) => sum + (r.actualTokens || 0), 0);

    const lastRequest = [...aiRequests]
      .reverse()
      .find((r) => r.status === 'completed' || r.status === 'running');
    const currentContextTokens = lastRequest?.estimatedTokens ?? 0;

    const contextLimit = (() => {
      try {
        const s = JSON.parse(localStorage.getItem('nim-settings') || '{}');
        return typeof s.contextTokens === 'number' && s.contextTokens > 0 ? s.contextTokens : null;
      } catch {
        return null;
      }
    })();

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
      totalTokensSpent,
      currentContextTokens,
      contextLimit,
      averageTokensPerRequest: totalRequests > 0 ? Math.round(totalTokensSpent / totalRequests) : 0,
    };
  }, [currentProject, tasks, bugs, aiRequests]);

  const recentActivity = useMemo(() => {
    return logs
      .filter(log => log.type !== 'info')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5);
  }, [logs]);

  // Prevent hydration mismatch by not rendering until mounted on client
  if (!mounted) {
    return null;
  }

  return (
    <div className="h-full dark:bg-neutral-900 light:bg-gray-50 p-4 space-y-6 transition-colors duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold dark:text-white light:text-gray-900">Analytics Dashboard</h2>
          <p className="text-sm dark:text-neutral-400 light:text-gray-600">Project insights and development metrics</p>
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
          icon={Target}
          color="border-green-500/20"
          progress={stats.taskCompletionRate}
        />
        <StatCard
          title="Bugs"
          value={`${stats.resolvedBugs}/${stats.totalBugs}`}
          subtitle={`${stats.bugResolutionRate.toFixed(1)}% resolved`}
          icon={AlertTriangle}
          color="border-red-500/20"
          progress={stats.bugResolutionRate}
        />
        <StatCard
          title="AI Requests"
          value={stats.totalRequests}
          subtitle={`${stats.requestSuccessRate.toFixed(1)}% success rate`}
          icon={Activity}
          color="border-purple-500/20"
          progress={stats.requestSuccessRate}
        />
      </div>

      {/* Token Usage Stats */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            title="Context Tokens (est.)"
            value={stats.currentContextTokens.toLocaleString()}
            subtitle="size of last request"
            icon={Zap}
            color="border-blue-500/20"
          />
          <StatCard
            title="Session Tokens"
            value={stats.totalTokensSpent.toLocaleString()}
            subtitle="total spent this session"
            icon={Activity}
            color="border-purple-500/20"
          />
        </div>

        {stats.contextLimit !== null && (
          <div className="dark:bg-neutral-800 light:bg-white border dark:border-neutral-700 light:border-gray-200 rounded-xl p-4 hover-lift">
            <h4 className="text-sm font-medium dark:text-neutral-300 light:text-gray-700 mb-3">Context Usage</h4>
            <div className="h-2 w-full rounded-full dark:bg-neutral-700 light:bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${Math.min((stats.currentContextTokens / stats.contextLimit) * 100, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs dark:text-neutral-500 light:text-gray-500">
              {stats.currentContextTokens.toLocaleString()} / {stats.contextLimit.toLocaleString()} tokens
              ({((stats.currentContextTokens / stats.contextLimit) * 100).toFixed(0)}%)
            </p>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="dark:bg-neutral-800 light:bg-white border dark:border-neutral-700 light:border-gray-200 rounded-xl p-6 hover-lift glass animate-fade-in shadow-sm dark:shadow-none">
        <h3 className="text-sm font-medium dark:text-neutral-300 light:text-gray-700 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-400" />
          Recent Activity
          <div className="ml-auto flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-400">Live</span>
          </div>
        </h3>
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 dark:text-neutral-600 light:text-gray-400 mx-auto mb-2" />
              <p className="text-sm dark:text-neutral-500 light:text-gray-500">No recent activity</p>
            </div>
          ) : (
            recentActivity.map((log, index) => (
              <div key={log.id} className={`flex items-center gap-4 p-3 rounded-lg transition-all duration-200 hover-scale animate-slide-in`} style={{animationDelay: `${index * 0.1}s`}}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  log.type === 'success' ? 'bg-green-400 shadow-green-400/50 shadow-lg' :
                  log.type === 'error' ? 'bg-red-400 shadow-red-400/50 shadow-lg' :
                  log.type === 'warning' ? 'bg-yellow-400 shadow-yellow-400/50 shadow-lg' : 'bg-blue-400 shadow-blue-400/50 shadow-lg'
                }`} />
                <span className="dark:text-neutral-300 light:text-gray-700 flex-1 text-sm">{log.message}</span>
                <span className="dark:text-neutral-500 light:text-gray-500 text-xs font-mono">
                  {log.timestamp.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Project Health Indicator */}
      <div className="dark:bg-neutral-800 light:bg-white border dark:border-neutral-700 light:border-gray-200 rounded-xl p-6 hover-lift glass animate-fade-in shadow-sm dark:shadow-none">
        <h3 className="text-sm font-medium dark:text-neutral-300 light:text-gray-700 mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-green-400" />
          Project Health
          <div className="ml-auto">
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              (stats.taskCompletionRate + stats.bugResolutionRate + stats.requestSuccessRate) / 3 > 70
                ? 'dark:bg-green-500/20 dark:text-green-400 light:bg-green-100 light:text-green-700'
                : (stats.taskCompletionRate + stats.bugResolutionRate + stats.requestSuccessRate) / 3 > 40
                ? 'dark:bg-yellow-500/20 dark:text-yellow-400 light:bg-yellow-100 light:text-yellow-700'
                : 'dark:bg-red-500/20 dark:text-red-400 light:bg-red-100 light:text-red-700'
            }`}>
              {((stats.taskCompletionRate + stats.bugResolutionRate + stats.requestSuccessRate) / 3).toFixed(0)}% Healthy
            </div>
          </div>
        </h3>
        <div className="space-y-4">
          <div className="group">
            <div className="flex justify-between text-sm mb-2">
              <span className="dark:text-neutral-400 light:text-gray-600 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Task Completion
              </span>
              <span className="dark:text-neutral-300 light:text-gray-700 font-medium">{stats.taskCompletionRate.toFixed(1)}%</span>
            </div>
            <div className="w-full dark:bg-neutral-700 light:bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-1000 ease-out group-hover:shadow-lg group-hover:shadow-green-500/30"
                style={{ width: `${stats.taskCompletionRate}%` }}
              />
            </div>
          </div>

          <div className="group">
            <div className="flex justify-between text-sm mb-2">
              <span className="dark:text-neutral-400 light:text-gray-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-400" />
                Bug Resolution
              </span>
              <span className="dark:text-neutral-300 light:text-gray-700 font-medium">{stats.bugResolutionRate.toFixed(1)}%</span>
            </div>
            <div className="w-full dark:bg-neutral-700 light:bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-1000 ease-out group-hover:shadow-lg group-hover:shadow-blue-500/30"
                style={{ width: `${stats.bugResolutionRate}%` }}
              />
            </div>
          </div>

          <div className="group">
            <div className="flex justify-between text-sm mb-2">
              <span className="dark:text-neutral-400 light:text-gray-600 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                AI Success Rate
              </span>
              <span className="dark:text-neutral-300 light:text-gray-700 font-medium">{stats.requestSuccessRate.toFixed(1)}%</span>
            </div>
            <div className="w-full dark:bg-neutral-700 light:bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-1000 ease-out group-hover:shadow-lg group-hover:shadow-purple-500/30"
                style={{ width: `${stats.requestSuccessRate}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 dark:border-t dark:border-neutral-700 light:border-t light:border-gray-200">
          <div className="flex items-center justify-center gap-2 text-xs dark:text-neutral-400 light:text-gray-500">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
            <span>Auto-updating every 30 seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
}