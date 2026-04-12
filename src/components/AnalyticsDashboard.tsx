// src/components/AnalyticsDashboard.tsx

"use client";

import { useMemo } from 'react';
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
          className="text-neutral-700"
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
        <span className="text-sm font-bold text-white">{percentage}%</span>
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
  <div className={`bg-neutral-800 border border-neutral-700 rounded-xl p-4 hover-lift hover-glow ${color} animate-fade-in`}>
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-neutral-700 rounded-lg">
          <Icon className="w-5 h-5 text-neutral-300" />
        </div>
        <h3 className="text-sm font-medium text-neutral-300">{title}</h3>
      </div>
      {progress !== undefined && (
        <CircularProgress percentage={progress} size={40} color="rgb(102, 126, 234)" />
      )}
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

      {/* AI Usage Stats */}
      <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 hover-lift glass animate-fade-in">
        <h3 className="text-sm font-medium text-neutral-300 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          AI Usage Analytics
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {stats.totalTokens.toLocaleString()}
            </div>
            <div className="text-xs text-neutral-500 uppercase tracking-wide">Total Tokens</div>
            <div className="mt-2 w-full bg-neutral-700 rounded-full h-1">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 rounded-full animate-pulse" style={{width: '100%'}}></div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              {stats.averageTokensPerRequest.toFixed(0)}
            </div>
            <div className="text-xs text-neutral-500 uppercase tracking-wide">Avg per Request</div>
            <div className="mt-2 w-full bg-neutral-700 rounded-full h-1">
              <div className="bg-gradient-to-r from-green-500 to-blue-500 h-1 rounded-full animate-pulse" style={{width: '70%'}}></div>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-neutral-700">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Efficiency: {stats.totalRequests > 0 ? 'High' : 'No Data'}</span>
            <span>Last Updated: Just now</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 hover-lift glass animate-fade-in">
        <h3 className="text-sm font-medium text-neutral-300 mb-4 flex items-center gap-2">
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
              <Clock className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">No recent activity</p>
            </div>
          ) : (
            recentActivity.map((log, index) => (
              <div key={log.id} className={`flex items-center gap-4 p-3 rounded-lg transition-all duration-200 hover-scale animate-slide-in`} style={{animationDelay: `${index * 0.1}s`}}>
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  log.type === 'success' ? 'bg-green-400 shadow-green-400/50 shadow-lg' :
                  log.type === 'error' ? 'bg-red-400 shadow-red-400/50 shadow-lg' :
                  log.type === 'warning' ? 'bg-yellow-400 shadow-yellow-400/50 shadow-lg' : 'bg-blue-400 shadow-blue-400/50 shadow-lg'
                }`} />
                <span className="text-neutral-300 flex-1 text-sm">{log.message}</span>
                <span className="text-neutral-500 text-xs font-mono">
                  {log.timestamp.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Project Health Indicator */}
      <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 hover-lift glass animate-fade-in">
        <h3 className="text-sm font-medium text-neutral-300 mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-green-400" />
          Project Health
          <div className="ml-auto">
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              (stats.taskCompletionRate + stats.bugResolutionRate + stats.requestSuccessRate) / 3 > 70
                ? 'bg-green-500/20 text-green-400'
                : (stats.taskCompletionRate + stats.bugResolutionRate + stats.requestSuccessRate) / 3 > 40
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {((stats.taskCompletionRate + stats.bugResolutionRate + stats.requestSuccessRate) / 3).toFixed(0)}% Healthy
            </div>
          </div>
        </h3>
        <div className="space-y-4">
          <div className="group">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-neutral-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Task Completion
              </span>
              <span className="text-neutral-300 font-medium">{stats.taskCompletionRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-neutral-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-1000 ease-out group-hover:shadow-lg group-hover:shadow-green-500/30"
                style={{ width: `${stats.taskCompletionRate}%` }}
              />
            </div>
          </div>

          <div className="group">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-neutral-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-400" />
                Bug Resolution
              </span>
              <span className="text-neutral-300 font-medium">{stats.bugResolutionRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-neutral-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-1000 ease-out group-hover:shadow-lg group-hover:shadow-blue-500/30"
                style={{ width: `${stats.bugResolutionRate}%` }}
              />
            </div>
          </div>

          <div className="group">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-neutral-400 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                AI Success Rate
              </span>
              <span className="text-neutral-300 font-medium">{stats.requestSuccessRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-neutral-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-1000 ease-out group-hover:shadow-lg group-hover:shadow-purple-500/30"
                style={{ width: `${stats.requestSuccessRate}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-neutral-700">
          <div className="flex items-center justify-center gap-2 text-xs text-neutral-400">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
            <span>Auto-updating every 30 seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
}