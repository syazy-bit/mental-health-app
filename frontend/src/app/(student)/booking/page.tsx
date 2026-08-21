'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Counselor } from '@/lib/types';
import { listCounselors } from '@/lib/api';

export default function BookingPage() {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listCounselors()
      .then((data) => {
        if (!cancelled) {
          setCounselors(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error ? err.message : 'Failed to load counseling team.'
          );
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto w-full space-y-10 py-2 sm:py-6">
      {/* 1. EDITORIAL HEADER */}
      <div className="space-y-3 max-w-2xl">
        <div className="flex items-center gap-2">
          <Badge variant="brand" size="md" dot>
            University Counseling
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#19232D] dark:text-[#F1F3EF] tracking-tight">
          Talk with someone from your university
        </h1>
        <p className="text-slate-600 dark:text-[#AAB6B1] text-xs sm:text-sm sm:leading-relaxed">
          Connect with dedicated campus counseling staff for private one-to-one support with academic stress, exam burnout, personal challenges, or daily well-being.
        </p>
      </div>

      {/* 2. LOADING STATE */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-6 bg-white dark:bg-[#18211F] rounded-2xl border border-[#E6E4DD] dark:border-[#283632] space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5" />
              <div className="w-24 h-5 rounded-full bg-slate-100 dark:bg-white/5" />
            </div>
            <div className="w-3/4 h-6 rounded bg-slate-100 dark:bg-white/5" />
            <div className="w-full h-12 rounded bg-slate-100 dark:bg-white/5" />
            <div className="w-full h-10 rounded-xl bg-slate-100 dark:bg-white/5" />
          </div>
          <div className="p-6 bg-white dark:bg-[#18211F] rounded-2xl border border-[#E6E4DD] dark:border-[#283632] space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5" />
              <div className="w-24 h-5 rounded-full bg-slate-100 dark:bg-white/5" />
            </div>
            <div className="w-3/4 h-6 rounded bg-slate-100 dark:bg-white/5" />
            <div className="w-full h-12 rounded bg-slate-100 dark:bg-white/5" />
            <div className="w-full h-10 rounded-xl bg-slate-100 dark:bg-white/5" />
          </div>
        </div>
      )}

      {/* 3. ERROR STATE */}
      {!isLoading && errorMessage && (
        <Card variant="crisis" padding="lg" className="space-y-3 border border-[#FDE68A] dark:border-[#5E421E]">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#92400E] dark:text-[#FDE68A]">
              We could not load the counseling team right now.
            </h2>
            <p className="text-xs sm:text-sm text-[#78350F] dark:text-[#FDE68A]">{errorMessage}</p>
          </div>
          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsLoading(true);
                setErrorMessage(null);
                listCounselors()
                  .then(setCounselors)
                  .catch((err) =>
                    setErrorMessage(
                      err instanceof Error
                        ? err.message
                        : 'Failed to load counseling team.'
                    )
                  )
                  .finally(() => setIsLoading(false));
              }}
            >
              Try again
            </Button>
          </div>
        </Card>
      )}

      {/* 4. EMPTY STATE */}
      {!isLoading && !errorMessage && counselors.length === 0 && (
        <Card variant="default" padding="lg" className="text-center space-y-4 py-10">
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="text-base font-bold text-[#19232D] dark:text-[#F1F3EF]">
              No counselors are available at the moment
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#AAB6B1]">
              Please check back soon or explore our self-guided tools and 24/7 support lines.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/resources">
              <Button variant="secondary" size="md">
                <span>Explore Coping Tools</span>
                <span aria-hidden="true">&rarr;</span>
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* 5. COUNSELORS LIST */}
      {!isLoading && !errorMessage && counselors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {counselors.map((counselor) => (
            <Card
              key={counselor.id}
              variant="interactive"
              padding="lg"
              className="space-y-5 flex flex-col justify-between"
            >
              <div className="space-y-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#F0FDFA] dark:bg-[#142725] border border-[#CCFBF1] dark:border-[#28534E] flex items-center justify-center text-[#0D5C56] dark:text-[#4FA79D] font-bold text-base font-mono">
                    {counselor.name.charAt(0)}
                  </div>
                  <Badge variant="sage" size="sm">
                    {counselor.title}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-[#19232D] dark:text-[#F1F3EF]">
                    {counselor.name}
                  </h2>
                  {counselor.bio && (
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-[#AAB6B1] leading-relaxed">
                      {counselor.bio}
                    </p>
                  )}
                </div>

                {counselor.areas_of_support && counselor.areas_of_support.length > 0 && (
                  <div className="pt-1">
                    <p className="text-[11px] font-bold text-slate-400 dark:text-[#73827D] uppercase tracking-wider mb-1.5">
                      Areas of Support
                    </p>
                    <ul className="flex flex-wrap gap-1.5" aria-label="Areas of support">
                      {counselor.areas_of_support.map((area) => (
                        <li
                          key={area}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-[#FAF9F6] dark:bg-[#141C1A] text-slate-600 dark:text-[#AAB6B1] border border-[#E6E4DD] dark:border-[#283632]"
                        >
                          {area}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-[#283632]">
                <Link
                  href={`/booking/slots?counselor=${encodeURIComponent(counselor.id)}&name=${encodeURIComponent(counselor.name)}`}
                  className="block"
                >
                  <Button variant="brand" size="md" fullWidth>
                    <span>View available times</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 6. PRIVACY & TRANSITION INFORMATION (Honest, Verified) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
        <Card variant="default" padding="md" className="space-y-1.5">
          <h2 className="text-xs font-bold text-[#19232D] dark:text-[#F1F3EF] uppercase tracking-wider">
            How booking works with your privacy
          </h2>
          <p className="text-xs text-slate-600 dark:text-[#AAB6B1] leading-relaxed">
            Booking an appointment is anonymous-optional. Any contact details you choose to share are used solely to arrange your appointment and are never connected with your self-guided chat or check-in answers.
          </p>
        </Card>

        {/* 7. APPOINTMENT STATUS LOOKUP */}
        <Card variant="default" padding="md" className="space-y-2 flex flex-col justify-between">
          <div className="space-y-1">
            <h2 className="text-xs font-bold text-[#19232D] dark:text-[#F1F3EF] uppercase tracking-wider">
              Already scheduled an appointment?
            </h2>
            <p className="text-xs text-slate-600 dark:text-[#AAB6B1] leading-relaxed">
              Use your private 8-character confirmation code to check status or cancel anytime without an account.
            </p>
          </div>
          <div className="pt-1">
            <Link href="/booking/status">
              <Button variant="secondary" size="sm">
                <span>Check appointment status</span>
                <span aria-hidden="true">&rarr;</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}