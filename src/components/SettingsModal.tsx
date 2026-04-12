// src/components/SettingsModal.tsx

"use client";

import { useState, useEffect } from 'react';
import { X, Settings } from 'lucide-react';
import axios from 'axios';

export function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(1.0);
  const [topK, setTopK] = useState(50);
  const [maxTokens, setMaxTokens] = useState(4000);
  const [presencePenalty, setPresencePenalty] = useState(0.0);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0.0);
  const [stopSequences, setStopSequences] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

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
        setPresencePenalty(settings.presencePenalty ?? 0.0);
        setFrequencyPenalty(settings.frequencyPenalty ?? 0.0);
        setStopSequences(settings.stopSequences?.join(', ') || '');
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, []);

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
        presencePenalty,
        frequencyPenalty,
        stopSequences: stopSequences ? stopSequences.split(',').map(s => s.trim()) : [],
      };

      const response = await axios.post('/api/nim/config', config);

      if (response.data.success) {
        // Save settings to localStorage
        localStorage.setItem('nim-settings', JSON.stringify(config));
        setMessage('AI configured successfully!');
        setTimeout(() => {
          setIsOpen(false);
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
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 p-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors z-10"
        title="AI Settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-neutral-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-neutral-700">
              <h3 className="text-lg font-semibold text-neutral-200">
                AI Configuration Settings
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-neutral-700 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-6 max-h-[calc(90vh-80px)] overflow-y-auto">
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
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="meta/llama3-70b-instruct"
                      required
                    />
                  </div>
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
                      Max Tokens ({maxTokens})
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="8000"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-xs text-neutral-400 mt-1">Maximum response length</div>
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

              {message && (
                <div className={`text-sm ${message.includes('successfully') ? 'text-green-400' : 'text-red-400'}`}>
                  {message}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
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