/**
 * ErrorBoundary Component
 *
 * Error handling wrapper component.
 * @module components/shared/ErrorBoundary
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary - Catch and handle errors in component tree
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-red-200 bg-red-50 p-8">
          <div className="mb-4 rounded-full bg-red-100 p-3">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            Something went wrong
          </h2>
          <p className="mb-6 max-w-md text-center text-sm text-gray-600">
            We're sorry, but something unexpected happened. Please try refreshing the page.
          </p>
          {this.state.error && process.env.NODE_ENV === 'development' && (
            <details className="mt-4 w-full max-w-2xl">
              <summary className="cursor-pointer text-sm font-medium text-gray-700">
                Error details
              </summary>
              <pre className="mt-2 overflow-auto rounded-lg bg-gray-800 p-4 text-xs text-white">
                {this.state.error.toString()}
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Refresh page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
