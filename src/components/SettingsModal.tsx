// src/components/SettingsModal.tsx

"use client";

import { useState, useEffect } from 'react';
import { X, Settings, Check, RotateCcw } from 'lucide-react';
import axios from 'axios';
import { useAppStore } from '@/lib/store';

interface SettingsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function SettingsModal({ isOpen: externalIsOpen, onClose: externalOnClose }: SettingsModalProps = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  // Use external state if provided, otherwise use internal
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const handleClose = () => {
    if (externalOnClose) {
      externalOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const loadAvailableModels = async () => {
    if (!apiKey || !baseUrl) {
      alert('Please enter API Key and Base URL first');
      return;
    }

    setIsLoadingModels(true);
    try {
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const models = data.data?.map((model: any) => model.id) || [];
        setAvailableModels(models);
      } else {
        alert('Failed to load models. Please check your API credentials.');
      }
    } catch (error) {
      console.error('Error loading models:', error);
      alert('Error loading models. Please try again.');
    } finally {
      setIsLoadingModels(false);
    }
  };

  const testConnection = async () => {
    if (!apiKey || !baseUrl || !model) {
      alert('Please fill in API Key, Base URL, and Model');
      return;
    }

    setConnectionStatus('connecting');
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10,
        }),
      });

      if (response.ok) {
        setConnectionStatus('connected');
        setTimeout(() => setConnectionStatus('idle'), 3000);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
      setTimeout(() => setConnectionStatus('idle'), 3000);
      alert('Connection failed. Please check your settings.');
    }
  };

  const sendTestMessage = async () => {
    if (!apiKey || !baseUrl || !model) {
      alert('Please fill in API Key, Base URL, and Model');
      return;
    }

    setTestMessageStatus('sending');
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Say "Hello from Flow!" and nothing else.' }],
          max_tokens: 50,
          temperature: 0.1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) {
          setTestMessageStatus('success');
          alert(`Test successful! AI replied: "${reply}"`);
        } else {
          throw new Error('No response content');
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Test message failed:', error);
      setTestMessageStatus('error');
      alert('Test message failed. Please check your settings.');
    } finally {
      setTimeout(() => setTestMessageStatus('idle'), 3000);
    }
  };
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

  // Model management
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [testMessageStatus, setTestMessageStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [projectPath, setProjectPathLocal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
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
    generalPrompt,
    setGeneralPrompt,
  } = useAppStore();

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('nim-settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setApiKey(settings.apiKey || '');
        setBaseUrl(settings.baseUrl || '');
        setModel(settings.model || '');
        setTemperature(settings.temperature ?? 0.7);
        setTopP(settings.topP ?? 1.0);
        setTopK(settings.topK ?? 50);
        setMaxTokens(settings.maxTokens ?? 4000);
        setContextTokens(settings.contextTokens ?? 0);
        setPresencePenalty(settings.presencePenalty ?? 0.0);
        setFrequencyPenalty(settings.frequencyPenalty ?? 0.0);
        setStopSequences(settings.stopSequences?.join(', ') || '');
        setProjectPath(settings.projectPath || '');
        if (settings.generalPrompt) {
          setGeneralPrompt(settings.generalPrompt);
        }

        // Load active preset
        if (settings.activePresetId) {
          const preset = promptPresets.find(p => p.id === settings.activePresetId);
          if (preset) {
            setActivePreset(preset);
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, []);

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
    const defaultSizes = {
      sidebar: 20,
      centerVertical: 60,
      rightVertical: 50,
      rightPanel: 25,
    };
    useAppStore.setState({ panelSizes: defaultSizes });
    localStorage.setItem('workspace-layout', JSON.stringify(defaultSizes));
    setMessage('Workspace layout reset to default!');
    setTimeout(() => setMessage(''), 2000);
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
      };

      const response = await axios.post('/api/nim/config', config);

      if (response.data.success) {
        // Update store
        setProjectPath(projectPath);

        // Save settings to localStorage with active preset
        const settingsToSave = {
          ...config,
          activePresetId: activePreset?.id || null,
          generalPrompt
        };
        localStorage.setItem('nim-settings', JSON.stringify(settingsToSave));
        setMessage('AI configured successfully!');
        setTimeout(() => {
          handleClose();
          setMessage('');
        }, 2000);
      }
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to configure AI service');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-neutral-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-neutral-700">
              <h3 className="text-lg font-semibold text-neutral-200">
                AI Configuration Settings
              </h3>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-neutral-700 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-6 max-h-[calc(90vh-80px)] overflow-y-auto">
              {/* Quick Actions */}
              <div className="border-b border-neutral-600 pb-4">
                <h4 className="text-md font-medium text-neutral-200 mb-3">Quick Actions</h4>
                <button
                  type="button"
                  onClick={handleResetLayout}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded text-sm transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset Workspace Layout
                </button>
                <p className="text-xs text-neutral-500 mt-2">Restore default panel sizes and layout</p>
              </div>

              {/* API Configuration Section */}
              <div>
                <h4 className="text-md font-medium text-neutral-200 mb-3 border-b border-neutral-600 pb-2">
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
                           'Load'
                         )}
                       </button>
                     </div>
                     {availableModels.length === 0 && !isLoadingModels && (
                        <div className="text-xs text-neutral-400 mt-1">
                          Click &quot;Load&quot; to fetch available models from your API
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
                  </div>
                </div>
               </div>

               {/* Connection Testing Section */}
               <div className="border-b border-neutral-600 pb-4">
                 <h4 className="text-md font-medium text-neutral-200 mb-3">
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
               </div>

               {/* Generation Parameters Section */}
              <div>
                <h4 className="text-md font-medium text-neutral-200 mb-3 border-b border-neutral-600 pb-2">
                  Generation Parameters
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Temperature ({temperature.toFixed(1)})
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-xs text-neutral-400 mt-1">Controls randomness (0 = deterministic, 2 = very random)</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Top P ({topP.toFixed(2)})
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={topP}
                      onChange={(e) => setTopP(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-xs text-neutral-400 mt-1">Nucleus sampling (0.1 = very focused, 1.0 = diverse)</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Top K ({topK})
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={topK}
                      onChange={(e) => setTopK(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-xs text-neutral-400 mt-1">Top-K sampling (1-100)</div>
                  </div>

                   <div>
                     <label className="block text-sm font-medium text-neutral-300 mb-1">
                       Context Tokens ({contextTokens === 0 ? 'Unlimited' : contextTokens.toLocaleString()})
                     </label>
                     <input
                       type="number"
                       value={contextTokens}
                       onChange={(e) => handleContextTokensChange(e.target.value)}
                       className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                       placeholder="0 for unlimited"
                     />
                     <div className="text-xs text-neutral-400 mt-1">Allowed values: 0 (unlimited) or any integer ≥ 1</div>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-neutral-300 mb-1">
                       Max Response Tokens ({maxTokens.toLocaleString()})
                     </label>
                     <input
                       type="number"
                       value={maxTokens}
                       onChange={(e) => handleMaxTokensChange(e.target.value)}
                       className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                       placeholder="4000"
                     />
                     <div className="text-xs text-neutral-400 mt-1">Maximum response tokens</div>
                   </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Presence Penalty ({presencePenalty.toFixed(1)})
                    </label>
                    <input
                      type="range"
                      min="-2"
                      max="2"
                      step="0.1"
                      value={presencePenalty}
                      onChange={(e) => setPresencePenalty(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-xs text-neutral-400 mt-1">Penalize new topics (-2 to 2)</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Frequency Penalty ({frequencyPenalty.toFixed(1)})
                    </label>
                    <input
                      type="range"
                      min="-2"
                      max="2"
                      step="0.1"
                      value={frequencyPenalty}
                      onChange={(e) => setFrequencyPenalty(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-xs text-neutral-400 mt-1">Penalize token repetition (-2 to 2)</div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Stop Sequences
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
                <h4 className="text-md font-medium text-neutral-200 mb-3 border-b border-neutral-600 pb-2">
                  General System Prompt
                </h4>
                <p className="text-sm text-neutral-400 mb-3">
                  Core principles and guidelines that are always applied to all AI interactions, regardless of the selected preset.
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
                          onClick={handleSaveGeneralPrompt}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                        >
                          Save
                        </button>
                        <button
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
                        onClick={handleEditGeneralPrompt}
                        className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Edit General Prompt
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Prompt Presets Section */}
              <div>
                <h4 className="text-md font-medium text-neutral-200 mb-3 border-b border-neutral-600 pb-2">
                  AI Behavior Presets
                </h4>
                <div className="space-y-3">
                  {promptPresets.map((preset) => (
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
                          <h5 className="font-medium text-neutral-200 mb-1">{preset.name}</h5>
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
                                  onClick={handleSavePreset}
                                  className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                                >
                                  Save
                                </button>
                                <button
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditPreset(preset.id);
                                }}
                                className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
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
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <Check className="w-4 h-4" />
                      Active preset: <strong>{activePreset.name}</strong>
                    </div>
                  </div>
                )}
              </div>

              {message && (
                <div className={`text-sm ${message.includes('successfully') ? 'text-green-400' : 'text-red-400'}`}>
                  {message}
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
