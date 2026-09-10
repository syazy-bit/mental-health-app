'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { AuthApiError } from '@/lib/auth-api';
import {
  fetchHelpfulMarks,
  isHelpfulMarkAuth,
  removeHelpfulMark,
  type HelpfulMarkAuth,
} from '@/lib/helpful_marks';
import { lookupTool, toolHref } from '@/lib/tools';
import type { HelpfulMarkItem } from '@/lib/types';

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string; isSessionExpired: boolean }
  | { status: 'ready' };

function toListError(error: unknown): { message: string; isSessionExpired: boolean } {
  if (error instanceof AuthApiError && error.status === 401) {
    return {
      message: 'Your sign-in has expired. Please log in again to view what helped.',
      isSessionExpired: true,
    };
  }
  if (error instanceof AuthApiError && error.status === 0) {
    return {
      message: 'Unable to reach the server. Please check your connection and try again.',
      isSessionExpired: false,
    };
  }
  return {
    message: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
    isSessionExpired: false,
  };
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "Marked today" for same-local-day marks, otherwise a short local date. */
export function formatMarkedDate(iso: string, now: Date = new Date()): string {
  const marked = new Date(iso);
  if (Number.isNaN(marked.getTime())) {
    return 'Marked recently';
  }
  if (isSameLocalDay(marked, now)) {
    return 'Marked today';
  }
  return `Marked ${marked.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

export interface WhatHelpedSectionProps {
  auth: HelpfulMarkAuth;
}

/**
 * My Story → What Helped: the authenticated student's explicitly saved
 * tools, one card per tool. Tool names and descriptions resolve
 * client-side from the frontend registry; unknown ids are skipped (the
 * backend registry is authoritative, so this only guards retired ids).
 */
export const WhatHelpedSection: React.FC<WhatHelpedSectionProps> = ({ auth }) => {
  const [listState, setListState] = useState<ListState>({ status: 'loading' });
  const [items, setItems] = useState<HelpfulMarkItem[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [removingIds, setRemovingIds] = useState<ReadonlySet<string>>(new Set());
  const [removeNote, setRemoveNote] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isHelpfulMarkAuth(auth)) return;
    let cancelled = false;
    fetchHelpfulMarks(auth)
      .then((response) => {
        if (!cancelled) {
          setItems(response.items);
          setListState({ status: 'ready' });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setListState({ status: 'error', ...toListError(error) });
        }
      });
    return () => {
      cancelled = true;
    };
    // reloadKey intentionally re-triggers a fresh load on retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status, auth.user, reloadKey]);

  const handleRemove = useCallback(
    async (toolId: string) => {
      if (removingIds.has(toolId)) return;
      setRemovingIds((prev) => new Set(prev).add(toolId));
      setRemoveNote(null);
      try {
        await removeHelpfulMark(auth, toolId);
        if (!mountedRef.current) return;
        setItems((prev) => prev.filter((m) => m.tool_id !== toolId));
      } catch (error: unknown) {
        if (!mountedRef.current) return;
        if (error instanceof AuthApiError && error.status === 401) {
          setRemoveNote('Your sign-in has expired. Please log in again.');
        } else {
          // Removal did not succeed: the item stays visible for retry.
          setRemoveNote('We couldn’t remove that item. Please try again.');
        }
      } finally {
        if (mountedRef.current) {
          setRemovingIds((prev) => {
            const next = new Set(prev);
            next.delete(toolId);
            return next;
          });
        }
      }
    },
    [auth, removingIds]
  );

  // Fail-closed UI: anonymous callers see nothing and issue no requests.
  if (!isHelpfulMarkAuth(auth)) {
    return null;
  }

  // Backend is authoritative for ids, but a retired id the frontend no
  // longer knows must never render a broken card.
  const knownItems = items.filter((item) => lookupTool(item.tool_id) !== null);

  return (
    <section aria-labelledby="what-helped-heading" className="scroll-mt-20">
      <Card variant="default" padding="lg" className="space-y-5">
        <div className="space-y-1.5">
          <h2
            id="what-helped-heading"
            className="text-xl font-bold text-[#19232D] dark:text-[#F1F3EF]"
          >
            What helped
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#AAB6B1] leading-relaxed">
            Things you&rsquo;ve chosen to remember as useful.
          </p>
        </div>

        {listState.status === 'loading' && (
          <div className="space-y-3" role="status" aria-label="Loading what helped">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {listState.status === 'error' && (
          <Alert variant="error" title="We couldn't load what helped">
            <p>{listState.message}</p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {listState.isSessionExpired ? (
                <Link href="/login?next=%2Fstory">
                  <Button variant="brand" size="sm">
                    <span>Log in again</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="brand"
                  size="sm"
                  onClick={() => {
                    setListState({ status: 'loading' });
                    setReloadKey((k) => k + 1);
                  }}
                >
                  Try again
                </Button>
              )}
            </div>
          </Alert>
        )}

        {listState.status === 'ready' && knownItems.length === 0 && (
          <EmptyState
            title="You haven't marked anything yet."
            description="When a tool feels useful, you can save it here for next time."
            action={{ label: 'Explore tools', href: '/resources', variant: 'brand' }}
          />
        )}

        {listState.status === 'ready' && knownItems.length > 0 && (
          <ul className="space-y-3">
            {knownItems.map((item) => {
              const meta = lookupTool(item.tool_id);
              if (meta === null) return null;
              const isRemoving = removingIds.has(item.tool_id);
              return (
                <li
                  key={item.tool_id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#18211F] border border-[#E6E4DD] dark:border-[#283632] space-y-1.5"
                >
                  <h3 className="text-sm font-bold text-[#19232D] dark:text-[#F1F3EF]">
                    {meta.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-[#AAB6B1] leading-relaxed">
                    {meta.description}
                  </p>
                  <p className="text-[11px] text-[#6F8279] dark:text-[#8E9F98]">
                    {formatMarkedDate(item.marked_at)}
                  </p>
                  <div className="pt-1 flex items-center gap-2 flex-wrap">
                    <Link href={toolHref(meta.id)} className="inline-block">
                      <Button variant="secondary" size="sm">
                        <span>Try again</span>
                        <span aria-hidden="true">&rarr;</span>
                      </Button>
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleRemove(item.tool_id)}
                      disabled={isRemoving}
                      aria-label={`Remove ${meta.name} from What helped`}
                      className="text-xs font-medium text-slate-400 dark:text-[#73827D] hover:text-[#B45309] dark:hover:text-[#E7A044] hover:underline underline-offset-2 p-1 cursor-pointer focus-accessible disabled:opacity-50 disabled:cursor-not-allowed touch-target inline-flex items-center"
                    >
                      {isRemoving ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {removeNote !== null && (
          <p role="status" className="text-xs text-slate-500 dark:text-[#AAB6B1] leading-relaxed">
            {removeNote}
          </p>
        )}
      </Card>
    </section>
  );
};
