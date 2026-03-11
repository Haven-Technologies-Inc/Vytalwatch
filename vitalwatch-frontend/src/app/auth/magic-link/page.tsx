'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { authApi } from '@/services/api';
import { ApiError } from '@/services/api/client';

function MagicLinkContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'no-token'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }
    const verify = async () => {
      try {
        const res = await authApi.verifyMagicLink(token);
        const d = (res.data as any)?.data || res.data;
        if (d?.accessToken) localStorage.setItem('accessToken', d.accessToken);
        if (d?.refreshToken) localStorage.setItem('refreshToken', d.refreshToken);
        setStatus('success');
        const role = d?.user?.role;
        const dest =
          role === 'patient' ? '/patient/dashboard' :
          role === 'provider' ? '/provider/dashboard' :
          (role === 'admin' || role === 'superadmin') ? '/admin/dashboard' :
          '/auth/login';
        setTimeout(() => router.push(dest), 2000);
      } catch (e) {
        setStatus('error');
        setErrorMsg(e instanceof ApiError ? e.message : 'Magic link is invalid or expired.');
      }
    };
    verify();
  }, [token, router]);

  const logo = (
    <Link href="/" className="mb-4 inline-block">
      <Image src="/logo.png" alt="VytalWatch" width={160} height={50} className="h-12 w-auto" priority />
    </Link>
  );

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800 text-center">
          {logo}
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Signing you in...</h1>
          <p className="text-gray-600 dark:text-gray-400">Verifying your magic link. Please wait.</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800 text-center">
          {logo}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sign In Successful!</h1>
          <p className="text-gray-600 dark:text-gray-400">You have been signed in. Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800 text-center">
          {logo}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
            <XCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Link Expired</h1>
          <p className="text-gray-600 dark:text-gray-400">{errorMsg}</p>
          <div className="space-y-3">
            <Link href="/auth/login">
              <Button className="w-full">Back to Login</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // no-token state
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800 text-center">
        {logo}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invalid Link</h1>
        <p className="text-gray-600 dark:text-gray-400">
          This magic link is missing a token. Please request a new sign-in link from the login page.
        </p>
        <Link href="/auth/login">
          <Button className="w-full">Go to Login</Button>
        </Link>
      </div>
    </div>
  );
}

export default function MagicLinkPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <MagicLinkContent />
    </Suspense>
  );
}
