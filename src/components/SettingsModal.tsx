// src/components/SettingsModal.tsx

"use client";

import { useState } from 'react';
import { X, Settings } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import axios from 'axios';

export function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await axios.post('/api/nim/config', {
        apiKey,
        baseUrl,
        model,
      });

      if (response.data.success) {
        setMessage('Nvidia NIM configured successfully!');
        setTimeout(() => {
          setIsOpen(false);
          setMessage('');
        }, 2000);
      }
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to configure Nvidia NIM');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 p-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors z-10"
        title="Settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-neutral-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b border-neutral-700">
              <h3 className="text-lg font-semibold text-neutral-200">
                Nvidia NIM Settings
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-neutral-700 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
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

              <div>
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