// src/components/ProjectStats.tsx

"use client";

import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  FileText,
  Code,
  Database,
  HardDrive,
  Activity,
  Zap,
  TrendingUp,
  GitBranch,
  Clock,
  BarChart3
} from 'lucide-react';

const StatCard = ({ title, value, subtitle, icon: Icon, color = "blue" }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color?: string;
}) => (
  <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl p-4 hover-lift">
    <div className="flex items-center gap-3 mb-2">
      <div className={`p-2 rounded-lg ${
        color === 'blue' ? 'bg-blue-100 dark:bg-blue-500/20' :
        color === 'green' ? 'bg-green-100 dark:bg-green-500/20' :
        color === 'purple' ? 'bg-purple-100 dark:bg-purple-500/20' :
        color === 'orange' ? 'bg-orange-100 dark:bg-orange-500/20' :
        'bg-gray-100 dark:bg-neutral-700'
      }`}>
        <Icon className={`w-5 h-5 ${
          color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
          color === 'green' ? 'text-green-600 dark:text-green-400' :
          color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
          color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
          'text-gray-600 dark:text-neutral-300'
        }`} />
      </div>
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-neutral-300">{title}</h4>
        <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
    {subtitle && (
      <p className="text-xs text-gray-500 dark:text-neutral-500 mt-2">{subtitle}</p>
    )}
  </div>
);

export function ProjectStats() {
  const { currentProject, openFiles, logs, aiRequests } = useAppStore();

  const stats = useMemo(() => {
    if (!currentProject) {
      return null;
    }

    // File statistics
    const totalFiles = currentProject.files.length;
    const openFileCount = openFiles.length;

    // Language distribution
    const languageStats = currentProject.files.reduce((acc, file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
      const language = getLanguageFromExtension(ext);
      acc[language] = (acc[language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Code statistics (estimated from open files)
    const codeStats = openFiles.reduce((acc, file) => {
      if (file.content) {
        const lines = file.content.split('\n').length;
        const size = new Blob([file.content]).size;
        acc.lines += lines;
        acc.size += size;
      }
      return acc;
    }, { lines: 0, size: 0 });

    // AI usage statistics
    const totalTokensSpent = aiRequests.reduce((sum, r) => sum + (r.actualTokens || 0), 0);
    const lastRequest = [...aiRequests]
      .reverse()
      .find(r => r.status === 'completed' || r.status === 'running');
    const currentContextTokens = lastRequest?.estimatedTokens ?? 0;
    const contextLimit = (() => {
      try {
        const s = JSON.parse(localStorage.getItem('nim-settings') || '{}');
        return typeof s.contextTokens === 'number' && s.contextTokens > 0 ? s.contextTokens : null;
      } catch {
        return null;
      }
    })();
    const totalRequests = aiRequests.length;
    const successfulRequests = aiRequests.filter(r => r.status === 'completed').length;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

    // Activity statistics
    const recentLogs = logs.length;

    return {
      totalFiles,
      openFileCount,
      languageStats,
      codeStats,
      totalTokensSpent,
      currentContextTokens,
      contextLimit,
      totalRequests,
      successRate,
      recentLogs,
      projectSize: formatBytes(codeStats.size),
    };
  }, [currentProject, openFiles, logs, aiRequests]);

  if (!stats) {
    return (
      <div className="h-full bg-gray-50 dark:bg-neutral-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 dark:text-neutral-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-neutral-300 mb-2">
            No Project Selected
          </h3>
          <p className="text-gray-500 dark:text-neutral-500">
            Select a project to view statistics
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 dark:bg-neutral-900 p-6 overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Project Statistics</h2>
          <p className="text-sm text-gray-600 dark:text-neutral-400">{currentProject?.name}</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard
          title="Total Files"
          value={stats.totalFiles}
          subtitle={`${stats.openFileCount} currently open`}
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Lines of Code"
          value={stats.codeStats.lines.toLocaleString()}
          subtitle="Estimated from open files"
          icon={Code}
          color="green"
        />
        <StatCard
          title="Project Size"
          value={stats.projectSize}
          subtitle="Based on open files"
          icon={HardDrive}
          color="purple"
        />
        <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl p-4 hover-lift">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-500/20">
              <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-neutral-300">Context Tokens (est.)</h4>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.currentContextTokens.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-neutral-500 mt-2">last request size</p>
          {stats.contextLimit !== null && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full"
                  style={{ width: `${Math.min((stats.currentContextTokens / stats.contextLimit) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-neutral-500 mt-2">
                {stats.currentContextTokens.toLocaleString()} / {stats.contextLimit.toLocaleString()} ({((stats.currentContextTokens / stats.contextLimit) * 100).toFixed(0)}%)
              </p>
            </div>
          )}
        </div>
        <StatCard
          title="Session Tokens"
          value={stats.totalTokensSpent.toLocaleString()}
          subtitle="total spent"
          icon={Activity}
          color="orange"
        />
      </div>

      {/* Language Distribution */}
      <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
          <Database className="w-4 h-4" />
          Language Distribution
        </h3>
        <div className="space-y-2">
          {Object.entries(stats.languageStats).map(([language, count]) => (
            <div key={language} className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-neutral-300 capitalize">
                {language}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-16 bg-neutral-700 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                    style={{ width: `${(count / stats.totalFiles) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 dark:text-neutral-400 w-8 text-right">
                  {count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Stats */}
      <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Activity Overview
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {stats.totalRequests}
            </div>
            <div className="text-xs text-gray-500 dark:text-neutral-500 uppercase tracking-wide">AI Requests</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {stats.recentLogs}
            </div>
            <div className="text-xs text-gray-500 dark:text-neutral-500 uppercase tracking-wide">Total Logs</div>
          </div>
        </div>
      </div>

      {/* Project Health */}
      <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          Project Health
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-neutral-400">AI Success Rate</span>
              <span className="text-gray-700 dark:text-neutral-300 font-medium">{stats.successRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  stats.successRate > 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                  stats.successRate > 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                  'bg-gradient-to-r from-red-500 to-pink-500'
                }`}
                style={{ width: `${stats.successRate}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-neutral-400">File Utilization</span>
              <span className="text-gray-700 dark:text-neutral-300 font-medium">
                {((stats.openFileCount / Math.max(stats.totalFiles, 1)) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                style={{ width: `${(stats.openFileCount / Math.max(stats.totalFiles, 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-neutral-700">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-neutral-400">
            <Clock className="w-3 h-3" />
            <span>Auto-updating every 30 seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getLanguageFromExtension(ext: string): string {
  const languageMap: Record<string, string> = {
    'js': 'JavaScript',
    'jsx': 'React',
    'ts': 'TypeScript',
    'tsx': 'React TypeScript',
    'py': 'Python',
    'java': 'Java',
    'cpp': 'C++',
    'c': 'C',
    'cs': 'C#',
    'php': 'PHP',
    'rb': 'Ruby',
    'go': 'Go',
    'rs': 'Rust',
    'swift': 'Swift',
    'kt': 'Kotlin',
    'scala': 'Scala',
    'html': 'HTML',
    'css': 'CSS',
    'scss': 'SCSS',
    'sass': 'SASS',
    'less': 'Less',
    'json': 'JSON',
    'xml': 'XML',
    'yaml': 'YAML',
    'yml': 'YAML',
    'md': 'Markdown',
    'sql': 'SQL',
    'sh': 'Shell',
    'bash': 'Bash',
    'dockerfile': 'Docker',
    'gitignore': 'Git',
    'env': 'Environment',
  };

  return languageMap[ext] || ext.toUpperCase();
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
