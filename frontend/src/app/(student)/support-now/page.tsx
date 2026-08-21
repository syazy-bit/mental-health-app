'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CrisisResource } from '@/lib/types';

const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: 'KIRAN Mental Health Helpline',
    number: '1800-599-0019',
    telLink: 'tel:18005990019',
    description: 'Government of India national helpline providing psychological support, crisis management, and referral.',
    hours: '24/7 Toll-free',
    category: 'general',
  },
  {
    name: 'AASRA Crisis & Suicide Prevention',
    number: '+91-98204-66726',
    telLink: 'tel:+919820466726',
    description: 'Confidential crisis intervention and emotional support for anyone in distress or facing suicidal feelings.',
    hours: '24 hours / 7 days a week',
    category: 'general',
  },
  {
    name: 'Vandrevala Foundation',
    number: '1860-2662-345',
    telLink: 'tel:18602662345',
    description: 'Free, compassionate mental health counseling and crisis support by trained psychologists.',
    hours: '24/7 Helpline (+91 9999 666 555 on WhatsApp)',
    category: 'general',
  },
  {
    name: 'Childline (For students under 18)',
    number: '1098',
    telLink: 'tel:1098',
    description: 'National 24-hour emergency phone service for children and adolescents needing care and protection.',
    hours: '24/7 Toll-free',
    category: 'specialized',
  },
  {
    name: "Women's Helpline",
    number: '181',
    telLink: 'tel:181',
    description: 'Toll-free 24-hour helpline providing support, counseling, and rescue for women in distress.',
    hours: '24/7 Toll-free',
    category: 'specialized',
  },
];

