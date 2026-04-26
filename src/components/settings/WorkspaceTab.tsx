"use client";

import { useAppStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';

interface WorkspaceTabProps {
  projectPath: string;
  isTrustingPath: boolean;
  onProjectPathChange: (value: string) => void;
  onTrustPath: () => Promise<void>;
  autoValidateAfterAI: boolean;
  autoCommitAfterAI: boolean;
  onAutoValidateChange: (value: boolean) => void;
  onAutoCommitChange: (value: boolean) => void;
}

export function WorkspaceTab({
  projectPath,
  isTrustingPath,
  onProjectPathChange,
  onTrustPath,
  autoValidateAfterAI,
  autoCommitAfterAI,
  onAutoValidateChange,
  onAutoCommitChange,
}: WorkspaceTabProps) {
  const { t } = useI18n();
  const { embeddingConfig } = useAppStore();

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-300 light:text-neutral-700 text-neutral-700">
          Project Directory
        </label>
        <input
          type="text"
          value={projectPath}
          onChange={(e) => onProjectPathChange(e.target.value)}
          className="w-full rounded border border-neutral-600 bg-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="/path/to/your/project"
        />
        <div className="mt-1 text-xs text-neutral-400">Path to your local project directory for file operations</div>
        <div className="mt-2">
          <button
            type="button"
            onClick={() => void onTrustPath()}
            disabled={isTrustingPath || !projectPath.trim()}
            className="rounded bg-amber-600 px-3 py-2 text-xs font-medium transition-colors hover:bg-amber-700 disabled:bg-neutral-600"
          >
            {isTrustingPath ? 'Подтверждаем доверие...' : 'Доверять этому пути'}
          </button>
        </div>
      </div>

      <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-neutral-300 light:text-neutral-700 text-neutral-700">
        <input
          type="checkbox"
          checked={autoValidateAfterAI}
          onChange={(e) => onAutoValidateChange(e.target.checked)}
          className="rounded"
        />
        {t('settings.autoValidate')}
      </label>

      <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-neutral-300 light:text-neutral-700 text-neutral-700">
        <input
          type="checkbox"
          checked={autoCommitAfterAI}
          onChange={(e) => onAutoCommitChange(e.target.checked)}
          className="rounded"
        />
        {t('settings.autoCommit')}
      </label>

      <p className="text-xs text-neutral-500 text-neutral-600">{t('settings.restoreDefaults')}</p>
      {embeddingConfig && (
        <p className="text-xs text-neutral-500 text-neutral-600">
          Embedding: {embeddingConfig.baseUrl} · {embeddingConfig.model}
        </p>
      )}
    </div>
  );
}
