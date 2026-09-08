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
  MOMENT_MAX_LENGTH,
  createMoment,
  deleteMoment,
  fetchMoments,
  isMomentAuth,
  restoreMoment,
  type MomentAuth,
} from '@/lib/moments';
import { formatCheckinDate } from '@/lib/screening-display';
import type { MomentItem, MomentSafetyLevel } from '@/lib/types';

/**
 * Frontend Undo window for moment deletion. Must stay at or below the
 * backend's 5-second restore window (4.5s leaves a race buffer so the UI
 * never offers an Undo the backend can no longer honor).
 */
export const MOMENT_UNDO_MS = 4500;

const NEAR_LIMIT_CHARS = 450;
const PREVIEW_CHARS = 200;

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string; isSessionExpired: boolean }
  | { status: 'ready' };

interface PendingUndo {
  id: string;
  item: MomentItem;
  index: number;
}

interface SaveNotice {
  level: MomentSafetyLevel;
}

function toListError(error: unknown): { message: string; isSessionExpired: boolean } {
  if (error instanceof AuthApiError && error.status === 401) {
    return {
      message: 'Your sign-in has expired. Please log in again to view your moments.',
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

function truncatePreview(body: string): string {
  if (body.length <= PREVIEW_CHARS) return body;
  const cut = body.slice(0, PREVIEW_CHARS);
  const lastSpace = cut.lastIndexOf(' ');
  return `${lastSpace > PREVIEW_CHARS - 40 ? cut.slice(0, lastSpace) : cut}…`;
}

export interface MomentsSectionProps {
  auth: MomentAuth;
}

export const MomentsSection: React.FC<MomentsSectionProps> = ({ auth }) => {
  const [listState, setListState] = useState<ListState>({ status: 'loading' });
  const [items, setItems] = useState<MomentItem[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const [draft, setDraft] = useState('');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<SaveNotice | null>(null);

  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(new Set());
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null);
  const [restoreNote, setRestoreNote] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());

  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoRegionRef = useRef<HTMLDivElement | null>(null);
  const saveNoticeRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const mountedRef = useRef(true);
  // Synchronous guard: state updates batch, so two clicks in the same tick
  // would both pass the `isSaving` closure check without this ref.
  const savingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (undoTimerRef.current !== null) {
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
    };
  }, []);

  // Initial load (authenticated only; RequireAuth gates anonymous users
  // before this section ever renders, and the client fails closed anyway).
  useEffect(() => {
    if (!isMomentAuth(auth)) return;
    let cancelled = false;
    fetchMoments(auth)
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

  // Focus the Undo control when it appears so keyboard users can recover.
  useEffect(() => {
    if (pendingUndo !== null) {
      undoRegionRef.current?.querySelector('button')?.focus();
    }
  }, [pendingUndo]);

  const clearUndoTimer = useCallback(() => {
    if (undoTimerRef.current !== null) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }, []);

  const dismissUndo = useCallback(() => {
    clearUndoTimer();
    setPendingUndo(null);
  }, [clearUndoTimer]);

  const handleSave = useCallback(async () => {
    if (savingRef.current || isSaving || draft.trim().length === 0) return;
    savingRef.current = true;
    // Never intentionally send more than the backend accepts.
    const body = draft.slice(0, MOMENT_MAX_LENGTH);
    setIsSaving(true);
    setSaveError(null);
    setSaveNotice(null);
    setRestoreNote(null);
    try {
      const created = await createMoment(auth, body);
      if (!mountedRef.current) return;
      const createdItem: MomentItem = {
        id: created.id,
        body: created.body,
        created_at: created.created_at,
      };
      setItems((prev) => [createdItem, ...prev]);
      setDraft('');
      setShowDiscardConfirm(false);
      // Transient only: the safety level shapes this one confirmation and
      // is never stored as profile data.
      setSaveNotice({ level: created.safety.level });
    } catch (error: unknown) {
      if (!mountedRef.current) return;
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          setSaveError('Your sign-in has expired. Please log in again — your words were not saved.');
        } else if (error.status === 429) {
          setSaveError('You’re saving quickly. Please take a short pause and try again.');
        } else if (error.status === 422 || error.status === 413) {
          setSaveError('That note couldn’t be saved. Please keep it under 500 characters and try again.');
        } else {
          setSaveError('We couldn’t save your moment. Please check your connection and try again.');
        }
      } else {
        setSaveError('We couldn’t save your moment. Please check your connection and try again.');
      }
    } finally {
      savingRef.current = false;
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [auth, draft, isSaving]);

  const handleDelete = useCallback(
    async (item: MomentItem, index: number) => {
      if (deletingIds.has(item.id)) return;
      // A newer delete supersedes an older pending Undo; the older
      // tombstone still expires on the backend on its own schedule.
      dismissUndo();
      setRestoreNote(null);
      setDeletingIds((prev) => new Set(prev).add(item.id));
      try {
        await deleteMoment(auth, item.id);
        if (!mountedRef.current) return;
        setItems((prev) => prev.filter((m) => m.id !== item.id));
        setPendingUndo({ id: item.id, item, index });
        undoTimerRef.current = setTimeout(() => {
          undoTimerRef.current = null;
          if (mountedRef.current) {
            setPendingUndo(null);
          }
        }, MOMENT_UNDO_MS);
      } catch (error: unknown) {
        if (!mountedRef.current) return;
        if (error instanceof AuthApiError && error.status === 401) {
          setRestoreNote('Your sign-in has expired. Please log in again.');
        } else if (error instanceof AuthApiError && error.status === 404) {
          // Already gone server-side: keep it removed locally, quietly.
          setItems((prev) => prev.filter((m) => m.id !== item.id));
        } else {
          // Deletion did not succeed: the Moment stays visible for retry.
          setRestoreNote('We couldn’t delete that moment. Please try again.');
        }
      } finally {
        if (mountedRef.current) {
          setDeletingIds((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
        }
      }
    },
    [auth, deletingIds, dismissUndo]
  );

  const handleUndo = useCallback(async () => {
    const pending = pendingUndo;
    if (pending === null) return;
    clearUndoTimer();
    setPendingUndo(null);
    setRestoreNote(null);
    try {
      const restored = await restoreMoment(auth, pending.id);
      if (!mountedRef.current) return;
      // Stale-response guard: only apply if the list does not already
      // contain this id (a newer save could theoretically reuse nothing —
      // ids are server-generated, so a match means already present).
      setItems((prev) => {
        if (prev.some((m) => m.id === restored.id)) return prev;
        const next = [...prev];
        const at = Math.min(Math.max(pending.index, 0), next.length);
        next.splice(at, 0, restored);
        return next;
      });
      setRestoreNote('Moment restored.');
    } catch (error: unknown) {
      if (!mountedRef.current) return;
      if (error instanceof AuthApiError && error.status === 404) {
        // Window gone: treat as already permanently deleted, quietly.
        return;
      }
      if (error instanceof AuthApiError && error.status === 401) {
        setRestoreNote('Your sign-in has expired. Please log in again.');
      } else {
        setRestoreNote('We couldn’t restore that moment. It remains deleted.');
      }
    }
  }, [auth, clearUndoTimer, pendingUndo]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const focusComposer = useCallback(() => {
    composerRef.current?.focus();
  }, []);

  const draftLength = draft.length;
  const canSave = draft.trim().length > 0 && !isSaving;
  const isNearLimit = draftLength > NEAR_LIMIT_CHARS;

  // Fail-closed UI: anonymous callers see nothing and issue no requests.
  // (RequireAuth gates this section at the page level; this is defense in
  // depth so the section is safe wherever it renders.)
  if (!isMomentAuth(auth)) {
    return null;
  }

  return (
    <section aria-labelledby="moments-heading" className="scroll-mt-20">
      <Card variant="default" padding="lg" className="space-y-5">
        <div className="space-y-1.5">
          <h2
            id="moments-heading"
            className="text-xl font-bold text-[#19232D] dark:text-[#F1F3EF]"
          >
            Moments
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#AAB6B1] leading-relaxed">
            Small things worth remembering.
          </p>
        </div>

        {/* Composer */}
        <div className="space-y-3">
          <label
            htmlFor="moment-composer"
            className="block text-xs sm:text-sm font-semibold text-[#19232D] dark:text-[#F1F3EF]"
          >
            Write a moment
          </label>
          <textarea
            id="moment-composer"
            ref={composerRef}
            rows={4}
            maxLength={MOMENT_MAX_LENGTH}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setShowDiscardConfirm(false);
              setSaveNotice(null);
            }}
            placeholder="Something worth remembering, in your own words…"
            disabled={isSaving}
            aria-describedby="moment-composer-hint moment-composer-count"
            className="w-full min-h-[140px] max-h-[220px] resize-y p-3.5 rounded-xl bg-white dark:bg-[#18211F] border border-[#E6E4DD] dark:border-[#283632] text-xs sm:text-sm text-[#19232D] dark:text-[#F1F3EF] placeholder:text-slate-400 dark:placeholder:text-[#73827D] outline-none focus:border-[#0D5C56] dark:focus:border-[#4FA79D] focus:ring-2 focus:ring-[#0D5C56]/15 dark:focus:ring-[#4FA79D]/20 transition-all disabled:opacity-60"
          />
          <p
            id="moment-composer-hint"
            className="text-[11px] text-slate-500 dark:text-[#73827D] leading-relaxed"
          >
            A few words is enough — this is only for you.
          </p>
          <div className="flex items-center justify-between gap-3">
            <span
              id="moment-composer-count"
              className={`text-[11px] tabular-nums ${
                isNearLimit
                  ? 'text-[#B45309] dark:text-[#E7A044] font-semibold'
                  : 'text-slate-400 dark:text-[#73827D]'
              }`}
            >
              {draftLength} / {MOMENT_MAX_LENGTH}
            </span>
            {/* Threshold-only announcement: the visible count updates every
                keystroke but is never live-announced; screen readers hear
                only the near-limit transition, once per crossing. */}
            <span className="sr-only" aria-live="polite">
              {isNearLimit ? 'Approaching the 500 character limit.' : ''}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isSaving || (draft.trim().length === 0 && !showDiscardConfirm)}
                onClick={() => {
                  if (draft.trim().length === 0) {
                    setDraft('');
                    setShowDiscardConfirm(false);
                    return;
                  }
                  setShowDiscardConfirm((prev) => !prev);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="brand"
                size="sm"
                disabled={!canSave}
                isLoading={isSaving}
                onClick={handleSave}
              >
                Save moment
              </Button>
            </div>
          </div>

          {showDiscardConfirm && draft.trim().length > 0 && (
            <div className="p-3.5 rounded-xl bg-[#FAF9F6] dark:bg-[#141C1A] border border-[#E6E4DD] dark:border-[#283632] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs sm:text-sm text-slate-700 dark:text-[#F1F3EF]">
                Discard this moment?
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDiscardConfirm(false)}
                >
                  Keep writing
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setDraft('');
                    setShowDiscardConfirm(false);
                    composerRef.current?.focus();
                  }}
                >
                  Discard
                </Button>
              </div>
            </div>
          )}

          {saveError !== null && (
            <Alert variant="error" title="We couldn’t save your moment">
              <p>{saveError}</p>
              {saveError.includes('log in again') && (
                <div className="pt-2">
                  <Link href="/login?next=%2Fstory">
                    <Button variant="brand" size="sm">
                      <span>Log in again</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Button>
                  </Link>
                </div>
              )}
            </Alert>
          )}

          {saveNotice !== null && (
            <div ref={saveNoticeRef} tabIndex={-1} className="outline-none space-y-3">
              {saveNotice.level === 'normal' && (
                <Alert variant="success" title="Saved to your Story">
                  <div className="flex items-start justify-between gap-3">
                    <p>Only you can see this.</p>
                    <button
                      type="button"
                      onClick={() => setSaveNotice(null)}
                      className="text-xs font-semibold underline underline-offset-2 shrink-0 p-1 cursor-pointer focus-accessible"
                    >
                      Dismiss
                    </button>
                  </div>
                </Alert>
              )}
              {saveNotice.level === 'moderate' && (
                <div className="space-y-3">
                  <Alert variant="success" title="Saved to your Story">
                    <div className="flex items-start justify-between gap-3">
                      <p>Only you can see this.</p>
                      <button
                        type="button"
                        onClick={() => setSaveNotice(null)}
                        className="text-xs font-semibold underline underline-offset-2 shrink-0 p-1 cursor-pointer focus-accessible"
                      >
                        Dismiss
                      </button>
                    </div>
                  </Alert>
                  <Alert variant="warning" title="Thank you for trusting us with that">
                    <p>
                      If things feel heavy, free and confidential support is
                      available whenever you want it.
                    </p>
                    <p className="pt-1">
                      Tele-MANAS (24/7, toll-free):{' '}
                      <a
                        href="tel:14416"
                        className="font-bold underline"
                      >
                        14416
                      </a>{' '}
                      ·{' '}
                      <Link
                        href="/support-now"
                        className="font-bold underline"
                      >
                        View all support options
                      </Link>
                    </p>
                  </Alert>
                </div>
              )}
              {saveNotice.level === 'high_risk' && (
                <div className="space-y-3">
                  <Alert variant="success" title="Saved to your Story">
                    <div className="flex items-start justify-between gap-3">
                      <p>Only you can see this.</p>
                      <button
                        type="button"
                        onClick={() => setSaveNotice(null)}
                        className="text-xs font-semibold underline underline-offset-2 shrink-0 p-1 cursor-pointer focus-accessible"
                      >
                        Dismiss
                      </button>
                    </div>
                  </Alert>
                  <Alert variant="crisis" title="You do not have to navigate this alone">
                    <p>
                      Free, confidential support is available right now from
                      trained people who will listen without judgment.
                    </p>
                    <p className="pt-1">
                      Tele-MANAS (24/7, toll-free):{' '}
                      <a
                        href="tel:14416"
                        className="font-bold underline text-[#B45309] dark:text-[#E7A044]"
                      >
                        14416
                      </a>{' '}
                      ·{' '}
                      <Link
                        href="/support-now"
                        className="font-bold underline text-[#B45309] dark:text-[#E7A044]"
                      >
                        View all support options
                      </Link>
                    </p>
                  </Alert>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Undo region */}
        {pendingUndo !== null && (
          <div
            ref={undoRegionRef}
            role="status"
            className="p-3.5 rounded-xl bg-[#FAF9F6] dark:bg-[#141C1A] border border-[#E6E4DD] dark:border-[#283632] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <p className="text-xs sm:text-sm text-slate-700 dark:text-[#F1F3EF]">
              Moment deleted.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleUndo}
              className="shrink-0"
            >
              Undo
            </Button>
          </div>
        )}

        {restoreNote !== null && (
          <p role="status" className="text-xs text-slate-500 dark:text-[#AAB6B1] leading-relaxed">
            {restoreNote}
          </p>
        )}

        {/* List */}
        <div className="space-y-3">
          {listState.status === 'loading' && (
            <div className="space-y-3" role="status" aria-label="Loading your moments">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {listState.status === 'error' && (
            <Alert variant="error" title="We couldn't load your moments">
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

          {listState.status === 'ready' && items.length === 0 && (
            <EmptyState
              title="No moments yet."
              description="When something feels worth remembering, save it here."
              action={{ label: 'Write a moment', variant: 'brand', onClick: focusComposer }}
            />
          )}

          {listState.status === 'ready' && items.length > 0 && (
            <ul className="divide-y divide-[#EFE9DD] dark:divide-[#283632]">
              {items.map((item) => {
                const isExpanded = expandedIds.has(item.id);
                const isDeleting = deletingIds.has(item.id);
                const needsTruncation = item.body.length > PREVIEW_CHARS;
                const visibleBody =
                  !needsTruncation || isExpanded ? item.body : truncatePreview(item.body);
                return (
                  <li key={item.id} className="py-4 first:pt-1 last:pb-1">
                    <article aria-label={`Moment from ${formatCheckinDate(item.created_at)}`}>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#73827D]">
                        {formatCheckinDate(item.created_at)}
                      </p>
                      <p className="mt-1.5 text-xs sm:text-sm text-[#19232D] dark:text-[#F1F3EF] leading-relaxed whitespace-pre-wrap break-words">
                        {visibleBody}
                      </p>
                      <div className="mt-2 flex items-center gap-4">
                        {needsTruncation && (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(item.id)}
                            aria-expanded={isExpanded}
                            aria-label={`${isExpanded ? 'Show less of' : 'Show more of'} moment from ${formatCheckinDate(item.created_at)}`}
                            className="inline-flex items-center text-xs font-semibold text-[#0D5C56] dark:text-[#4FA79D] hover:underline underline-offset-2 p-1 -ml-1 cursor-pointer focus-accessible touch-target"
                          >
                            {isExpanded ? 'Show less' : 'Show more'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const index = items.findIndex((m) => m.id === item.id);
                            void handleDelete(item, index);
                          }}
                          disabled={isDeleting}
                          aria-label={`Delete moment from ${formatCheckinDate(item.created_at)}`}
                          className="inline-flex items-center text-xs font-medium text-slate-400 dark:text-[#73827D] hover:text-[#B45309] dark:hover:text-[#E7A044] hover:underline underline-offset-2 p-1 cursor-pointer focus-accessible touch-target disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isDeleting ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>
    </section>
  );
};