export default function SupportNowPage() {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Accessibility: Move focus to the main heading upon page entry for assistive technology
    headingRef.current?.focus();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-2 sm:py-6 w-full">
      {/* 1. CALM, RESPECTFUL CRISIS HEADER */}
      <div className="space-y-3 max-w-2xl">
        <div className="inline-flex items-center">
          <Badge variant="amber" size="md" dot>
            Immediate Support &amp; Crisis Helplines
          </Badge>
        </div>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#19232D] dark:text-[#F1F3EF] tracking-tight outline-none"
        >
          You do not have to navigate this alone.
        </h1>
        <p className="text-slate-700 dark:text-[#AAB6B1] text-xs sm:text-sm sm:leading-relaxed">
          If you are in immediate danger or unable to keep yourself safe, please reach out to emergency services or call a 24/7 crisis counselor below. Trained professionals are ready to listen without judgment.
        </p>
      </div>

      {/* 2. PRIMARY IMMEDIATE SUPPORT SECTION */}
      <section aria-labelledby="immediate-support-heading" className="space-y-4">
        <h2 id="immediate-support-heading" className="sr-only">
          Immediate Support Options
        </h2>

        {/* 2A. EMERGENCY CALLOUT BANNER (Warm Amber, High-Visibility) */}
        <Card
          variant="crisis"
          padding="lg"
          className="shadow-xs rounded-2xl space-y-4"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#92400E] dark:text-[#FDE68A]">
                Fastest 24/7 National Emergency Helplines
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-[#78350F] dark:text-[#FDE68A]">
                Tele-MANAS: <span className="font-mono text-[#92400E] dark:text-white">14416</span> &bull; Emergency: <span className="font-mono text-[#92400E] dark:text-white">112</span>
              </h3>
              <p className="text-xs sm:text-sm text-[#78350F] dark:text-[#FDE68A] leading-relaxed max-w-xl">
                Free, confidential mental health counseling and immediate emergency response across India.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              <a
                href="tel:14416"
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-[#D97706] dark:bg-[#E7A044] hover:bg-[#B45309] dark:hover:bg-[#F0B260] text-white dark:text-[#101817] font-bold text-sm sm:text-base shadow-2xs focus-accessible touch-target transition-colors"
              >
                <span>Call Tele-MANAS (14416)</span>
              </a>
              <a
                href="tel:112"
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-[#19232D] dark:bg-[#202B28] hover:bg-slate-800 dark:hover:bg-[#2A3733] text-white dark:text-[#F1F3EF] border border-transparent dark:border-[#34413D] font-bold text-sm sm:text-base shadow-2xs focus-accessible touch-target transition-colors"
              >
                <span>Call Emergency (112)</span>
              </a>
            </div>
          </div>
        </Card>

        {/* 2B. CAMPUS COUNSELING PATHWAY (Directly below emergency callout) */}
        <Card
          variant="interactive"
          padding="lg"
          className="border-t-3 border-t-[#0D5C56] dark:border-t-[#4FA79D] shadow-2xs space-y-3"
        >
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0D5C56] dark:text-[#4FA79D]">
              University Support
            </span>
            <h3 className="text-lg font-bold text-[#19232D] dark:text-[#F1F3EF]">
              Prefer to speak with someone from your university?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#AAB6B1] leading-relaxed max-w-2xl">
              You can connect directly with campus counseling services for dedicated, private student support.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link href="/booking">
              <Button variant="brand" size="md">
                <span>Book a Counseling Appointment</span>
                <span aria-hidden="true">&rarr;</span>
              </Button>
            </Link>
            <Link
              href="/booking/status"
              className="text-xs font-semibold text-slate-500 dark:text-[#AAB6B1] hover:text-slate-800 dark:hover:text-[#F1F3EF] transition-colors p-2"
            >
              Check Appointment Status &rarr;
            </Link>
          </div>
        </Card>
      </section>

      {/* 3. ADDITIONAL 24/7 HELPLINES DIRECTORY */}
      <section aria-labelledby="helpline-directory-heading" className="space-y-4 pt-2">
        <div className="border-b border-[#E6E4DD] dark:border-[#283632] pb-2">
          <h2 id="helpline-directory-heading" className="text-lg font-bold text-[#19232D] dark:text-[#F1F3EF]">
            Additional 24/7 Helplines
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#73827D]">
            Confidential national phone services available around the clock.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CRISIS_RESOURCES.map((resource) => (
            <Card
              key={resource.name}
              variant="default"
              padding="md"
              className="space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-[#19232D] dark:text-[#F1F3EF]">
                    {resource.name}
                  </h3>
                  <Badge variant={resource.category === 'emergency' ? 'amber' : 'neutral'} size="sm">
                    {resource.hours}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-[#AAB6B1] leading-relaxed pt-0.5">
                  {resource.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#283632] flex items-center justify-between">
                <span className="font-mono text-sm sm:text-base font-bold text-[#19232D] dark:text-[#F1F3EF]">
                  {resource.number}
                </span>
                <a
                  href={resource.telLink}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F0FDFA] dark:bg-[#142725] hover:bg-[#CCFBF1] dark:hover:bg-[#1A3734] text-[#0D5C56] dark:text-[#4FA79D] font-semibold text-xs sm:text-sm focus-accessible touch-target transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <span>Tap to Call</span>
                </a>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 4. IMMEDIATE GROUNDING GUIDANCE (While waiting) */}
      <Card variant="sage" padding="lg" className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-[#19232D] dark:text-[#F1F3EF]">
            While you reach out: Quick Grounding Steps
          </h2>
          <p className="text-xs text-slate-600 dark:text-[#AAB6B1]">
            If feelings feel intense right now, taking a brief pause can help center your attention:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="bg-white dark:bg-[#18211F] p-4 rounded-xl border border-[#E6E4DD] dark:border-[#283632] shadow-2xs">
            <span className="text-xs font-bold text-[#0D5C56] dark:text-[#4FA79D] uppercase tracking-wider">Step 1</span>
            <p className="text-xs sm:text-sm font-bold text-[#19232D] dark:text-[#F1F3EF] mt-1">Slow Rhythmic Breathing</p>
            <p className="text-xs text-slate-600 dark:text-[#AAB6B1] mt-1 leading-relaxed">
              Inhale for 4 seconds, hold for 4 seconds, exhale gently for 4 seconds.
            </p>
          </div>
          <div className="bg-white dark:bg-[#18211F] p-4 rounded-xl border border-[#E6E4DD] dark:border-[#283632] shadow-2xs">
            <span className="text-xs font-bold text-[#0D5C56] dark:text-[#4FA79D] uppercase tracking-wider">Step 2</span>
            <p className="text-xs sm:text-sm font-bold text-[#19232D] dark:text-[#F1F3EF] mt-1">Look Around You</p>
            <p className="text-xs text-slate-600 dark:text-[#AAB6B1] mt-1 leading-relaxed">
              Notice 3 things you can see, 2 things you can touch, and 1 sound you hear.
            </p>
          </div>
          <div className="bg-white dark:bg-[#18211F] p-4 rounded-xl border border-[#E6E4DD] dark:border-[#283632] shadow-2xs">
            <span className="text-xs font-bold text-[#0D5C56] dark:text-[#4FA79D] uppercase tracking-wider">Step 3</span>
            <p className="text-xs sm:text-sm font-bold text-[#19232D] dark:text-[#F1F3EF] mt-1">Speak with Someone</p>
            <p className="text-xs text-slate-600 dark:text-[#AAB6B1] mt-1 leading-relaxed">
              Reach out to a trusted friend, roommate, or one of the crisis lines above.
            </p>
          </div>
        </div>
      </Card>

      {/* 5. SAFE RETURN / NAVIGATION */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#E6E4DD] dark:border-[#283632]">
        <Link
          href="/"
          className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-[#AAB6B1] hover:text-slate-900 dark:hover:text-[#F1F3EF] underline underline-offset-2 focus-accessible p-2"
        >
          &larr; Return to Home
        </Link>
        <Link
          href="/resources"
          className="text-xs sm:text-sm font-semibold text-[#0D5C56] dark:text-[#4FA79D] hover:text-[#115E59] dark:hover:text-[#61B8AE] underline underline-offset-2 focus-accessible p-2"
        >
          Explore All Wellness &amp; Coping Tools &rarr;
        </Link>
      </div>
    </div>
  );
}
