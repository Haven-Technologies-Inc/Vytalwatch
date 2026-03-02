'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
