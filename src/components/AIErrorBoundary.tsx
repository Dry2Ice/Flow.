'use client';

import React, { Component, ReactNode } from 'react';
import { useAppStore } from '@/lib/store';

interface AIErrorBoundaryProps {
  children: ReactNode;
  sessionId?: string;
  onError?: (error: Error) => void;
}

interface AIErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

export class AIErrorBoundary extends Component<AIErrorBoundaryProps, AIErrorBoundaryState> {
  static defaultProps = {
    sessionId: 'ai-errors',
  };

  state: AIErrorBoundaryState = {
    hasError: false,
    error: null,
    retryCount: 0,
  };

  static getDerivedStateFromError(error: Error): AIErrorBoundaryState {
    return {
      hasError: true,
      error,
      retryCount: 0,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const { sessionId = 'ai-errors' } = this.props;
    const { retryCount } = this.state;
    
    // Log error to store
    useAppStore.getState().addLog({
      id: crypto.randomUUID(),
      sessionId,
      timestamp: new Date(),
      type: 'error',
      message: `AI Error: ${error.message}`,
      source: 'ai_execution',
      details: JSON.stringify({
        retryCount,
        componentStack: info.componentStack,
      }),
    });
  }

  handleRetry = () => {
    this.setState(
      (prevState) => ({
        hasError: false,
        error: null,
        retryCount: prevState.retryCount + 1,
      }),
      () => {
        this.props.onError?.(this.state.error!);
      }
    );
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg backdrop-blur-sm">
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-red-400">
              AI Generation Failed
            </h3>
            <p className="text-xs text-red-300/80 mt-1">
              Something went wrong with AI generation. Please try again.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={this.handleRetry}
              className="flex-1 px-3 py-1.5 text-xs font-medium bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded text-red-300 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-3 py-1.5 text-xs font-medium bg-neutral-800/50 hover:bg-neutral-800/70 border border-neutral-700/30 rounded text-neutral-400 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      );
    }

    return this.props.children as ReactNode;
  }
}
