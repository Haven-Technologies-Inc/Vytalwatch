'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, XCircle, Mail, Loader2 } from 'lucide-react';
import { authApi } from '@/services/api';
import { ApiError } from '@/services/api/client';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'no-token'>('loading');
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }

    const verifyEmail = async () => {
      try {
        await authApi.verifyEmail(token!);
        setStatus('success');
        setTimeout(() => router.push('/auth/login'), 3000);
      } catch (err) {
        setStatus('error');
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Email verification failed. The link may be invalid or expired.');
        }
      }
    };

    verifyEmail();
  }, [token, router]);

  const handleResendVerification = async () => {
    setResending(true);
    setResendSuccess(false);
    try {
      // Prompt user for email since we don't have it in context
      const email = window.prompt('Please enter your email address to resend verification:');
      if (!email) {
        setResending(false);
        return;
      }
      await authApi.resendVerification(email);
      setResendSuccess(true);
    } catch {
      setError('Failed to resend verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
          <div className="flex flex-col items-center text-center">
            <Link href="/" className="mb-4">
              <Image src="/logo.png" alt="VytalWatch AI" width={160} height={50} className="h-12 w-auto" priority />
            </Link>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
              Verifying your email...
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Please wait while we verify your email address.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
          <div className="flex flex-col items-center text-center">
            <Link href="/" className="mb-4">
              <Image src="/logo.png" alt="VytalWatch AI" width={160} height={50} className="h-12 w-auto" priority />
            </Link>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
              Email Verified!
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Your email has been successfully verified. Redirecting to login...
            </p>
          </div>
          <Link href="/auth/login">
            <Button className="w-full">Continue to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
          <div className="flex flex-col items-center text-center">
            <Link href="/" className="mb-4">
              <Image src="/logo.png" alt="VytalWatch AI" width={160} height={50} className="h-12 w-auto" priority />
            </Link>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
              <XCircle className="h-8 w-8" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
              Verification Failed
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{error}</p>
          </div>
          <div className="space-y-3">
            <Button className="w-full" onClick={() => window.location.reload()}>
              Try Again
            </Button>
            <Link href="/auth/login">
              <Button variant="outline" className="w-full">Back to Login</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="mb-4">
            <Image src="/logo.png" alt="VytalWatch AI" width={160} height={50} className="h-12 w-auto" priority />
          </Link>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Mail className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            Verify Your Email
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Please check your inbox for a verification link. If you haven&apos;t received an email, you can request a new one.
          </p>
        </div>
        <div className="space-y-3">
          {resendSuccess && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 text-center">
              Verification email sent! Please check your inbox.
            </p>
          )}
          <Button
            className="w-full"
            onClick={handleResendVerification}
            isLoading={resending}
            disabled={resending}
          >
            Resend Verification Email
          </Button>
          <Link href="/auth/login">
            <Button variant="outline" className="w-full">Back to Login</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
