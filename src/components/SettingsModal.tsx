// src/components/SettingsModal.tsx

"use client";

import { useState, useEffect } from 'react';
import { X, Check, RotateCcw, Download, Upload, Info } from 'lucide-react';
import axios from 'axios';
import { useAppStore } from '@/lib/store';
import { nvidiaNimService } from '@/lib/nvidia-nim';

interface SettingsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const SETTINGS_STORAGE_KEY = 'nim-settings';
const SETTINGS_VERSION = 2;

const DEFAULT_SETTINGS = {
  apiKey: '',
  baseUrl: '',
  model: '',
  temperature: 0.7,
  topP: 1.0,
  topK: 50,
  maxTokens: 4000,
  contextTokens: 0,
  presencePenalty: 0,
  frequencyPenalty: 0,
  stopSequences: [] as string[],
  projectPath: '',
  embedUseSameApiKey: true,
  embedApiKey: '',
  embedBaseUrl: '',
  embedModel: '',
  autoValidateAfterAI: true,
  autoCommitAfterAI: false,
};

export function SettingsModal({ isOpen: externalIsOpen, onClose: externalOnClose }: SettingsModalProps = {}) {
  const UNTRUSTED_PATH_MESSAGE = "Путь не в списке доверенных. Нажмите 'Доверять этому пути' для разрешения доступа";
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(1.0);
  const [topK, setTopK] = useState(50);
  const [maxTokens, setMaxTokens] = useState(4000);
  const [contextTokens, setContextTokens] = useState(0); // 0 = unlimited
  const [presencePenalty, setPresencePenalty] = useState(0);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0);
  const [stopSequences, setStopSequences] = useState('');
  const [embedUseSameApiKey, setEmbedUseSameApiKey] = useState(true);
  const [embedApiKey, setEmbedApiKey] = useState('');
  const [embedBaseUrl, setEmbedBaseUrl] = useState('');
  const [embedModel, setEmbedModel] = useState('');
  const [autoValidateAfterAI, setAutoValidateAfterAI] = useState(true);
  const [autoCommitAfterAI, setAutoCommitAfterAI] = useState(false);
  const [availableEmbedModels, setAvailableEmbedModels] = useState<string[]>([]);
  const [isLoadingEmbedModels, setIsLoadingEmbedModels] = useState(false);
  const [embeddingTestStatus, setEmbeddingTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // Model management
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [testMessageStatus, setTestMessageStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [projectPath, setProjectPathLocal] = useState('');
  const [isTrustingPath, setIsTrustingPath] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [editingPreset, setEditingPreset] = useState<string | null>(null);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [editingGeneralPrompt, setEditingGeneralPrompt] = useState(false);
  const [generalPromptText, setGeneralPromptText] = useState('');
  const {
    activePreset,
    promptPresets,
    setActivePreset,
    updatePromptPreset,
    setProjectPath,
    embeddingConfig,
    setEmbeddingConfig,
    projectChunks,
    isIndexingProject,
    indexedAt,
    isIndexStale,
    indexProjectForEmbedding,
    generalPrompt,
    setGeneralPrompt,
    setAutoValidateAfterAI: setStoreAutoValidateAfterAI,
    setAutoCommitAfterAI: setStoreAutoCommitAfterAI,
  } = useAppStore();

  // Use external state if provided, otherwise use internal
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const applySettings = (settings: typeof DEFAULT_SETTINGS & { generalPrompt?: string; embeddingConfig?: any; activePresetId?: string | null }) => {
    setApiKey(settings.apiKey || DEFAULT_SETTINGS.apiKey);
    setBaseUrl(settings.baseUrl || DEFAULT_SETTINGS.baseUrl);
    setModel(settings.model || DEFAULT_SETTINGS.model);
    setTemperature(settings.temperature ?? DEFAULT_SETTINGS.temperature);
    setTopP(settings.topP ?? DEFAULT_SETTINGS.topP);
    setTopK(settings.topK ?? DEFAULT_SETTINGS.topK);
    setMaxTokens(settings.maxTokens ?? DEFAULT_SETTINGS.maxTokens);
    setContextTokens(settings.contextTokens ?? DEFAULT_SETTINGS.contextTokens);
    setPresencePenalty(settings.presencePenalty ?? DEFAULT_SETTINGS.presencePenalty);
    setFrequencyPenalty(settings.frequencyPenalty ?? DEFAULT_SETTINGS.frequencyPenalty);
    setStopSequences(Array.isArray(settings.stopSequences) ? settings.stopSequences.join(', ') : '');
    setProjectPathLocal(settings.projectPath || DEFAULT_SETTINGS.projectPath);
    setEmbedUseSameApiKey(settings.embedUseSameApiKey ?? DEFAULT_SETTINGS.embedUseSameApiKey);
    setEmbedApiKey(settings.embedApiKey || settings.apiKey || DEFAULT_SETTINGS.embedApiKey);
    setEmbedBaseUrl(settings.embedBaseUrl || settings.baseUrl || DEFAULT_SETTINGS.embedBaseUrl);
    setEmbedModel(settings.embedModel || DEFAULT_SETTINGS.embedModel);
    setAutoValidateAfterAI(settings.autoValidateAfterAI ?? DEFAULT_SETTINGS.autoValidateAfterAI);
    setAutoCommitAfterAI(settings.autoCommitAfterAI ?? DEFAULT_SETTINGS.autoCommitAfterAI);
    setStoreAutoValidateAfterAI(settings.autoValidateAfterAI ?? DEFAULT_SETTINGS.autoValidateAfterAI);
    setStoreAutoCommitAfterAI(settings.autoCommitAfterAI ?? DEFAULT_SETTINGS.autoCommitAfterAI);
    setEmbeddingConfig(settings.embeddingConfig ?? null);

    if (typeof settings.generalPrompt === 'string') {
      setGeneralPrompt(settings.generalPrompt);
    }

    if (settings.activePresetId) {
      const preset = promptPresets.find((p) => p.id === settings.activePresetId);
      if (preset) {
        setActivePreset(preset);
      }
    }
  };

  const resetSettingsToDefault = (notify = true) => {
    applySettings(DEFAULT_SETTINGS);
    setEmbeddingConfig(null);
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    if (notify) {
      setMessage('Настройки сброшены к значениям по умолчанию.');
      setTimeout(() => setMessage(''), 2500);
    }
  };

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.version !== SETTINGS_VERSION) {
          resetSettingsToDefault(false);
          return;
        }
        applySettings(parsed);
      } catch (error) {
        console.error('Failed to load settings:', error);
        resetSettingsToDefault(false);
      }
    }
  }, []);

  const handleClose = () => {
    if (externalOnClose) {
      externalOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const validateBaseUrl = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) {
      return 'Укажите Base URL';
    }

    if (!/^https?:\/\//i.test(trimmed)) {
      return 'Base URL должен начинаться с http:// или https://';
    }

    try {
      const parsed = new URL(trimmed);
      if (!parsed.pathname || parsed.pathname === '/' || !parsed.pathname.endsWith('/v1')) {
        return 'Base URL должен заканчиваться на /v1';
      }
    } catch {
      return 'Некорректный URL';
    }

    return null;
  };

  const loadAvailableModels = async () => {
    if (!apiKey || !baseUrl) {
      alert('Please enter API Key and Base URL first');
      return;
    }

    setIsLoadingModels(true);
    try {
      const response = await fetch('/api/nim/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, baseUrl }),
      });

      if (response.ok) {
        const data = await response.json();
        const models = data.data?.map((model: any) => model.id) || [];
        setAvailableModels(models);
      } else {
        const err = await response.json().catch(() => ({}));
        alert(`Failed to load models: ${err.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Error loading models:', error);
      alert('Error loading models. Please try again.');
    } finally {
      setIsLoadingModels(false);
    }
  };

  const loadEmbedModels = async () => {
    const resolvedApiKey = embedUseSameApiKey ? apiKey : embedApiKey;
    if (!resolvedApiKey || !embedBaseUrl) {
      alert('Please enter embedding API key and Base URL first');
      return;
    }

    setIsLoadingEmbedModels(true);
    try {
      const response = await fetch('/api/nim/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: resolvedApiKey, baseUrl: embedBaseUrl }),
      });

      if (response.ok) {
        const data = await response.json();
        const models = data.data?.map((item: any) => item.id) || [];
        setAvailableEmbedModels(models);
      } else {
        const err = await response.json().catch(() => ({}));
        alert(`Failed to load embedding models: ${err.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Error loading embedding models:', error);
      alert('Error loading embedding models. Please try again.');
    } finally {
      setIsLoadingEmbedModels(false);
    }
  };

  const testEmbedding = async () => {
    const resolvedApiKey = embedUseSameApiKey ? apiKey : embedApiKey;
    if (!resolvedApiKey || !embedBaseUrl || !embedModel) {
      setMessage('Please fill in embedding API key, base URL, and model');
      return;
    }

    setEmbeddingTestStatus('testing');
    try {
      const response = await fetch('/api/nim/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: ['console.log("hello flow")'],
          model: embedModel,
          apiKey: resolvedApiKey,
          baseUrl: embedBaseUrl,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(data.embeddings) && data.embeddings.length > 0) {
        setEmbeddingTestStatus('success');
        setMessage(`Embedding test successful. Vector dimensions: ${data.embeddings[0]?.length ?? 0}`);
      } else {
        setEmbeddingTestStatus('error');
        setMessage(data?.error || 'Embedding test failed');
      }
    } catch (error) {
      console.error('Embedding test failed:', error);
      setEmbeddingTestStatus('error');
      setMessage('Embedding test failed: network or timeout error.');
    } finally {
      setTimeout(() => setEmbeddingTestStatus('idle'), 3000);
    }
  };

  const testConnection = async () => {
    if (!apiKey || !baseUrl || !model) {
      setMessage('Please fill in API Key, Base URL, and Model');
      return;
    }

    const baseUrlError = validateBaseUrl(baseUrl);
    if (baseUrlError) {
      setMessage(baseUrlError);
      return;
    }

    setConnectionStatus('connecting');
    setMessage('Testing connection (timeout: 15 seconds)...');
    try {
      const response = await fetch('/api/nim/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({ apiKey, baseUrl, model, message: 'Hello' }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setConnectionStatus('connected');
        setMessage('Connection successful.');
        setTimeout(() => setConnectionStatus('idle'), 3000);
      } else {
        const errorText = data?.error || response.statusText || 'Unknown error';
        const causeText = data?.cause ? ` | Cause: ${data.cause}` : '';
        setConnectionStatus('error');
        setMessage(`HTTP ${response.status}: ${errorText}${causeText}`);
        setTimeout(() => setConnectionStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
      setMessage('Connection failed: timeout after 15 seconds or network error.');
      setTimeout(() => setConnectionStatus('idle'), 3000);
    }
  };

  const sendTestMessage = async () => {
    if (!apiKey || !baseUrl || !model) {
      setMessage('Please fill in API Key, Base URL, and Model');
      return;
    }

    const baseUrlError = validateBaseUrl(baseUrl);
    if (baseUrlError) {
      setMessage(baseUrlError);
      return;
    }

    setTestMessageStatus('sending');
    setMessage('Sending test message (timeout: 15 seconds)...');
    try {
      const response = await fetch('/api/nim/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
          apiKey,
          baseUrl,
          model,
          message: 'Say "Hello from Flow!" and nothing else.',
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const reply = data.choices?.[0]?.message?.content;
        if (reply) {
          setTestMessageStatus('success');
          setMessage(`Test successful! AI replied: "${reply}"`);
        } else {
          setTestMessageStatus('error');
          setMessage('Test message succeeded but no response content was returned.');
        }
      } else {
        const errorText = data?.error || response.statusText || 'Unknown error';
        const causeText = data?.cause ? ` | Cause: ${data.cause}` : '';
        setTestMessageStatus('error');
        setMessage(`HTTP ${response.status}: ${errorText}${causeText}`);
      }
    } catch (error) {
      console.error('Test message failed:', error);
      setTestMessageStatus('error');
      setMessage('Test message failed: timeout after 15 seconds or network error.');
    } finally {
      setTimeout(() => setTestMessageStatus('idle'), 3000);
    }
  };

  const handleEditPreset = (presetId: string) => {
    const preset = promptPresets.find(p => p.id === presetId);
    if (preset) {
      setEditingPreset(presetId);
      setEditedPrompt(preset.systemPrompt);
    }
  };

  const handleSavePreset = () => {
    if (editingPreset) {
      updatePromptPreset(editingPreset, { systemPrompt: editedPrompt });
      setEditingPreset(null);
      setEditedPrompt('');
      setMessage('Preset updated successfully!');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const handleCancelEdit = () => {
    setEditingPreset(null);
    setEditedPrompt('');
  };

  const handleEditGeneralPrompt = () => {
    setEditingGeneralPrompt(true);
    setGeneralPromptText(generalPrompt);
  };

  const handleSaveGeneralPrompt = () => {
    setGeneralPrompt(generalPromptText);
    setEditingGeneralPrompt(false);
    setGeneralPromptText('');
    setMessage('General prompt updated successfully!');
    setTimeout(() => setMessage(''), 2000);
  };

  const handleCancelGeneralPromptEdit = () => {
    setEditingGeneralPrompt(false);
    setGeneralPromptText('');
  };

  const handleResetLayout = () => {
    localStorage.removeItem('flow.dockview-layout.v1');
    window.dispatchEvent(new CustomEvent('reset-dock-layout'));
    setMessage('Workspace layout reset to default!');
    setTimeout(() => setMessage(''), 2000);
  };

  const handleExportSettings = () => {
    const payload = {
      version: SETTINGS_VERSION,
      apiKey,
      baseUrl,
      model,
      temperature,
      topP,
      topK,
      maxTokens,
      contextTokens,
      presencePenalty,
      frequencyPenalty,
      stopSequences: stopSequences ? stopSequences.split(',').map((s) => s.trim()).filter(Boolean) : [],
      projectPath,
      activePresetId: activePreset?.id || null,
      generalPrompt,
      embedUseSameApiKey,
      embedApiKey,
      embedBaseUrl,
      embedModel,
      autoValidateAfterAI,
      autoCommitAfterAI,
      embeddingConfig,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'flow-settings.json';
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Настройки экспортированы в JSON.');
    setTimeout(() => setMessage(''), 2500);
  };

  const handleImportSettings: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed.version !== SETTINGS_VERSION) {
        setMessage(`Версия настроек не поддерживается. Ожидалась ${SETTINGS_VERSION}.`);
        return;
      }
      applySettings(parsed);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(parsed));
      setMessage('Настройки успешно импортированы.');
    } catch (error) {
      console.error('Import settings failed:', error);
      setMessage('Не удалось импортировать настройки: проверьте JSON файл.');
    } finally {
      event.target.value = '';
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleIntegerFieldChange = (
    value: string,
    onValidValue: (nextValue: number) => void,
  ) => {
    if (value.trim() === '') {
      return;
    }

    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue) || !Number.isInteger(parsedValue)) {
      return;
    }

    onValidValue(parsedValue);
  };

  const handleContextTokensChange = (value: string) => {
    handleIntegerFieldChange(value, setContextTokens);
  };

  const handleMaxTokensChange = (value: string) => {
    handleIntegerFieldChange(value, setMaxTokens);
  };

  const handleFloatFieldChange = (
    value: string,
    onValidValue: (nextValue: number) => void,
  ) => {
    if (value.trim() === '') {
      return;
    }

    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    onValidValue(parsedValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const config = {
        apiKey,
        baseUrl,
        model,
        temperature,
        topP,
        topK,
        maxTokens,
        contextTokens,
        presencePenalty,
        frequencyPenalty,
        stopSequences: stopSequences ? stopSequences.split(',').map(s => s.trim()) : [],
        projectPath,
        autoValidateAfterAI,
        autoCommitAfterAI,
      };
      const embeddingPayload = embedModel && embedBaseUrl
        ? {
            apiKey: embedUseSameApiKey ? apiKey : embedApiKey,
            baseUrl: embedBaseUrl,
            model: embedModel,
          }
        : null;

      const response = await axios.post('/api/nim/config', config);

      if (response.data.success) {
        // Configure client-side service directly (server instance is configured via the API)
        nvidiaNimService.setConfig({
          apiKey,
          baseUrl,
          model,
          temperature,
          topP,
          topK,
          maxTokens,
          contextTokens,
          presencePenalty,
          frequencyPenalty,
          stopSequences: stopSequences ? stopSequences.split(',').map(s => s.trim()) : [],
        });

        // Update store
        setProjectPath(projectPath);
        setStoreAutoValidateAfterAI(autoValidateAfterAI);
        setStoreAutoCommitAfterAI(autoCommitAfterAI);
        setEmbeddingConfig(embeddingPayload);

        if (projectPath.trim()) {
          try {
            await axios.post('/api/workspace/trust', {
              projectPath: projectPath.trim(),
              confirm: true,
            });
          } catch (trustError: any) {
            const trustReason = trustError?.response?.data?.reason;
            if (
              trustReason === 'outside_trusted_roots' ||
              trustReason === 'untrusted_absolute_path' ||
              trustReason === 'trusted_root_must_be_absolute'
            ) {
              setMessage(UNTRUSTED_PATH_MESSAGE);
              return;
            }

            setMessage(trustError?.response?.data?.error || 'Не удалось добавить путь в доверенные');
            return;
          }
        }

        // Save settings to localStorage with active preset
        const settingsToSave = {
          version: SETTINGS_VERSION,
          ...config,
          activePresetId: activePreset?.id || null,
          generalPrompt,
          embedUseSameApiKey,
          embedApiKey,
          embedBaseUrl,
          embedModel,
          autoValidateAfterAI,
          autoCommitAfterAI,
          embeddingConfig: embeddingPayload,
        };
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsToSave));
        window.dispatchEvent(new CustomEvent('settings-saved'));
        setMessage('AI configured successfully!');
        setShowSavedIndicator(true);
        setTimeout(() => setShowSavedIndicator(false), 2500);
        setTimeout(() => {
          handleClose();
          setMessage('');
        }, 2000);
      }
    } catch (error: any) {
      const reason = error?.response?.data?.reason;
      if (reason === 'outside_trusted_roots' || reason === 'untrusted_absolute_path') {
        setMessage(UNTRUSTED_PATH_MESSAGE);
        return;
      }
      setMessage(error.response?.data?.error || 'Failed to configure AI service');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrustPath = async () => {
    if (!projectPath.trim()) {
      setMessage('Укажите путь проекта перед подтверждением доверия');
      return;
    }

    setIsTrustingPath(true);
    try {
      await axios.post('/api/workspace/trust', {
        projectPath: projectPath.trim(),
        confirm: true,
      });
      setMessage('Путь добавлен в доверенные');
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'Не удалось добавить путь в доверенные');
    } finally {
      setIsTrustingPath(false);
    }
  };

  return (
    <>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-neutral-800 shadow-xl light:bg-white">
            <div className="flex items-center justify-between border-b border-neutral-700 p-4 light:border-neutral-300">
              <h3 className="text-lg font-semibold text-neutral-200 light:text-neutral-900">
                AI Configuration Settings
              </h3>
              <button
                onClick={handleClose}
                className="rounded p-2 transition-colors hover:bg-neutral-700 light:hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-6 max-h-[calc(90vh-80px)] overflow-y-auto">
              {/* Quick Actions */}
              <div className="border-b border-neutral-600 pb-4 light:border-neutral-300">
                <h4 className="mb-3 text-md font-medium text-neutral-200 light:text-neutral-900">Quick Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleResetLayout}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded text-sm transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset Workspace Layout
                  </button>
                  <button
                    type="button"
                    onClick={resetSettingsToDefault}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-700/80 hover:bg-rose-600 rounded text-sm transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Сбросить настройки
                  </button>
                  <button
                    type="button"
                    onClick={handleExportSettings}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-700/80 hover:bg-blue-600 rounded text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Экспорт настроек
                  </button>
                  <label className="flex cursor-pointer items-center gap-2 px-4 py-2 bg-emerald-700/80 hover:bg-emerald-600 rounded text-sm transition-colors">
                    <Upload className="w-4 h-4" />
                    Импорт настроек
                    <input
                      type="file"
                      accept="application/json"
                      onChange={handleImportSettings}
                      className="hidden"
                    />
                  </label>
                </div>
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-neutral-300 light:text-neutral-700">
                  <input
                    type="checkbox"
                    checked={autoValidateAfterAI}
                    onChange={e => setAutoValidateAfterAI(e.target.checked)}
                    className="rounded"
                  />
                  Auto-validate (tsc) after AI writes files
                </label>
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-neutral-300 light:text-neutral-700">
                  <input
                    type="checkbox"
                    checked={autoCommitAfterAI}
                    onChange={e => setAutoCommitAfterAI(e.target.checked)}
                    className="rounded"
                  />
                  Auto-commit after AI writes files
                </label>
                <p className="mt-2 text-xs text-neutral-500 light:text-neutral-600">Restore default panel sizes and layout</p>
              </div>

              {/* API Configuration Section */}
              <div>
                <h4 className="mb-3 border-b border-neutral-600 pb-2 text-md font-medium text-neutral-200 light:border-neutral-300 light:text-neutral-900">
                  API Configuration
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Your Nvidia NIM API key"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Base URL
                    </label>
                    <input
                      type="url"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://api.nvidia.com/v1"
                      required
                    />
                    <div className="text-xs text-neutral-400 mt-1">
                      Обычно https://api.nvidia.com/v1 или http://localhost:8000/v1
                    </div>
                  </div>

                   <div className="md:col-span-2">
                     <label className="block text-sm font-medium text-neutral-300 mb-1">
                       Model
                     </label>
                     <div className="flex gap-2">
                       <select
                         value={model}
                         onChange={(e) => setModel(e.target.value)}
                         className="flex-1 px-3 py-2 bg-neutral-700 border border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                         onClick={loadAvailableModels}
                         disabled={isLoadingModels || !apiKey || !baseUrl}
                         className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-600 rounded text-sm font-medium transition-colors flex items-center gap-1"
                       >
                         {isLoadingModels ? (
                           <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                         ) : (
                           'Load Models'
                         )}
                       </button>
                     </div>
                     {availableModels.length === 0 && !isLoadingModels && (
                        <div className="text-xs text-neutral-400 mt-1">
                          Click &quot;Load Models&quot; to fetch available models from your API
                        </div>
                     )}
                   </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Project Directory
                    </label>
                    <input
                      type="text"
                      value={projectPath}
                      onChange={(e) => setProjectPathLocal(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="/path/to/your/project"
                    />
                    <div className="text-xs text-neutral-400 mt-1">Path to your local project directory for file operations</div>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={handleTrustPath}
                        disabled={isTrustingPath || !projectPath.trim()}
                        className="px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-neutral-600 rounded text-xs font-medium transition-colors"
                      >
                        {isTrustingPath ? 'Подтверждаем доверие...' : 'Доверять этому пути'}
                      </button>
                    </div>
                  </div>
               </div>
               </div>

              {/* Embedding Model Section */}
              <div className="border-b border-neutral-600 pb-4">
                <h4 className="text-md font-medium text-neutral-200 mb-3 light:text-neutral-900">Embedding Model</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 text-sm text-neutral-300 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={embedUseSameApiKey}
                      onChange={(e) => setEmbedUseSameApiKey(e.target.checked)}
                      className="rounded border-neutral-600 bg-neutral-700"
                    />
                    Use same API key
                  </label>

                  {!embedUseSameApiKey && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-1">
                        Embed API Key
                      </label>
                      <input
                        type="password"
                        value={embedApiKey}
                        onChange={(e) => setEmbedApiKey(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Embedding API key"
                      />
                    </div>
                  )}

                  <div className={!embedUseSameApiKey ? '' : 'md:col-span-1'}>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Embed Base URL
                    </label>
                    <input
                      type="url"
                      value={embedBaseUrl}
                      onChange={(e) => setEmbedBaseUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://api.nvidia.com/v1"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Embed Model
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={embedModel}
                        onChange={(e) => setEmbedModel(e.target.value)}
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
                        onClick={loadEmbedModels}
                        disabled={isLoadingEmbedModels || !(embedUseSameApiKey ? apiKey : embedApiKey) || !embedBaseUrl}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-600 rounded text-sm font-medium transition-colors"
                      >
                        {isLoadingEmbedModels ? 'Loading…' : 'Load Embed Models'}
                      </button>
                      <button
                        type="button"
                        onClick={testEmbedding}
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

                  <div className="md:col-span-2 rounded border border-neutral-700 bg-neutral-900/60 p-3 text-xs text-neutral-300 light:border-neutral-300 light:bg-neutral-100 light:text-neutral-700">
                    <div>
                      Indexing status:{' '}
                      {isIndexingProject
                        ? 'Indexing…'
                        : projectChunks.length > 0
                          ? isIndexStale
                            ? <span className="text-yellow-400 dark:text-yellow-400 light:text-yellow-600">⚠ Index is stale — re-index recommended</span>
                            : `Ready (${projectChunks.length} chunks)`
                          : 'Not indexed'}
                    </div>
                    {indexedAt && <div className="text-neutral-400 mt-1">Last indexed: {indexedAt.toLocaleString()}</div>}
                    <button
                      type="button"
                      onClick={() => void indexProjectForEmbedding()}
                      disabled={isIndexingProject || !embeddingConfig}
                      className="mt-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-neutral-600 rounded text-xs font-medium transition-colors"
                    >
                      {isIndexingProject ? 'Re-indexing…' : 'Re-index Project'}
                    </button>
                  </div>
                </div>
              </div>

               {/* Connection Testing Section */}
               <div className="border-b border-neutral-600 pb-4">
                 <h4 className="text-md font-medium text-neutral-200 mb-3 light:text-neutral-900">
                   Connection & Testing
                 </h4>
                 <div className="flex gap-3 flex-wrap">
                   <button
                     type="button"
                     onClick={testConnection}
                     disabled={!apiKey || !baseUrl || !model || connectionStatus === 'connecting'}
                     className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                       connectionStatus === 'connected'
                         ? 'bg-green-600 hover:bg-green-700'
                         : connectionStatus === 'error'
                         ? 'bg-red-600 hover:bg-red-700'
                         : 'bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-600'
                     }`}
                   >
                     {connectionStatus === 'connecting' ? (
                       <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                     ) : connectionStatus === 'connected' ? (
                       <Check className="w-4 h-4" />
                     ) : connectionStatus === 'error' ? (
                       <X className="w-4 h-4" />
                     ) : (
                       'Test Connection'
                     )}
                   </button>

                   <button
                     type="button"
                     onClick={sendTestMessage}
                     disabled={!apiKey || !baseUrl || !model || testMessageStatus === 'sending'}
                     className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                       testMessageStatus === 'success'
                         ? 'bg-green-600 hover:bg-green-700'
                         : testMessageStatus === 'error'
                         ? 'bg-red-600 hover:bg-red-700'
                         : 'bg-purple-600 hover:bg-purple-700 disabled:bg-neutral-600'
                     }`}
                   >
                     {testMessageStatus === 'sending' ? (
                       <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                     ) : testMessageStatus === 'success' ? (
                       <Check className="w-4 h-4" />
                     ) : testMessageStatus === 'error' ? (
                       <X className="w-4 h-4" />
                     ) : (
                       'Send Test Message'
                     )}
                   </button>
                 </div>
                 <div className="text-xs text-neutral-400 mt-2">
                   Test your API connection and send a simple test message to verify everything works
                 </div>
                 {(connectionStatus === 'connecting' || testMessageStatus === 'sending') && (
                   <div className="text-xs text-amber-300 mt-2">
                     Timeout: 15 seconds
                   </div>
                 )}
                 {message && (
                   <div className="mt-2 rounded border border-neutral-600 bg-neutral-700/60 px-3 py-2 text-sm text-neutral-200 light:border-neutral-300 light:bg-neutral-100 light:text-neutral-800">
                     {message}
                   </div>
                 )}
               </div>

               {/* Generation Parameters Section */}
              <div>
                <h4 className="mb-3 border-b border-neutral-600 pb-2 text-md font-medium text-neutral-200 light:border-neutral-300 light:text-neutral-900">
                  Generation Parameters
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      <span className="inline-flex items-center gap-1">
                        Temperature
                        <Info className="w-3.5 h-3.5 text-neutral-500" title="Управляет креативностью: ниже — стабильнее, выше — разнообразнее." />
                      </span>
                    </label>
                    <input
                      type="number"
                      value={temperature}
                      onChange={(e) => handleFloatFieldChange(e.target.value, setTemperature)}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.7"
                    />
                    <div className="text-xs text-neutral-400 mt-1">Manual input with no UI limits</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      <span className="inline-flex items-center gap-1">
                        Top-p
                        <Info className="w-3.5 h-3.5 text-neutral-500" title="Nucleus sampling: ограничивает выбор токенов по суммарной вероятности." />
                      </span>
                    </label>
                    <input
                      type="number"
                      value={topP}
                      onChange={(e) => handleFloatFieldChange(e.target.value, setTopP)}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1"
                    />
                    <div className="text-xs text-neutral-400 mt-1">Manual input with no UI limits</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      <span className="inline-flex items-center gap-1">
                        Top-k
                        <Info className="w-3.5 h-3.5 text-neutral-500" title="Разрешает выбор только из K самых вероятных токенов." />
                      </span>
                    </label>
                    <input
                      type="number"
                      value={topK}
                      onChange={(e) => handleIntegerFieldChange(e.target.value, setTopK)}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="50"
                    />
                    <div className="text-xs text-neutral-400 mt-1">Manual integer input with no UI limits</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      <span className="inline-flex items-center gap-1">
                        Frequency penalty
                        <Info className="w-3.5 h-3.5 text-neutral-500" title="Снижает повторения уже часто встречавшихся токенов." />
                      </span>
                    </label>
                    <input
                      type="number"
                      value={frequencyPenalty}
                      onChange={(e) => handleFloatFieldChange(e.target.value, setFrequencyPenalty)}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                    <div className="text-xs text-neutral-400 mt-1">Manual input with no UI limits</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      <span className="inline-flex items-center gap-1">
                        Presence penalty
                        <Info className="w-3.5 h-3.5 text-neutral-500" title="Поощряет появление новых тем, штрафуя уже встреченные токены." />
                      </span>
                    </label>
                    <input
                      type="number"
                      value={presencePenalty}
                      onChange={(e) => handleFloatFieldChange(e.target.value, setPresencePenalty)}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                    <div className="text-xs text-neutral-400 mt-1">Manual input with no UI limits</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      <span className="inline-flex items-center gap-1">
                        Context Tokens ({contextTokens === 0 ? 'Unlimited' : contextTokens.toLocaleString()})
                        <Info className="w-3.5 h-3.5 text-neutral-500" title="Ограничение размера входного контекста; 0 означает без лимита." />
                      </span>
                    </label>
                    <input
                      type="number"
                      value={contextTokens}
                      onChange={(e) => handleContextTokensChange(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0 for unlimited"
                    />
                    <div className="text-xs text-neutral-400 mt-1">Use 0 for Unlimited. Manual integer input with no UI limits.</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      <span className="inline-flex items-center gap-1">
                        Max Response Tokens ({maxTokens.toLocaleString()})
                        <Info className="w-3.5 h-3.5 text-neutral-500" title="Максимальная длина ответа модели в токенах." />
                      </span>
                    </label>
                    <input
                      type="number"
                      value={maxTokens}
                      onChange={(e) => handleMaxTokensChange(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="4000"
                    />
                    <div className="text-xs text-neutral-400 mt-1">Manual integer input with no UI limits</div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      <span className="inline-flex items-center gap-1">
                        Stop Sequences
                        <Info className="w-3.5 h-3.5 text-neutral-500" title="Последовательности, при появлении которых генерация будет остановлена." />
                      </span>
                    </label>
                    <input
                      type="text"
                      value={stopSequences}
                      onChange={(e) => setStopSequences(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Comma-separated stop sequences"
                    />
                    <div className="text-xs text-neutral-400 mt-1">Sequences where generation should stop (comma-separated)</div>
                  </div>
                </div>
              </div>

              {/* General Prompt Section */}
              <div>
                <h4 className="mb-3 border-b border-neutral-600 pb-2 text-md font-medium text-neutral-200 light:border-neutral-300 light:text-neutral-900">
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
                        onChange={(e) => setGeneralPromptText(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={12}
                        placeholder="Enter general system prompt..."
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={handleSaveGeneralPrompt}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelGeneralPromptEdit}
                          className="px-3 py-1 bg-neutral-600 hover:bg-neutral-700 rounded text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="p-3 bg-neutral-800 rounded border border-neutral-600 max-h-48 overflow-y-auto">
                        <pre className="text-xs text-neutral-300 whitespace-pre-wrap">
                          {generalPrompt}
                        </pre>
                      </div>
                      <button
                        type="button"
                        onClick={handleEditGeneralPrompt}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      >
                        Edit General Prompt
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Prompt Presets Section */}
              <div>
                <h4 className="mb-3 border-b border-neutral-600 pb-2 text-md font-medium text-neutral-200 light:border-neutral-300 light:text-neutral-900">
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
                      onClick={() => !editingPreset && setActivePreset(preset)}
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
                          <h5 className="mb-1 font-medium text-neutral-200 light:text-neutral-900">{preset.name}</h5>
                          <p className="text-sm text-neutral-400 mb-2">{preset.description}</p>

                          {editingPreset === preset.id ? (
                            <div className="space-y-3">
                              <textarea
                                value={editedPrompt}
                                onChange={(e) => setEditedPrompt(e.target.value)}
                                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={8}
                                placeholder="Enter system prompt..."
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={handleSavePreset}
                                  className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
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
                                <div className="mt-2 p-3 bg-neutral-800 rounded text-neutral-300 whitespace-pre-wrap">
                                  {preset.systemPrompt}
                                </div>
                              </details>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditPreset(preset.id);
                                }}
                                className="mt-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
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
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
                      <Check className="w-4 h-4" />
                      Active preset: <strong>{activePreset.name}</strong>
                    </div>
                  </div>
                )}
              </div>

              {message && (
                <div className={`text-sm ${message.includes('successfully') ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {message}
                </div>
              )}
              {showSavedIndicator && (
                <div className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded px-3 py-2">
                  Настройки сохранены.
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-600 disabled:cursor-not-allowed rounded transition-colors"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
