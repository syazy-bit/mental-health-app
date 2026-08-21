import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  const guidedTopics = [
    {
      label: 'Exam & academic pressure',
      query: "I'm feeling completely overwhelmed with exam deadlines and pressure",
    },
    {
      label: 'Persistent anxiety & racing thoughts',
      query: "I'm experiencing intense anxiety and need help calming down",
    },
    {
      label: 'Sleep disruption & fatigue',
      query: "I'm having trouble sleeping because my mind won't stop racing",
    },
    {
      label: 'Burnout & loss of motivation',
      query: "I feel completely burnt out and have zero energy or motivation",
    },
    {
      label: 'Need a safe space to vent',
      query: "I just need someone to listen to what's going on without judgment",
    },
  ];

  const trustPrinciples = [
    {
      icon: (
        <svg className="w-5 h-5 text-[#0D5C56]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18 8l4 4m0-4l-4 4" />
        </svg>
      ),
      title: 'Zero Account Required',
      desc: 'No registration, student ID, or password required to access chat and self-check-ins.',
    },
    {
      icon: (
        <svg className="w-5 h-5 text-[#0D5C56]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      title: 'Ephemeral Conversations',
      desc: 'Conversations are processed in-memory during your session and never stored in persistent databases.',
    },
    {
      icon: (
        <svg className="w-5 h-5 text-[#0D5C56]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'Clinical Safety Engine',
      desc: 'Deterministic safety rules instantly surface 24/7 professional crisis resources if severe distress is detected.',
    },
  ];

  return (
    <div className="space-y-12 sm:space-y-16 py-2 sm:py-6 max-w-5xl mx-auto w-full">
      {/* 1. EDITORIAL & HUMAN HERO SECTION */}
      <section className="text-center space-y-5 max-w-3xl mx-auto pt-2 sm:pt-6">
        <div className="inline-flex items-center justify-center">
          <Badge variant="brand" size="md" dot>
            Confidential Student Well-being &bull; Anonymous-First
          </Badge>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold text-[#19232D] tracking-tight leading-[1.15]">
          A quiet, confidential space <br className="hidden sm:inline" />
          <span className="text-[#0D5C56]">for your mental well-being.</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto font-normal">
          Navigate academic stress, anxiety, burnout, or daily challenges through supportive listening, clinical self-screenings, and direct university counseling.
        </p>

        {/* Guided State Prompts (Clean Typography, Zero Emojis) */}
        <div className="pt-3 space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            What&rsquo;s on your mind today?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
            {guidedTopics.map((topic) => (
              <Link
                key={topic.label}
                href={`/chat?starter=${encodeURIComponent(topic.query)}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#E6E4DD] hover:border-[#0D5C56] hover:bg-[#F0FDFA] text-xs sm:text-sm font-medium text-slate-700 hover:text-[#0D5C56] transition-all shadow-2xs hover:shadow-xs active:scale-[0.98] focus-accessible"
              >
                <span>{topic.label}</span>
                <span className="text-slate-400 group-hover:text-[#0D5C56] text-xs" aria-hidden="true">
                  &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 2. PRIMARY FLAGSHIP SANCTUARY & SUPPORTING PATHWAYS */}
      <section aria-labelledby="pathways-heading" className="space-y-6">
        <h2 id="pathways-heading" className="sr-only">
          Support Pathways
        </h2>

        {/* Flagship: Supportive Emotional Listening */}
        <Card
          variant="elevated"
          padding="none"
          className="p-6 sm:p-8 rounded-2xl border border-[#0D5C56]/20 bg-white shadow-[0_4px_20px_rgba(25,35,45,0.05)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        >
          <div className="space-y-3.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0D5C56] bg-[#F0FDFA] border border-[#CCFBF1] px-2.5 py-0.5 rounded-md">
                Available 24/7 &bull; Instant
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Private by design
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl font-bold text-[#19232D] tracking-tight">
                Supportive Emotional Listening
              </h3>
              <p className="text-xs text-slate-500">
                A private space to decompress, unpack academic worries, and explore coping techniques.
              </p>
            </div>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Talk through exam anxiety, impostor syndrome, sleep troubles, or relationship friction with an empathetic conversational assistant designed for non-clinical student support.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-semibold text-slate-400">
                Explore topics:
              </span>
              <Link
                href={`/chat?starter=${encodeURIComponent("I'm feeling burnt out and can't focus on studying")}`}
                className="text-xs px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-slate-700 transition-colors font-medium"
              >
                &ldquo;I feel burnt out&rdquo;
              </Link>
              <Link
                href={`/chat?starter=${encodeURIComponent("I just need someone to listen without judgment")}`}
                className="text-xs px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-slate-700 transition-colors font-medium"
              >
                &ldquo;Just listen to me&rdquo;
              </Link>
            </div>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            <Link href="/chat" className="block w-full md:w-auto">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                className="shadow-sm hover:shadow-md"
              >
                <span>Start Anonymous Chat</span>
                <span aria-hidden="true">&rarr;</span>
              </Button>
            </Link>
          </div>
        </Card>

        {/* Tri-Pathway Supporting Deck */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Check-in / Screening */}
          <Card
            variant="interactive"
            padding="lg"
            className="flex flex-col justify-between border-t-2 border-t-[#4A6B62] h-full"
          >
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-xl bg-[#F4F7F5] border border-[#CBD5E1] flex items-center justify-center text-[#4A6B62]">
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#19232D]">
                  Confidential Check-in
                </h3>
                <p className="text-xs font-medium text-slate-500">
                  PHQ-9 &bull; GAD-7 &bull; ~2 minutes
                </p>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Complete clinically validated self-assessments to understand your mood and anxiety levels with zero diagnostic labels.
              </p>
            </div>
            <div className="pt-5">
              <Link
                href="/screening"
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#0D5C56] hover:text-[#115E59] focus-accessible"
              >
                <span>Take a Self Check-in</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </Card>

          {/* Card 2: Campus Counseling */}
          <Card
            variant="interactive"
            padding="lg"
            className="flex flex-col justify-between border-t-2 border-t-[#0D5C56] h-full"
          >
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center text-[#0D5C56]">
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#19232D]">
                  Campus Counseling
                </h3>
                <p className="text-xs font-medium text-slate-500">
                  Licensed staff &bull; 1-on-1 Sessions
                </p>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                View available counselor appointment times and reserve university counseling sessions (anonymous-optional).
              </p>
            </div>
            <div className="pt-5 flex items-center justify-between">
              <Link
                href="/booking"
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#0D5C56] hover:text-[#115E59] focus-accessible"
              >
                <span>Meet the Counselors</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link
                href="/booking/status"
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 transition-colors"
              >
                Check Status
              </Link>
            </div>
          </Card>

          {/* Card 3: Verified Resources */}
          <Card
            variant="interactive"
            padding="lg"
            className="flex flex-col justify-between border-t-2 border-t-[#D96B4F] h-full"
          >
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-xl bg-[#FFF5F2] border border-[#FCD5CC] flex items-center justify-center text-[#D96B4F]">
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#19232D]">
                  Verified Resources
                </h3>
                <p className="text-xs font-medium text-slate-500">
                  24/7 Helplines &bull; Self-Care Guides
                </p>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Access official toll-free national helplines, somatic breathing grounding tools, and evidence-based sleep guides.
              </p>
            </div>
            <div className="pt-5">
              <Link
                href="/resources"
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#D96B4F] hover:text-[#C4573C] focus-accessible"
              >
                <span>Browse Directory</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* 3. CONFIDENTIALITY & TRUST PRINCIPLES (EDITORIAL SECTION) */}
      <section aria-labelledby="trust-heading" className="space-y-5 pt-2">
        <div className="text-center space-y-1">
          <h2 id="trust-heading" className="text-lg sm:text-xl font-bold text-[#19232D]">
            Built with Privacy & Safety at the Core
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            How we protect student identity and psychological well-being at every step.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {trustPrinciples.map((principle) => (
            <div
              key={principle.title}
              className="p-5 rounded-2xl bg-white border border-[#E6E4DD] shadow-2xs space-y-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-[#F0FDFA] flex items-center justify-center">
                {principle.icon}
              </div>
              <h3 className="text-sm font-bold text-[#19232D]">
                {principle.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {principle.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center pt-1">
          <Link
            href="/about"
            className="text-xs font-semibold text-[#0D5C56] hover:text-[#115E59] underline underline-offset-4 focus-accessible"
          >
            Read our full Privacy Architecture & Clinical Safeguards &rarr;
          </Link>
        </div>
      </section>

      {/* 4. REASSURING CRISIS NOTICE (CALM & PROFESSIONAL) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-[#78350F]">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-8 h-8 rounded-full bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center shrink-0 text-[#92400E]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-[#92400E]">
              In immediate emotional crisis or severe distress?
            </p>
            <p className="text-amber-900/90 text-xs">
              Tele-MANAS free national 24/7 helpline is available at <strong className="font-bold">14416</strong> or <strong className="font-bold">1800 891 4416</strong>.
            </p>
          </div>
        </div>
        <Link href="/support-now" className="shrink-0">
          <Button variant="crisis" size="sm">
            Emergency Contacts
          </Button>
        </Link>
      </div>
    </div>
  );
}
