'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ensureSession } from '@/lib/session';
import { submitScreening } from '@/lib/api';

const PHQ9_QUESTIONS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
  'Trouble concentrating on things, such as reading or studying',
  'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
  'Thoughts that you would be better off dead, or of hurting yourself in some way',
];

const RESPONSE_OPTIONS = [
  { value: 0, label: 'Not at all', scoreText: '0 days' },
  { value: 1, label: 'Several days', scoreText: '1–6 days' },
  { value: 2, label: 'More than half the days', scoreText: '7–11 days' },
  { value: 3, label: 'Nearly every day', scoreText: '12–14 days' },
];

export default function PHQ9ScreeningPage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<number[]>(new Array(9).fill(-1));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentQuestion = PHQ9_QUESTIONS[currentIndex];
  const selectedValue = responses[currentIndex];

  const handleSelectOption = (value: number) => {
    const updated = [...responses];
    updated[currentIndex] = value;
    setResponses(updated);
    setErrorMessage(null);
  };

  const handleNext = async () => {
    if (selectedValue === -1) {
      setErrorMessage('Please choose an option to continue.');
      return;
    }

    if (currentIndex < PHQ9_QUESTIONS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setErrorMessage(null);
    } else {
      // Final submission
      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        const sessionId = await ensureSession();
        const result = await submitScreening({
          session_id: sessionId,
          instrument: 'PHQ9',
          responses,
        });

        // Store result in sessionStorage for display on /screening/result
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('mh_last_screening', JSON.stringify(result));
        }

        router.push('/screening/result');
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Failed to submit check-in. Please try again.'
        );
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setErrorMessage(null);
    }
  };

  const progressPercentage = Math.round(((currentIndex + 1) / PHQ9_QUESTIONS.length) * 100);

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6 py-2 sm:py-6">
      {/* 1. BREADCRUMB & INSTRUMENT BADGE */}
      <div className="flex items-center justify-between">
        <Link
          href="/screening"
          className="text-xs font-semibold text-slate-500 hover:text-[#0D5C56] focus-accessible p-1 -ml-1 transition-colors"
        >
          &larr; Back to Check-ins
        </Link>
        <Badge variant="brand" size="sm" dot>
          PHQ-9 Mood Check-in
        </Badge>
      </div>

      {/* 2. PROGRESS BAR */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-medium text-slate-500">
          <span>Question {currentIndex + 1} of {PHQ9_QUESTIONS.length}</span>
          <span>{progressPercentage}% Completed</span>
        </div>
        <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0D5C56] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* 3. QUESTION CANVAS */}
      <Card variant="elevated" padding="lg" className="space-y-6 bg-white border border-[#E6E4DD]">
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Over the last 2 weeks, how often have you been bothered by:
          </span>
          <h1 className="text-lg sm:text-xl font-bold text-[#19232D] leading-snug">
            {currentQuestion}
          </h1>
        </div>

        {/* Ergonomic Options */}
        <div className="space-y-2.5" role="radiogroup" aria-label="Frequency options">
          {RESPONSE_OPTIONS.map((option) => {
            const isSelected = selectedValue === option.value;

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelectOption(option.value)}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between touch-target focus-accessible cursor-pointer select-none ${
                  isSelected
                    ? 'border-[#0D5C56] bg-[#F0FDFA] text-[#0D5C56] ring-2 ring-[#0D5C56]/15 font-semibold shadow-2xs'
                    : 'border-[#E6E4DD] bg-white hover:bg-stone-50 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs shrink-0 transition-colors ${
                      isSelected
                        ? 'border-[#0D5C56] bg-[#0D5C56] text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className="text-xs sm:text-sm">{option.label}</span>
                </div>
                <span className="text-xs text-slate-400 font-normal">
                  {option.scoreText}
                </span>
              </button>
            );
          })}
        </div>

        {/* Error message */}
        {errorMessage && (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={handleBack}
            disabled={currentIndex === 0 || isSubmitting}
            className={currentIndex === 0 ? 'invisible' : ''}
          >
            &larr; Previous
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleNext}
            isLoading={isSubmitting}
            disabled={selectedValue === -1}
          >
            {currentIndex === PHQ9_QUESTIONS.length - 1 ? 'Submit & View Results' : 'Next Question \u2192'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
