"use client";

interface EmbeddingTabProps {
  embedUseSameApiKey: boolean;
  embedApiKey: string;
  embedBaseUrl: string;
  embedModel: string;
  availableEmbedModels: string[];
  isLoadingEmbedModels: boolean;
  embeddingTestStatus: 'idle' | 'testing' | 'success' | 'error';
  onEmbedUseSameApiKeyChange: (value: boolean) => void;
  onEmbedApiKeyChange: (value: string) => void;
  onEmbedBaseUrlChange: (value: string) => void;
  onEmbedModelChange: (value: string) => void;
  onLoadEmbedModels: () => void;
  onTestEmbedding: () => void;
}

export function EmbeddingTab({
  embedUseSameApiKey,
  embedApiKey,
  embedBaseUrl,
  embedModel,
  availableEmbedModels,
  isLoadingEmbedModels,
  embeddingTestStatus,
  onEmbedUseSameApiKeyChange,
  onEmbedApiKeyChange,
  onEmbedBaseUrlChange,
  onEmbedModelChange,
  onLoadEmbedModels,
  onTestEmbedding,
}: EmbeddingTabProps) {
  return (
    <div className="border-b border-neutral-600 pb-4">
      <h4 className="text-md font-medium text-neutral-200 mb-3 text-neutral-900">Embedding Model</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex items-center gap-2 text-sm text-neutral-300 light:text-neutral-700 text-neutral-700 md:col-span-2">
          <input
            type="checkbox"
            checked={embedUseSameApiKey}
            onChange={(e) => onEmbedUseSameApiKeyChange(e.target.checked)}
            className="rounded border-neutral-600 bg-neutral-700"
          />
          Use same API key
        </label>

        {!embedUseSameApiKey && (
          <div>
            <label className="block text-sm font-medium text-neutral-300 light:text-neutral-700 text-neutral-700 mb-1">
              Embed API Key
            </label>
            <input
              type="password"
              value={embedApiKey}
              onChange={(e) => onEmbedApiKeyChange(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Embedding API key"
            />
          </div>
        )}

        <div className={!embedUseSameApiKey ? '' : 'md:col-span-1'}>
          <label className="block text-sm font-medium text-neutral-300 light:text-neutral-700 text-neutral-700 mb-1">
            Embed Base URL
          </label>
          <input
            type="url"
            value={embedBaseUrl}
            onChange={(e) => onEmbedBaseUrlChange(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://api.nvidia.com/v1"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-neutral-300 light:text-neutral-700 text-neutral-700 mb-1">
            Embed Model
          </label>
          <div className="flex gap-2">
            <select
              value={embedModel}
              onChange={(e) => onEmbedModelChange(e.target.value)}
              className="flex-1 px-3 py-2 bg-neutral-700 border border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select embedding model...</option>
              {availableEmbedModels.map((modelName) => (
                <option key={modelName} value={modelName}>
                  {modelName}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onLoadEmbedModels}
              disabled={isLoadingEmbedModels || !embedBaseUrl || !(embedUseSameApiKey ? true : embedApiKey)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-600 rounded text-sm font-medium transition-colors"
            >
              {isLoadingEmbedModels ? 'Loading…' : 'Load Embed Models'}
            </button>
            <button
              type="button"
              onClick={onTestEmbedding}
              disabled={embeddingTestStatus === 'testing' || !embedModel}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                embeddingTestStatus === 'success'
                  ? 'bg-green-600 hover:bg-green-700'
                  : embeddingTestStatus === 'error'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-purple-600 hover:bg-purple-700 disabled:bg-neutral-600'
              }`}
            >
              {embeddingTestStatus === 'testing' ? 'Testing…' : 'Test Embedding'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
