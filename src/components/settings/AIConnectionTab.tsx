"use client";

import { Check, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface AIConnectionTabProps {
  apiKey: string;
  baseUrl: string;
  model: string;
  availableModels: string[];
  isLoadingModels: boolean;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
  testMessageStatus: 'idle' | 'sending' | 'success' | 'error';
  message: string;
  onApiKeyChange: (value: string) => void;
  onBaseUrlChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onLoadModels: () => Promise<void>;
  onTestConnection: () => Promise<void>;
  onSendTestMessage: () => Promise<void>;
}

export function AIConnectionTab({
  apiKey,
  baseUrl,
  model,
  availableModels,
  isLoadingModels,
  connectionStatus,
  testMessageStatus,
  message,
  onApiKeyChange,
  onBaseUrlChange,
  onModelChange,
  onLoadModels,
  onTestConnection,
  onSendTestMessage,
}: AIConnectionTabProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-300 light:text-neutral-700 text-neutral-700">
            {t('settings.apiKey')}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            className="w-full rounded border border-neutral-600 bg-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('settings.apiKeyPlaceholder')}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-300 light:text-neutral-700 text-neutral-700">
            {t('settings.baseUrl')}
          </label>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => onBaseUrlChange(e.target.value)}
            className="w-full rounded border border-neutral-600 bg-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://api.nvidia.com/v1"
            required
          />
          <div className="mt-1 text-xs text-neutral-400">{t('settings.baseUrlHint')}</div>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-300 light:text-neutral-700 text-neutral-700">
          Model
        </label>
        <div className="flex gap-2">
          <select
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            className="flex-1 rounded border border-neutral-600 bg-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a model...</option>
            {availableModels.map((modelName) => (
              <option key={modelName} value={modelName}>
                {modelName}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void onLoadModels()}
            disabled={isLoadingModels || !apiKey || !baseUrl}
            className="flex items-center gap-1 rounded bg-blue-600 px-3 py-2 text-sm font-medium transition-colors hover:bg-blue-700 disabled:bg-neutral-600"
          >
            {isLoadingModels ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              'Load Models'
            )}
          </button>
        </div>
      </div>

      <div className="border-b border-neutral-600 pb-4">
        <h4 className="mb-3 text-md font-medium text-neutral-200 text-neutral-900">Connection & Testing</h4>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void onTestConnection()}
            disabled={!apiKey || !baseUrl || !model || connectionStatus === 'connecting'}
            className={`flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors ${
              connectionStatus === 'connected'
                ? 'bg-green-600 hover:bg-green-700'
                : connectionStatus === 'error'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-600'
            }`}
          >
            {connectionStatus === 'connecting' ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : connectionStatus === 'connected' ? (
              <Check className="h-4 w-4" />
            ) : connectionStatus === 'error' ? (
              <X className="h-4 w-4" />
            ) : (
              'Test Connection'
            )}
          </button>

          <button
            type="button"
            onClick={() => void onSendTestMessage()}
            disabled={!apiKey || !baseUrl || !model || testMessageStatus === 'sending'}
            className={`flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors ${
              testMessageStatus === 'success'
                ? 'bg-green-600 hover:bg-green-700'
                : testMessageStatus === 'error'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-purple-600 hover:bg-purple-700 disabled:bg-neutral-600'
            }`}
          >
            {testMessageStatus === 'sending' ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : testMessageStatus === 'success' ? (
              <Check className="h-4 w-4" />
            ) : testMessageStatus === 'error' ? (
              <X className="h-4 w-4" />
            ) : (
              'Send Test Message'
            )}
          </button>
        </div>

        {message && (
          <div className="mt-2 rounded border border-neutral-600 bg-neutral-700/60 px-3 py-2 text-sm text-neutral-200 border-neutral-300 bg-neutral-100 text-neutral-800">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
