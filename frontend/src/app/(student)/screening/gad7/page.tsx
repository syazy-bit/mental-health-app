'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ensureSession } from '@/lib/session';
import { submitScreening } from '@/lib/api';

const GAD7_QUESTIONS = [
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless that it is hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid as if something awful might happen',
];

const RESPONSE_OPTIONS = [
  { value: 0, label: 'Not at all', scoreText: '0 days' },
  { value: 1, label: 'Several days', scoreText: '1–6 days' },
  { value: 2, label: 'More than half the days', scoreText: '7–11 days' },
  { value: 3, label: 'Nearly every day', scoreText: '12–14 days' },
];

export default function GAD7ScreeningPage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<number[]>(new Array(7).fill(-1));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentQuestion = GAD7_QUESTIONS[currentIndex];
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

    if (currentIndex < GAD7_QUESTIONS.length - 1) {
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
          instrument: 'GAD7',
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

  const progressPercentage = Math.round(((currentIndex + 1) / GAD7_QUESTIONS.length) * 100);

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6 py-2 sm:py-6">
      {/* 1. BREADCRUMB & INSTRUMENT BADGE */}
      <div className="flex items-center justify-between">
        <Link
          href="/screening"
          className="text-xs font-semibold text-slate-500 dark:text-[#AAB6B1] hover:text-[#0D5C56] dark:hover:text-[#4FA79D] focus-accessible p-1 -ml-1 transition-colors"
        >
          &larr; Back to Self-Assessments
        </Link>
        <Badge variant="sage" size="sm" dot>
          GAD-7 Anxiety Assessment
        </Badge>
      </div>

      {/* 2. PROGRESS BAR */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-[#AAB6B1]">
          <span>Question {currentIndex + 1} of {GAD7_QUESTIONS.length}</span>
          <span>{progressPercentage}% Completed</span>
        </div>
        <div className="w-full h-2 bg-slate-200/80 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#4A6B62] dark:bg-[#86A69D] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* 3. QUESTION CANVAS */}
      <Card variant="elevated" padding="lg" className="space-y-6">
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-400 dark:text-[#73827D] uppercase tracking-wider">
            Over the last 2 weeks, how often have you been bothered by:
          </span>
          <h1 className="text-lg sm:text-xl font-bold text-[#19232D] dark:text-[#F1F3EF] leading-snug">
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
                    ? 'border-[#4A6B62] dark:border-[#86A69D] bg-[#F4F7F5] dark:bg-[#172320] text-[#3B5B52] dark:text-[#86A69D] ring-2 ring-[#4A6B62]/15 dark:ring-[#86A69D]/20 font-semibold shadow-2xs'
                    : 'border-[#E6E4DD] dark:border-[#283632] bg-white dark:bg-[#18211F] hover:bg-stone-50 dark:hover:bg-[#202B28] hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-[#F1F3EF]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs shrink-0 transition-colors ${
                      isSelected
                        ? 'border-[#4A6B62] dark:border-[#86A69D] bg-[#4A6B62] dark:bg-[#86A69D] text-white dark:text-[#101817]'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#18211F]'
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
                <span className="text-xs text-slate-400 dark:text-[#73827D] font-normal">
                  {option.scoreText}
                </span>
              </button>
            );
          })}
        </div>

        {/* Error message */}
        {errorMessage && (
          <div role="alert" className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-200 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-[#283632]">
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
            {currentIndex === GAD7_QUESTIONS.length - 1 ? 'Submit & View Results' : 'Next Question \u2192'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
