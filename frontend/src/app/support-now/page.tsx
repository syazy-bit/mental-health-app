'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CrisisResource } from '@/lib/types';

const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: 'Tele-MANAS (National Helpline)',
    number: '14416',
    telLink: 'tel:14416',
    description: 'Free, confidential, 24/7 tele-mental health support across India in multiple regional languages.',
    hours: '24 hours / 7 days a week',
    category: 'emergency',
  },
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
    name: 'Emergency Services (Police / Medical)',
    number: '112',
    telLink: 'tel:112',
    description: 'National emergency response service. Call immediately if you or someone else is in immediate physical danger.',
    hours: '24/7 Immediate Dispatch',
    category: 'emergency',
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
    // Accessibility: Move focus to the main heading upon page entry
    headingRef.current?.focus();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-2">
      {/* Calm Crisis Header */}
      <div className="space-y-3">
        <Badge variant="amber" size="md">
          Immediate Support & Crisis Helplines
        </Badge>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl sm:text-3xl font-bold text-slate-900 outline-none"
        >
          You are not alone. Free, confidential help is available right now.
        </h1>
        <p className="text-slate-700 text-base sm:text-lg leading-relaxed">
          If you are feeling overwhelmed, having thoughts of harming yourself, or experiencing a crisis, please connect with a trained counselor or emergency service below. People care and are ready to listen without judgment.
        </p>
      </div>

      {/* Emergency Callout Card */}
      <Card variant="crisis" padding="md" className="border-l-8 border-l-[#D97706]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider font-bold text-[#B45309]">
              Fastest 24/7 National Emergency Helplines
            </span>
            <h2 className="text-xl font-bold text-slate-950">
              Tele-MANAS: <span className="font-mono text-[#B45309]">14416</span> or Emergency: <span className="font-mono text-[#B45309]">112</span>
            </h2>
            <p className="text-sm text-slate-800">
              Toll-free, confidential mental health counselors and emergency dispatch across India.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <a
              href="tel:14416"
              className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-base shadow-sm focus-accessible touch-target transition-colors"
            >
              Call 14416
            </a>
            <a
              href="tel:112"
              className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-base shadow-sm focus-accessible touch-target transition-colors"
            >
              Call 112
            </a>
          </div>
        </div>
      </Card>

      {/* Verified Helplines Directory */}
      <section aria-labelledby="helpline-directory-heading" className="space-y-4">
        <h2 id="helpline-directory-heading" className="text-xl font-bold text-slate-900">
          Verified 24/7 Support Helplines
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CRISIS_RESOURCES.map((resource) => (
            <Card
              key={resource.name}
              variant="default"
              padding="md"
              className="flex flex-col justify-between hover:border-amber-300 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-900 text-base">
                    {resource.name}
                  </h3>
                  <Badge variant={resource.category === 'emergency' ? 'amber' : 'neutral'} size="sm">
                    {resource.hours}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 leading-normal">
                  {resource.description}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="font-mono text-base font-bold text-slate-800">
                  {resource.number}
                </span>
                <a
                  href={resource.telLink}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#F0FDFA] hover:bg-[#CCFBF1] text-[#0F766E] font-semibold text-sm focus-accessible touch-target transition-colors"
                >
                  <svg
                    className="w-4 h-4"
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

      {/* Immediate Grounding Guidance */}
      <Card variant="sage" padding="lg" className="space-y-4">
        <h2 className="text-lg font-bold text-[#1E3A34]">
          While you reach out: Quick Grounding Technique
        </h2>
        <p className="text-sm text-slate-700">
          When feelings become intense, taking a moment to ground your body can help ease distress:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="bg-white/80 p-4 rounded-xl border border-slate-200/80">
            <span className="text-xs font-bold text-[#0F766E] uppercase">Step 1</span>
            <p className="text-sm font-semibold text-slate-800 mt-1">Slow Deep Breathing</p>
            <p className="text-xs text-slate-600 mt-1">Inhale for 4 seconds, hold for 4 seconds, exhale gently for 6 seconds.</p>
          </div>
          <div className="bg-white/80 p-4 rounded-xl border border-slate-200/80">
            <span className="text-xs font-bold text-[#0F766E] uppercase">Step 2</span>
            <p className="text-sm font-semibold text-slate-800 mt-1">Look Around You</p>
            <p className="text-xs text-slate-600 mt-1">Identify 3 things you can see, 2 things you can touch, and 1 sound you hear.</p>
          </div>
          <div className="bg-white/80 p-4 rounded-xl border border-slate-200/80">
            <span className="text-xs font-bold text-[#0F766E] uppercase">Step 3</span>
            <p className="text-sm font-semibold text-slate-800 mt-1">Reach Out</p>
            <p className="text-xs text-slate-600 mt-1">Speak with a trusted friend, family member, roommate, or one of the helplines above.</p>
          </div>
        </div>
      </Card>

      {/* Navigation Return */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <Link
          href="/"
          className="text-sm font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2 focus-accessible p-2"
        >
          &larr; Return to Home
        </Link>
        <Link
          href="/resources"
          className="text-sm font-medium text-[#0F766E] hover:text-[#115E59] underline underline-offset-2 focus-accessible p-2"
        >
          Explore All Wellness & Campus Resources &rarr;
        </Link>
      </div>
    </div>
  );
}
