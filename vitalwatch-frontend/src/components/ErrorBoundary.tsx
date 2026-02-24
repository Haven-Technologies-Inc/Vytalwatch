'use client';

import React from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Send to Sentry error reporting service
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-8 dark:border-red-900 dark:bg-red-950/20">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>

          <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
            Something went wrong
          </h2>
          <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
            An error occurred while rendering this component.
          </p>

          {this.state.error && (
            <details className="mt-4 max-w-full">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Error details
              </summary>
              <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-gray-100 p-3 text-xs text-red-600 dark:bg-gray-800 dark:text-red-400">
                {this.state.error.message}
              </pre>
            </details>
          )}

          <div className="mt-6 flex gap-3">
            <Button size="sm" onClick={this.handleReset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Link href="/">
              <Button size="sm" variant="outline">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
