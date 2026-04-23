// src/components/AIChat.tsx

"use client";

import { useState, useRef, useEffect } from 'react';
import { Bot, User, Copy, Check, MessageSquare, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAppStore } from '@/lib/store';

export function AIChat() {
  const {
    sessions,
    activeSessionId,
    setActiveSession,
    createSession,
  } = useAppStore();
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeSession = sessions[activeSessionId] ?? { messages: [], isGenerating: false };
  const messages = activeSession.messages;
  const isGenerating = activeSession.isGenerating;
  const connectionStatus = activeSession.connectionStatus;
  const reconnectDelay = activeSession.reconnectDelay;
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    <div className="flex h-full flex-col bg-background/80">
      {/* Header */}
      <div className="border-b border-border">
        <div className="flex items-center justify-between px-3 py-2.5">
          <h3 className="text-sm font-medium text-foreground">
            AI Assistant
          </h3>
          <div className="text-xs text-muted-foreground">
            {messages.length} messages
          </div>
        </div>
        <div className="flex items-center gap-2 px-2 pb-2">
          <select
            key={Object.keys(sessions).length} // Force re-render when sessions change
            value={activeSessionId}
            onChange={(e) => setActiveSession(e.target.value)}
            className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {Object.keys(sessions).map((sessionId) => (
              <option key={sessionId} value={sessionId}>
                Session: {sessionId.slice(0, 8)}
              </option>
            ))}
          </select>

          {/* Connection status indicator */}
          <div className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs">
            {connectionStatus === 'connected' && (
              <>
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400">Connected</span>
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
                <span className="text-red-400">Connection Failed</span>
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
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Chat Messages */}
        <div className="space-y-3">
            {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Start a conversation with the AI assistant</p>
            <p className="text-xs mt-2">Ask questions, request code changes, or get help with your project</p>
          </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
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
                      <div className="prose prose-sm prose-invert max-w-none text-sm">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ node, className, children, ...props }: any) {
                              const isBlock = className?.includes('language-');
                              return isBlock ? (
                                <pre className="overflow-x-auto rounded-lg bg-muted border border-border p-3 my-2">
                                  <code className={`text-xs font-mono text-foreground ${className ?? ''}`} {...props}>
                                    {children}
                                  </code>
                                </pre>
                              ) : (
                                <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-primary" {...props}>
                                  {children}
                                </code>
                              );
                            },
                            p({ children }: any) {
                              return <p className="mb-2 last:mb-0 text-foreground">{children}</p>;
                            },
                            ul({ children }: any) {
                              return <ul className="mb-2 ml-4 list-disc space-y-1 text-foreground">{children}</ul>;
                            },
                            ol({ children }: any) {
                              return <ol className="mb-2 ml-4 list-decimal space-y-1 text-foreground">{children}</ol>;
                            },
                            h1({ children }: any) { return <h1 className="mb-2 text-base font-semibold text-foreground">{children}</h1>; },
                            h2({ children }: any) { return <h2 className="mb-1.5 text-sm font-semibold text-foreground">{children}</h2>; },
                            h3({ children }: any) { return <h3 className="mb-1 text-sm font-medium text-foreground">{children}</h3>; },
                            strong({ children }: any) { return <strong className="font-semibold text-foreground">{children}</strong>; },
                            a({ href, children }: any) {
                              return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">{children}</a>;
                            },
                            blockquote({ children }: any) {
                              return <blockquote className="border-l-2 border-border pl-3 italic text-muted-foreground">{children}</blockquote>;
                            },
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </div>
                    )}

                    {message.changes && message.changes.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="text-xs text-muted-foreground mb-2">Code Changes:</div>
                        <div className="space-y-1">
                          {message.changes.map((change, index) => (
                            <div key={index} className="text-xs bg-muted p-2 rounded">
                              <div className="font-medium text-green-600 dark:text-green-400">{change.filePath}</div>
                              <div className="text-muted-foreground mt-1">
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
                        className="mt-1 p-1 opacity-60 hover:opacity-100 transition-opacity rounded hover:bg-muted"
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
                <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4" />
                    <span className="text-xs text-muted-foreground">AI Assistant</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="text-sm text-foreground">Thinking</div>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
      </div>
    </div>
  );
}
