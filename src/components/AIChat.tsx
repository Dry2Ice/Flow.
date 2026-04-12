// src/components/AIChat.tsx

"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Copy, Check, MessageSquare, FileText, AlertCircle, Info, CheckCircle, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { LogEntry } from '@/types';

export function AIChat() {
  const { messages, isGenerating, logs, addLog, addBug } = useAppStore();
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'logs'>('chat');
  const [newBugTitle, setNewBugTitle] = useState('');
  const [newBugDescription, setNewBugDescription] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const handleAddBug = () => {
    if (!newBugTitle.trim() || !newBugDescription.trim()) return;

    const bug = {
      id: crypto.randomUUID(),
      title: newBugTitle,
      description: newBugDescription,
      status: 'open' as const,
      severity: 'medium' as const,
      source: 'user_reported' as const,
      relatedFiles: [],
      relatedTasks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addBug(bug);
    setNewBugTitle('');
    setNewBugDescription('');
  };

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="h-full bg-neutral-800 flex flex-col">
      {/* Header with tabs */}
      <div className="border-b border-neutral-700">
        <div className="flex border-b border-neutral-700">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'chat'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
                : 'text-neutral-400 hover:text-neutral-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'logs'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
                : 'text-neutral-400 hover:text-neutral-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            Logs
          </button>
        </div>

        <div className="flex items-center justify-between p-3">
          <h3 className="text-sm font-medium text-neutral-200">
            {activeTab === 'chat' ? (
              <>AI Assistant</>
            ) : (
              <>System Logs</>
            )}
          </h3>
          <div className="text-xs text-neutral-500">
            {activeTab === 'chat' ? `${messages.length} messages` : `${logs.length} logs`}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'chat' ? (
          /* Chat Messages */
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-neutral-500 py-8">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Start a conversation with the AI assistant</p>
                <p className="text-xs mt-2">Ask questions, request code changes, or get help with your project</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.timestamp.getTime()}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-700 text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {message.role === 'user' ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                      <span className="text-xs opacity-70">
                        {message.role === 'user' ? 'You' : 'AI Assistant'}
                      </span>
                      <span className="text-xs opacity-50 ml-auto">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </div>

                    {message.changes && message.changes.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-neutral-600">
                        <div className="text-xs text-neutral-400 mb-2">Code Changes:</div>
                        <div className="space-y-1">
                          {message.changes.map((change, index) => (
                            <div key={index} className="text-xs bg-neutral-800 p-2 rounded">
                              <div className="font-medium text-green-400">{change.filePath}</div>
                              <div className="text-neutral-300 mt-1">
                                {change.newContent.length > 100
                                  ? `${change.newContent.substring(0, 100)}...`
                                  : change.newContent}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {message.role === 'assistant' && (
                      <button
                        onClick={() => copyToClipboard(message.content, message.timestamp.getTime().toString())}
                        className="mt-2 flex items-center gap-1 text-xs opacity-70 hover:opacity-100 transition-opacity"
                      >
                        {copiedMessageId === message.timestamp.getTime().toString() ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}

            {isGenerating && (
              <div className="flex justify-start">
                <div className="bg-neutral-700 rounded-lg p-3 max-w-[80%]">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4" />
                    <span className="text-xs text-neutral-400">AI Assistant</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="text-sm text-neutral-300">Thinking</div>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        ) : (
          /* Logs */
          <div className="space-y-3">
            {/* Add Bug Form */}
            <div className="border border-neutral-600 rounded-lg p-3">
              <h4 className="text-sm font-medium text-neutral-200 mb-3">Report New Bug</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newBugTitle}
                  onChange={(e) => setNewBugTitle(e.target.value)}
                  placeholder="Bug title..."
                  className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={newBugDescription}
                  onChange={(e) => setNewBugDescription(e.target.value)}
                  placeholder="Bug description..."
                  rows={3}
                  className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddBug}
                  disabled={!newBugTitle.trim() || !newBugDescription.trim()}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-neutral-600 rounded text-sm transition-colors"
                >
                  Report Bug
                </button>
              </div>
            </div>

            {/* Logs List */}
            <div className="space-y-2">
              {logs.length === 0 ? (
                <div className="text-center text-neutral-500 py-8">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No logs yet</p>
                  <p className="text-xs mt-2">Logs will appear here during AI operations</p>
                </div>
              ) : (
                logs.slice().reverse().map((log) => (
                  <div key={log.id} className="p-3 bg-neutral-700 rounded border border-neutral-600">
                    <div className="flex items-start gap-3">
                      {getLogIcon(log.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-medium ${
                            log.type === 'error' ? 'text-red-400' :
                            log.type === 'warning' ? 'text-yellow-400' :
                            log.type === 'success' ? 'text-green-400' : 'text-blue-400'
                          }`}>
                            {log.type.toUpperCase()}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-200 mb-1">{log.message}</p>
                        {log.details && (
                          <p className="text-xs text-neutral-400">{log.details}</p>
                        )}
                        {log.source && (
                          <span className="text-xs bg-neutral-600 px-2 py-0.5 rounded mt-1 inline-block">
                            {log.source}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}