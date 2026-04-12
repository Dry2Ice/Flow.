// src/components/AIChat.tsx

"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Copy, Check } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export function AIChat() {
  const { messages, isGenerating } = useAppStore();
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    <div className="h-full bg-neutral-800 flex flex-col">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 border-b border-neutral-700">
        <h3 className="text-sm font-medium text-neutral-200 flex items-center gap-2">
          <Bot className="w-4 h-4" />
          AI Assistant
        </h3>
        <div className="text-xs text-neutral-500">
          {messages.length} messages
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
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
    </div>
  );
}