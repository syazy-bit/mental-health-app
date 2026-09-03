'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toFriendlyAuthError, useAuth } from '@/components/auth/AuthProvider';
import { getSafeNextPath } from '@/lib/auth-redirect';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = getSafeNextPath(searchParams?.get('next'));
  const { user, status, register } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && user) {
      router.replace(next);
    }
  }, [status, user, next, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password || !confirmPassword) {
      setError('Fill in your email, password, and password confirmation.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 12) {
      setError('Use a password with at least 12 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedName = displayName.trim();
      await register(trimmedEmail, password, trimmedName || undefined);
      router.replace(next);
    } catch (err) {
      setError(toFriendlyAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Card padding="lg">
          <div className="flex flex-col items-center text-center mb-6">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#0D5C56] dark:bg-[#4FA79D] text-white dark:text-[#101817] mb-4 font-serif font-bold text-xl" aria-hidden="true">
              M
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#19232D] dark:text-[#F1F3EF] tracking-tight">
              Create your account
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-[#AAB6B1]">
              Optional — anonymous use always remains available
            </p>
          </div>

          {error && (
            <div className="mb-4">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              id="register-name"
              label="Display name (optional)"
              name="displayName"
              type="text"
              autoComplete="nickname"
              placeholder="What should we call you?"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
            <Input
              id="register-email"
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Input
              id="register-password"
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 12 characters"
              helperText="Use at least 12 characters."
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <Input
              id="register-confirm"
              label="Confirm password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
            <Button
              type="submit"
              variant="brand"
              fullWidth
              size="lg"
              isLoading={isSubmitting}
            >
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-xs sm:text-sm text-slate-600 dark:text-[#AAB6B1]">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-[#0D5C56] dark:text-[#4FA79D] font-semibold hover:underline focus-accessible rounded"
            >
              Log in
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12 text-sm text-slate-500 dark:text-[#AAB6B1]">
          Loading…
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
