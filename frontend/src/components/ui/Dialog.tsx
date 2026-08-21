'use client';

import React, { useEffect, useId, useRef } from 'react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

/**
 * Accessible modal dialog: focus trap, focus restoration, Escape to close,
 * aria-modal, labelled by its title. Used for status changes and deletions.
 */
export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  // Move focus into the panel only when the dialog transitions to open.
  useEffect(() => {
    if (open && !wasOpen.current) {
      previousFocus.current = document.activeElement as HTMLElement | null;
      panelRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  // Keyboard handling: Escape closes, Tab is trapped inside the panel.
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'Tab' && panelRef.current) {
        const panel = panelRef.current;
        const focusables = Array.from(
          panel.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute('disabled'));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  // Restore focus to the previously focused element when the dialog closes.
  useEffect(() => {
    if (open) return;
    if (previousFocus.current) {
      previousFocus.current.focus();
      previousFocus.current = null;
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className="relative w-full sm:max-w-lg bg-white dark:bg-[#18211F] rounded-t-2xl sm:rounded-2xl shadow-xl border border-[#E6E4DD] dark:border-[#283632] outline-none focus-accessible max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 border-b border-[#E6E4DD]/60 dark:border-[#283632]">
          <h2 id={titleId} className="text-lg font-bold text-[#19232D] dark:text-[#F1F3EF]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 dark:text-[#73827D] hover:text-[#19232D] dark:hover:text-[#F1F3EF] hover:bg-slate-100 dark:hover:bg-white/5 focus-accessible touch-target transition-colors cursor-pointer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        {description && (
          <p
            id={descriptionId}
            className="px-6 pt-3 text-xs sm:text-sm text-slate-600 dark:text-[#AAB6B1] leading-relaxed"
          >
            {description}
          </p>
        )}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
};