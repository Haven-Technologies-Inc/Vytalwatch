// Re-export and wrap useToast from Toast component
import { useCallback } from 'react';
import { useToast as useToastOriginal } from '@/components/ui/Toast';

interface ToastOptions {
  title: string;
  description?: string;
  message?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}

export function useToast() {
  const context = useToastOriginal();
  
  const { addToast } = context;
  
  const toast = useCallback((options: ToastOptions) => {
    const type = options.type || 'info';
    const message = options.description || options.message;
    addToast({ type, title: options.title, message });
  }, [addToast]);

  return { ...context, toast };
}
