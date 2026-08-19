'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { hasAdminToken } from '@/lib/admin-auth';
import { AdminApiError, login } from '@/lib/admin-api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (hasAdminToken()) {
      router.replace('/admin');
    }
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setError('Enter both your username and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(trimmedUsername, password);
      router.replace('/admin');
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(
          err.status === 401
            ? 'Incorrect username or password.'
            : err.message
        );
      } else {
        setError('Unable to sign in. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#0F766E] text-white mb-4">
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5h18M3 5v10a2 2 0 002 2h4l-2 4h10l-2-4h4a2 2 0 002-2V5M7 10h10"
                />
              </svg>
            </span>
            <h1 className="text-2xl font-bold text-slate-900">
              MindBridge Admin
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              University counseling portal sign in
            </p>
          </div>

          {error && (
            <div className="mb-4">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              id="admin-username"
              label="Username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
            <Input
              id="admin-password"
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <Button
              type="submit"
              variant="brand"
              fullWidth
              size="lg"
              isLoading={isSubmitting}
            >
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Authorized personnel only. All access is audited.
          </p>
        </div>
        <p className="mt-6 text-center text-sm">
          <Link
            href="/"
            className="text-[#0F766E] font-medium hover:underline focus-accessible rounded"
          >
            ← Back to student site
          </Link>
        </p>
      </div>
    </main>
  );
}