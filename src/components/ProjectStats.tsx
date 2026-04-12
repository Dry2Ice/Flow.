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
  <div className="dark:bg-neutral-800 light:bg-white border dark:border-neutral-700 light:border-gray-200 rounded-xl p-4 hover-lift">
    <div className="flex items-center gap-3 mb-2">
      <div className={`p-2 rounded-lg ${
        color === 'blue' ? 'dark:bg-blue-500/20 light:bg-blue-100' :
        color === 'green' ? 'dark:bg-green-500/20 light:bg-green-100' :
        color === 'purple' ? 'dark:bg-purple-500/20 light:bg-purple-100' :
        color === 'orange' ? 'dark:bg-orange-500/20 light:bg-orange-100' :
        'dark:bg-neutral-700 light:bg-gray-100'
      }`}>
        <Icon className={`w-5 h-5 ${
          color === 'blue' ? 'dark:text-blue-400 light:text-blue-600' :
          color === 'green' ? 'dark:text-green-400 light:text-green-600' :
          color === 'purple' ? 'dark:text-purple-400 light:text-purple-600' :
          color === 'orange' ? 'dark:text-orange-400 light:text-orange-600' :
          'dark:text-neutral-300 light:text-gray-600'
        }`} />
      </div>
      <div>
        <h4 className="text-sm font-medium dark:text-neutral-300 light:text-gray-700">{title}</h4>
        <p className="text-lg font-bold dark:text-white light:text-gray-900">{value}</p>
      </div>
    </div>
    {subtitle && (
      <p className="text-xs dark:text-neutral-500 light:text-gray-500 mt-2">{subtitle}</p>
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
    const totalTokens = aiRequests.reduce((sum, r) => sum + (r.actualTokens || 0), 0);
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
      totalTokens,
      totalRequests,
      successRate,
      recentLogs,
      projectSize: formatBytes(codeStats.size),
    };
  }, [currentProject, openFiles, logs, aiRequests]);

  if (!stats) {
    return (
      <div className="h-full dark:bg-neutral-900 light:bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 dark:text-neutral-600 light:text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium dark:text-neutral-300 light:text-gray-700 mb-2">
            No Project Selected
          </h3>
          <p className="dark:text-neutral-500 light:text-gray-500">
            Select a project to view statistics
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full dark:bg-neutral-900 light:bg-gray-50 p-6 overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold dark:text-white light:text-gray-900">Project Statistics</h2>
          <p className="text-sm dark:text-neutral-400 light:text-gray-600">{currentProject?.name}</p>
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
        <StatCard
          title="AI Tokens"
          value={stats.totalTokens.toLocaleString()}
          subtitle={`${stats.successRate.toFixed(1)}% success rate`}
          icon={Activity}
          color="orange"
        />
      </div>

      {/* Language Distribution */}
      <div className="dark:bg-neutral-800 light:bg-white border dark:border-neutral-700 light:border-gray-200 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-medium dark:text-neutral-300 light:text-gray-700 mb-3 flex items-center gap-2">
          <Database className="w-4 h-4" />
          Language Distribution
        </h3>
        <div className="space-y-2">
          {Object.entries(stats.languageStats).map(([language, count]) => (
            <div key={language} className="flex items-center justify-between">
              <span className="text-sm dark:text-neutral-300 light:text-gray-700 capitalize">
                {language}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-16 bg-neutral-700 light:bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                    style={{ width: `${(count / stats.totalFiles) * 100}%` }}
                  />
                </div>
                <span className="text-sm dark:text-neutral-400 light:text-gray-600 w-8 text-right">
                  {count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Stats */}
      <div className="dark:bg-neutral-800 light:bg-white border dark:border-neutral-700 light:border-gray-200 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-medium dark:text-neutral-300 light:text-gray-700 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Activity Overview
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold dark:text-white light:text-gray-900 mb-1">
              {stats.totalRequests}
            </div>
            <div className="text-xs dark:text-neutral-500 light:text-gray-500 uppercase tracking-wide">AI Requests</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold dark:text-white light:text-gray-900 mb-1">
              {stats.recentLogs}
            </div>
            <div className="text-xs dark:text-neutral-500 light:text-gray-500 uppercase tracking-wide">Total Logs</div>
          </div>
        </div>
      </div>

      {/* Project Health */}
      <div className="dark:bg-neutral-800 light:bg-white border dark:border-neutral-700 light:border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-medium dark:text-neutral-300 light:text-gray-700 mb-3 flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          Project Health
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="dark:text-neutral-400 light:text-gray-600">AI Success Rate</span>
              <span className="dark:text-neutral-300 light:text-gray-700 font-medium">{stats.successRate.toFixed(1)}%</span>
            </div>
            <div className="w-full dark:bg-neutral-700 light:bg-gray-200 rounded-full h-2">
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
              <span className="dark:text-neutral-400 light:text-gray-600">File Utilization</span>
              <span className="dark:text-neutral-300 light:text-gray-700 font-medium">
                {((stats.openFileCount / Math.max(stats.totalFiles, 1)) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full dark:bg-neutral-700 light:bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                style={{ width: `${(stats.openFileCount / Math.max(stats.totalFiles, 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t dark:border-neutral-700 light:border-gray-200">
          <div className="flex items-center justify-center gap-2 text-xs dark:text-neutral-400 light:text-gray-500">
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