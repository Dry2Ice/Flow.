// src/components/AIChat.tsx

"use client";

import { useState, useRef, useEffect } from 'react';
import { Bot, User, Copy, Check, MessageSquare, FileText, AlertCircle, Info, CheckCircle, Plus, Trash2, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAppStore } from '@/lib/store';
import { LogEntry } from '@/types';

export function AIChat() {
  const {
    sessions,
    activeSessionId,
    setActiveSession,
    createSession,
    logs,
  } = useAppStore();
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'logs'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeSession = sessions[activeSessionId] ?? { messages: [], isGenerating: false };
  const messages = activeSession.messages;
  const isGenerating = activeSession.isGenerating;
  const connectionStatus = activeSession.connectionStatus;
  const reconnectDelay = activeSession.reconnectDelay;
  const sessionLogs = logs.filter((log) => !log.sessionId || log.sessionId === activeSessionId);
  const aiActionLogs = sessionLogs.filter((log) => log.source === 'ai_execution' || log.source === 'user_action');
  const errorLogs = sessionLogs.filter((log) => log.type === 'error');
  const fileChangeItems = messages
    .filter((message) => message.role === 'assistant' && message.changes && message.changes.length > 0)
    .flatMap((message) =>
      message.changes!.map((change, index) => ({
        id: `${message.id}-${index}`,
        timestamp: message.timestamp,
        filePath: change.filePath,
        description: change.description || 'File updated by AI',
      }))
    );
  const lastAssistantMessageId = [...messages].reverse().find((message) => message.role === 'assistant')?.id;
  const visibleMessages = messages.filter((message, index) => {
    // Remove empty assistant messages that are not the last message in the session
    // (the last one may still be actively streaming)
    if (
      message.role === 'assistant' &&
      message.content.trim() === '' &&
      index < messages.length - 1
    ) {
      return false;
    }
    return true;
  });

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

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleClearChat = () => {
    useAppStore.setState((state) => {
      const session = state.sessions[activeSessionId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [activeSessionId]: {
            ...session,
            messages: [],
          },
        },
      };
    });
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    const markdown = [
      `# AI Chat Export`,
      ``,
      `Session: ${activeSessionId}`,
      `Exported: ${new Date().toISOString()}`,
      ``,
      ...messages.map((message) => `## ${message.role === 'user' ? 'User' : 'Assistant'} (${message.timestamp.toLocaleString()})\n\n${message.content}`),
    ].join('\n');

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flow-chat-${activeSessionId.slice(0, 8)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col bg-neutral-950/30">
      {/* Header with tabs */}
      <div className="border-b border-neutral-800">
        <div className="flex border-b border-neutral-800">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 px-2 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
              activeTab === 'chat'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
                : 'text-neutral-400 hover:text-neutral-300'
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            Chat
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 px-2 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
              activeTab === 'logs'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
                : 'text-neutral-400 hover:text-neutral-300'
            }`}
          >
            <FileText className="w-3 h-3" />
            Logs
          </button>
        </div>

        <div className="flex items-center justify-between px-3 py-2.5">
          <h3 className="text-sm font-medium text-neutral-200">
            {activeTab === 'chat' ? (
              <>AI Assistant</>
            ) : (
              <>System Logs</>
            )}
          </h3>
          <div className="text-xs text-neutral-500">
            {activeTab === 'chat' ? `${messages.length} messages` : `${sessionLogs.length} logs`}
          </div>
        </div>
        <div className="flex items-center gap-2 px-2 pb-2">
          <select
            value={activeSessionId}
            onChange={(e) => setActiveSession(e.target.value)}
            className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {Object.keys(sessions).map((sessionId) => (
              <option key={sessionId} value={sessionId}>
                Session: {sessionId.slice(0, 8)}
              </option>
            ))}
          </select>

          {/* Connection status indicator */}
          <div className="flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs">
            {connectionStatus === 'connected' && (
              <>
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 dark:text-emerald-400 light:text-emerald-700">Connected</span>
              </>
            )}
            {connectionStatus === 'reconnecting' && (
              <>
                <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-400">Reconnecting{reconnectDelay ? ` (${(reconnectDelay / 1000).toFixed(0)}s)` : ''}</span>
              </>
            )}
            {connectionStatus === 'failed' && (
              <>
                <div className="h-2 w-2 rounded-full bg-red-400" />
                <span className="text-red-400 dark:text-red-400 light:text-red-700">Connection Failed</span>
              </>
            )}
            {!connectionStatus && (
              <>
                <div className="h-2 w-2 rounded-full bg-neutral-500" />
                <span className="text-neutral-500">Idle</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => createSession()}
            className="flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs hover:border-neutral-500"
            title="New Session"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleExportChat}
            disabled={messages.length === 0}
            className="flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            title="Export chat as markdown"
          >
            <Download className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleClearChat}
            disabled={messages.length === 0}
            className="flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 dark:border-red-800/80 dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-900/50 disabled:cursor-not-allowed disabled:opacity-50"
            title="Clear chat"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'chat' ? (
          /* Chat Messages */
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-neutral-500 py-8">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Start a conversation with the AI assistant</p>
                <p className="text-xs mt-2">Ask questions, request code changes, or get help with your project</p>
              </div>
            ) : (
              visibleMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-2 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-800 text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
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

                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ node, className, children, ...props }: any) {
                              const isBlock = className?.includes('language-');
                              return isBlock ? (
                                <pre className="overflow-x-auto rounded-lg bg-neutral-900 border border-neutral-700 p-3 my-2">
                                  <code className={`text-xs font-mono text-neutral-200 ${className ?? ''}`} {...props}>
                                    {children}
                                  </code>
                                </pre>
                              ) : (
                                <code className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs font-mono text-indigo-600 dark:text-blue-300" {...props}>
                                  {children}
                                </code>
                              );
                            },
                            p({ children }: any) {
                              return <p className="mb-2 last:mb-0">{children}</p>;
                            },
                            ul({ children }: any) {
                              return <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>;
                            },
                            ol({ children }: any) {
                              return <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>;
                            },
                            h1({ children }: any) { return <h1 className="mb-2 text-base font-semibold">{children}</h1>; },
                            h2({ children }: any) { return <h2 className="mb-1.5 text-sm font-semibold">{children}</h2>; },
                            h3({ children }: any) { return <h3 className="mb-1 text-sm font-medium">{children}</h3>; },
                            strong({ children }: any) { return <strong className="font-semibold">{children}</strong>; },
                            a({ href, children }: any) {
                              return <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 dark:text-blue-400 dark:hover:text-blue-300 underline">{children}</a>;
                            },
                            blockquote({ children }: any) {
                              return <blockquote className="border-l-2 border-neutral-600 pl-3 italic">{children}</blockquote>;
                            },
                          }}
                        >
                          {message.content}
                          {isGenerating && message.id === lastAssistantMessageId && (
                            <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-blue-300 align-middle" aria-hidden="true" />
                          )}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </div>
                    )}

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
                        onClick={() => copyToClipboard(message.content, message.id)}
                        className="mt-1 p-1 opacity-60 hover:opacity-100 transition-opacity rounded hover:bg-neutral-700"
                        title={copiedMessageId === message.id ? 'Copied!' : 'Copy message'}
                      >
                        {copiedMessageId === message.id ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-neutral-400" />
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
          <div className="space-y-4">
            {sessionLogs.length === 0 && fileChangeItems.length === 0 ? (
              <div className="text-center text-neutral-500 py-8">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No logs yet</p>
                <p className="text-xs mt-2">Logs will appear here during AI operations</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <h4 className="text-xs uppercase tracking-wide text-neutral-400">AI Actions</h4>
                  {aiActionLogs.length === 0 ? (
                    <p className="text-xs text-neutral-500">No AI actions captured in this session.</p>
                  ) : (
                    aiActionLogs.slice().reverse().map((log) => (
                      <div key={log.id} className="p-3 bg-neutral-700 rounded border border-neutral-600">
                        <div className="flex items-start gap-3">
                          {getLogIcon(log.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-blue-600 dark:text-blue-300">{log.source || 'ai_execution'}</span>
                              <span className="text-xs text-neutral-500">{log.timestamp.toLocaleTimeString()}</span>
                            </div>
                            <p className="text-sm">{log.message}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs uppercase tracking-wide text-neutral-400">File Changes</h4>
                  {fileChangeItems.length === 0 ? (
                    <p className="text-xs text-neutral-500">No AI file changes in this session.</p>
                  ) : (
                    fileChangeItems.slice().reverse().map((change) => (
                      <div key={change.id} className="p-3 bg-neutral-700 rounded border border-neutral-600">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-green-400">{change.filePath}</span>
                          <span className="text-xs text-neutral-500">{change.timestamp.toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs text-neutral-300">{change.description}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs uppercase tracking-wide text-neutral-400">Errors</h4>
                  {errorLogs.length === 0 ? (
                    <p className="text-xs text-neutral-500">No errors in this session.</p>
                  ) : (
                    errorLogs.slice().reverse().map((log) => (
                      <div key={log.id} className="p-3 bg-red-950/30 rounded border border-red-700/60">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-red-300">ERROR</span>
                              <span className="text-xs text-neutral-500">{log.timestamp.toLocaleTimeString()}</span>
                            </div>
                            <p className="text-sm">{log.message}</p>
                            {log.details && <p className="text-xs text-neutral-400 mt-1">{log.details}</p>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
