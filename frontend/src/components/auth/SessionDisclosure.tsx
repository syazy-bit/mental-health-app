'use client';

import React, { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

/**
 * R1 privacy disclosure (Phase 2C): a calm, additive notice explaining the
 * anonymous → account-session transition. Composed only from existing
 * primitives (Alert + Dialog + Button) so it feels native to the product.
 */
export const SessionDisclosure: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  const [explainOpen, setExplainOpen] = useState(false);

  return (
    <div className={className}>
      <Alert variant="info" title="How signing in works">
        <p>
          While you&apos;re signed in, new wellbeing activity is saved to your
          account. Anything you did anonymously before signing in stays
          anonymous.
        </p>
        <button
          type="button"
          onClick={() => setExplainOpen(true)}
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-sky-900 dark:text-sky-300 hover:underline focus-accessible rounded cursor-pointer"
        >
          Learn more about account sessions
          <span aria-hidden="true">&rarr;</span>
        </button>
      </Alert>

      <Dialog
        open={explainOpen}
        onClose={() => setExplainOpen(false)}
        title="About your account session"
        description="A short note on how your activity is kept separate."
      >
        <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-[#AAB6B1] leading-relaxed">
          <p>
            When you sign in, the app starts a new account session for you.
            Chats, check-ins, and appointments you begin while signed in
            belong to your account, so you can pick up where you left off.
          </p>
          <p>
            Anything you did before signing in stays anonymous. It is never
            moved into your account.
          </p>
          <p>
            Logging out returns you to anonymous mode. You can also simply
            stay logged out to keep using the app anonymously.
          </p>
          <div className="pt-1">
            <Button
              type="button"
              variant="brand"
              size="md"
              fullWidth
              onClick={() => setExplainOpen(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
