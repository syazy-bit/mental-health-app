'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { AuthApiError } from '@/lib/auth-api';
import { isHelpfulMarkAuth, markHelpful } from '@/lib/helpful_marks';

/**
 * "This helped" action rendered inside a Tool card.
 *
 * Temporary interaction state only: the checked confirmation reflects the
 * current visit. Remounting (tab switch, revisit) resets to the unmarked
 * state. The persistent memory lives in My Story → What Helped, not here.
 * Anonymous users are sent to sign in via the existing ?next= convention;
 * no anonymous mark is ever recorded.
 */
export interface MarkHelpfulButtonProps {
  toolId: string;
  toolName: string;
}

export const MarkHelpfulButton: React.FC<MarkHelpfulButtonProps> = ({
  toolId,
  toolName,
}) => {
  const { status: authStatus, user: authUser } = useAuth();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Synchronous guard: state updates batch, so rapid clicks in the same
  // tick would both pass the `isSaving` closure check without this ref.
  const savingRef = useRef(false);
  const mountedRef = useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleClick = async () => {
    if (checked || savingRef.current || isSaving) return;
    if (!isHelpfulMarkAuth({ status: authStatus, user: authUser })) {
      router.push('/login?next=/resources');
      return;
    }
    savingRef.current = true;
    setIsSaving(true);
    setSaveError(null);
    try {
      await markHelpful({ status: authStatus, user: authUser }, toolId);
      if (!mountedRef.current) return;
      setChecked(true);
    } catch (error: unknown) {
      if (!mountedRef.current) return;
      if (error instanceof AuthApiError && error.status === 401) {
        router.push('/login?next=/resources');
        return;
      }
      setSaveError('We couldn’t save that. Please try again.');
    } finally {
      savingRef.current = false;
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  if (checked) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <span
          role="status"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-[#E8F0EA] dark:bg-[#1F3329] text-[#1E4D3D] dark:text-[#A8CEB1] border border-[#D5E3D8] dark:border-[#2D493B]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-3.5 h-3.5"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>You marked this as helpful</span>
        </span>
        <span className="text-[11px] text-[#6F8279] dark:text-[#8E9F98]">
          Find it anytime in My Story.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={isSaving}
        aria-pressed="false"
        aria-label={
          isSaving
            ? `Saving ${toolName} as helpful`
            : `Mark ${toolName} as helpful`
        }
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-medium text-[#5A6D65] dark:text-[#9FB1A9] border border-[#E5DEC7] dark:border-[#283C33] hover:text-[#182C24] dark:hover:text-[#F3F7F5] hover:bg-black/5 dark:hover:bg-white/5 transition-all focus-accessible select-none disabled:opacity-50 disabled:cursor-wait cursor-pointer touch-target"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-3.5 h-3.5"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        <span>{isSaving ? 'Saving…' : 'This helped'}</span>
      </button>
      {saveError !== null && (
        <p role="alert" className="text-[11px] text-[#B45309] dark:text-[#E7A044]">
          {saveError}
        </p>
      )}
    </div>
  );
};
