'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Legacy compatibility route: /check-ins redirects to /story.
 *
 * My Story is the primary longitudinal record and renders the same owned
 * PHQ-9 / GAD-7 history sections this page used to render, so existing
 * links and bookmarks keep working with one silent hop. `replace` (not
 * `push`) keeps back navigation clean. No history fetch happens here —
 * /story performs the single authenticated load. Anonymous visitors land
 * on /story, whose RequireAuth sends them to login with next=%2Fstory.
 */
export default function CheckinsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/story');
  }, [router]);

  return (
    <div
      className="max-w-4xl mx-auto space-y-6 py-2 sm:py-6"
      role="status"
      aria-label="Opening your Story"
    >
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
