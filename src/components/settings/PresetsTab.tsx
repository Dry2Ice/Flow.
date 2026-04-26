"use client";

import { Check } from 'lucide-react';
import { PromptPreset } from '@/types';

interface PresetsTabProps {
  generalPrompt: string;
  editingGeneralPrompt: boolean;
  generalPromptText: string;
  promptPresets: PromptPreset[];
  editingPreset: string | null;
  editedPrompt: string;
  activePreset: PromptPreset | null;
  onEditGeneralPrompt: () => void;
  onGeneralPromptTextChange: (value: string) => void;
  onSaveGeneralPrompt: () => void;
  onCancelGeneralPromptEdit: () => void;
  onEditPreset: (id: string, prompt: string) => void;
  onEditedPromptChange: (value: string) => void;
  onSavePreset: (id: string) => void;
  onCancelPresetEdit: () => void;
  onSetActivePreset: (preset: PromptPreset) => void;
}

export function PresetsTab({
  generalPrompt,
  editingGeneralPrompt,
  generalPromptText,
  promptPresets,
  editingPreset,
  editedPrompt,
  activePreset,
  onEditGeneralPrompt,
  onGeneralPromptTextChange,
  onSaveGeneralPrompt,
  onCancelGeneralPromptEdit,
  onEditPreset,
  onEditedPromptChange,
  onSavePreset,
  onCancelPresetEdit,
  onSetActivePreset,
}: PresetsTabProps) {
  return (
    <>
      <div>
        <h4 className="mb-3 border-b border-neutral-600 pb-2 text-md font-medium text-neutral-200 border-neutral-300 text-neutral-900">
          General System Prompt
        </h4>
        <p className="text-sm text-neutral-400 mb-3">
          Global system prompt appended to every request, regardless of selected preset.
        </p>
        <div className="space-y-3">
          {editingGeneralPrompt ? (
            <div>
              <textarea
                value={generalPromptText}
                onChange={(e) => onGeneralPromptTextChange(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={12}
                placeholder="Enter general system prompt..."
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={onSaveGeneralPrompt}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={onCancelGeneralPromptEdit}
                  className="px-3 py-1 bg-neutral-600 hover:bg-neutral-700 rounded text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="p-3 bg-neutral-800 rounded border border-neutral-600 max-h-48 overflow-y-auto">
                <pre className="text-xs text-neutral-300 light:text-neutral-700 text-neutral-700 whitespace-pre-wrap">
                  {generalPrompt}
                </pre>
              </div>
              <button
                type="button"
                onClick={onEditGeneralPrompt}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 light:text-blue-700 text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                Edit General Prompt
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <h4 className="mb-3 border-b border-neutral-600 pb-2 text-md font-medium text-neutral-200 border-neutral-300 text-neutral-900">
          Prompt Presets (3 editable)
        </h4>
        <div className="space-y-3">
          {promptPresets.slice(0, 3).map((preset) => (
            <div
              key={preset.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                activePreset?.id === preset.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-neutral-600 hover:border-neutral-500 hover:bg-neutral-700/50'
              }`}
              onClick={() => !editingPreset && onSetActivePreset(preset)}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  activePreset?.id === preset.id
                    ? 'border-blue-500'
                    : 'border-neutral-400'
                }`}>
                  {activePreset?.id === preset.id && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </div>
                <div className="flex-1">
                  <h5 className="mb-1 font-medium text-neutral-200 text-neutral-900">{preset.name}</h5>
                  <p className="text-sm text-neutral-400 mb-2">{preset.description}</p>

                  {editingPreset === preset.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editedPrompt}
                        onChange={(e) => onEditedPromptChange(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={8}
                        placeholder="Enter system prompt..."
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onSavePreset(preset.id)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={onCancelPresetEdit}
                          className="px-3 py-1 bg-neutral-600 hover:bg-neutral-700 rounded text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <details className="text-xs text-neutral-500">
                        <summary className="cursor-pointer hover:text-neutral-400">View system prompt</summary>
                        <div className="mt-2 p-3 bg-neutral-800 rounded text-neutral-300 light:text-neutral-700 text-neutral-700 whitespace-pre-wrap">
                          {preset.systemPrompt}
                        </div>
                      </details>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditPreset(preset.id, preset.systemPrompt);
                        }}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 light:text-blue-700 text-blue-700 dark:hover:text-blue-300 transition-colors"
                      >
                        Edit Prompt
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {activePreset && (
          <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded">
            <div className="flex items-center gap-2 text-green-700 text-green-700 dark:text-green-400 text-sm">
              <Check className="w-4 h-4" />
              Active preset: <strong>{activePreset.name}</strong>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
