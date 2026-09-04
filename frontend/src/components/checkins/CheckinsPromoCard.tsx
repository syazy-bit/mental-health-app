'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/auth/AuthProvider';

/**
 * Signed-in-only entry point to "My Check-ins" on the screening hub.
 * Returns null for anonymous visitors, so the anonymous screening
 * experience renders exactly as before.
 */
export const CheckinsPromoCard: React.FC = () => {
  const { status, user } = useAuth();

  if (status !== 'authenticated' || !user) {
    return null;
  }

  return (
    <Card
      variant="sage"
      padding="lg"
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="space-y-1.5">
        <Badge variant="brand" size="sm" dot>
          Signed in &bull; Private to you
        </Badge>
        <h2 className="text-lg font-bold text-[#19232D] dark:text-[#F1F3EF]">
          My Check-ins
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-[#AAB6B1] leading-relaxed max-w-xl">
          Review your past PHQ-9 and GAD-7 check-ins, completed while signed in. Anonymous
          check-ins never appear here.
        </p>
      </div>
      <Link href="/check-ins" className="shrink-0">
        <Button variant="brand" size="md">
          <span>View My Check-ins</span>
          <span aria-hidden="true">&rarr;</span>
        </Button>
      </Link>
    </Card>
  );
};
