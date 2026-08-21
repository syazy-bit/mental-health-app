import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BreathingWidget } from '@/components/ui/BreathingWidget';

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
        <svg className="w-5 h-5 text-[#0E5A54] dark:text-[#57ADA3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18 8l4 4m0-4l-4 4" />
        </svg>
      ),
      title: 'Zero Account Required',
      desc: 'No registration, student ID, or password required to access chat and self-check-ins.',
    },
    {
      icon: (
        <svg className="w-5 h-5 text-[#0E5A54] dark:text-[#57ADA3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      title: 'Ephemeral Conversations',
      desc: 'Conversations are processed in-memory during your session and never stored in persistent databases.',
    },
    {
      icon: (
        <svg className="w-5 h-5 text-[#0E5A54] dark:text-[#57ADA3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'Clinical Safety Engine',
      desc: 'Deterministic safety rules instantly surface 24/7 professional crisis resources if severe distress is detected.',
    },
  ];

  return (
    <div className="relative space-y-12 sm:space-y-16 py-4 sm:py-8 max-w-5xl mx-auto w-full">
      {/* Background ambient lighting blooms */}
      <div className="ambient-glow-teal top-10 left-1/4 w-96 h-96 -translate-x-1/2 opacity-70" />
      <div className="ambient-glow-amber top-40 right-1/4 w-80 h-80 translate-x-1/2 opacity-50" />

      {/* 1. EDITORIAL & HUMAN HERO SECTION */}
      <section className="relative z-10 text-center space-y-5 max-w-3xl mx-auto pt-4 sm:pt-8">
        <div className="inline-flex items-center justify-center">
          <Badge variant="brand" size="md" dot>
            Confidential Student Well-being &bull; 100% Anonymous
          </Badge>
        </div>

        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] font-extrabold text-[#1A242B] dark:text-[#F1F5F3] tracking-tight leading-[1.12]">
          A quiet, gentle space <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#0E5A54] via-[#126D66] to-[#456B61] dark:from-[#57ADA3] dark:via-[#69BFB5] dark:to-[#8CB1A7] bg-clip-text text-transparent">
            for your mental well-being.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-[#5D6E77] dark:text-[#9EAEA9] leading-relaxed max-w-2xl mx-auto font-normal">
          Unpack academic stress, racing thoughts, burnout, or everyday challenges through empathetic listening, clinical check-ins, and university counseling.
        </p>

        {/* Guided State Prompts */}
        <div className="pt-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8A9CA5] dark:text-[#6D7F7A]">
            What is on your mind today?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
            {guidedTopics.map((topic) => (
              <Link
                key={topic.label}
                href={`/chat?starter=${encodeURIComponent(topic.query)}`}
                className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 dark:bg-[#162220]/90 backdrop-blur-md border border-[#E8E5DC] dark:border-[#253633] hover:border-[#0E5A54] dark:hover:border-[#57ADA3] hover:bg-[#F0F9F8] dark:hover:bg-[#142825] text-xs sm:text-sm font-medium text-[#1A242B] dark:text-[#F1F5F3] hover:text-[#0E5A54] dark:hover:text-[#57ADA3] transition-all duration-200 shadow-xs hover:shadow-sm active:scale-[0.98] focus-accessible"
              >
                <span>{topic.label}</span>
                <span className="text-[#8A9CA5] dark:text-[#6D7F7A] group-hover:text-[#0E5A54] dark:group-hover:text-[#57ADA3] transition-transform group-hover:translate-x-0.5 text-xs" aria-hidden="true">
                  &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 2. INSTANT SOMATIC RELIEF: 4-7-8 BREATHING WIDGET */}
      <section aria-label="Quick Grounding Exercise" className="relative z-10">
        <BreathingWidget />
      </section>

      {/* 3. PRIMARY FLAGSHIP SANCTUARY & SUPPORTING PATHWAYS */}
      <section aria-labelledby="pathways-heading" className="relative z-10 space-y-6">
        <h2 id="pathways-heading" className="sr-only">
          Support Pathways
        </h2>

        {/* Flagship: Supportive Emotional Listening */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-white via-white to-[#F0F9F8] dark:from-[#162220] dark:via-[#162220] dark:to-[#142825] border border-[#0E5A54]/25 dark:border-[#57ADA3]/25 shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0E5A54] dark:text-[#57ADA3] bg-[#CEF0EB]/60 dark:bg-[#193834] border border-[#9DE0D6] dark:border-[#2B5751] px-2.5 py-0.5 rounded-full">
                Available 24/7 &bull; Instant Support
              </span>
              <span className="text-xs text-[#8A9CA5] dark:text-[#6D7F7A] font-medium">
                End-to-End Anonymous
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="font-heading text-2xl sm:text-3xl font-bold text-[#1A242B] dark:text-[#F1F5F3] tracking-tight">
                Supportive Emotional Listening
              </h3>
              <p className="text-xs text-[#5D6E77] dark:text-[#9EAEA9]">
                A safe, judgment-free space to decompress, unpack academic worries, and explore coping techniques.
              </p>
            </div>

            <p className="text-sm sm:text-base text-[#5D6E77] dark:text-[#9EAEA9] leading-relaxed">
              Talk through exam anxiety, impostor syndrome, sleep troubles, or relationship friction with an empathetic conversational companion guided by strict clinical safety boundaries.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-semibold text-[#8A9CA5] dark:text-[#6D7F7A]">
                Try asking:
              </span>
              <Link
                href={`/chat?starter=${encodeURIComponent("I'm feeling burnt out and can't focus on studying")}`}
                className="text-xs px-3 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-[#1A242B] dark:text-[#F1F5F3] transition-colors font-medium"
              >
                &ldquo;I feel burnt out&rdquo;
              </Link>
              <Link
                href={`/chat?starter=${encodeURIComponent("I just need someone to listen without judgment")}`}
                className="text-xs px-3 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-[#1A242B] dark:text-[#F1F5F3] transition-colors font-medium"
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
                className="rounded-full shadow-sm hover:shadow-md transition-all duration-200"
              >
                <span>Start Anonymous Chat</span>
                <span aria-hidden="true">&rarr;</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Tri-Pathway Supporting Deck */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Check-in / Screening */}
          <Card
            variant="interactive"
            padding="lg"
            className="flex flex-col justify-between rounded-3xl border border-[#E8E5DC] dark:border-[#253633] border-t-4 border-t-[#456B61] dark:border-t-[#8CB1A7] hover:-translate-y-1 transition-transform duration-200 h-full"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#F1F6F4] dark:bg-[#162420] border border-[#CAD8D1] dark:border-[#2E4740] flex items-center justify-center text-[#456B61] dark:text-[#8CB1A7]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="font-heading text-lg font-bold text-[#1A242B] dark:text-[#F1F5F3]">
                  Confidential Check-in
                </h3>
                <p className="text-xs font-medium text-[#5D6E77] dark:text-[#9EAEA9]">
                  PHQ-9 &bull; GAD-7 &bull; ~2 minutes
                </p>
              </div>
              <p className="text-xs sm:text-sm text-[#5D6E77] dark:text-[#9EAEA9] leading-relaxed">
                Complete clinically validated self-assessments to understand your mood and anxiety levels with zero diagnostic labels.
              </p>
            </div>
            <div className="pt-5">
              <Link
                href="/screening"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#0E5A54] dark:text-[#57ADA3] hover:text-[#126D66] dark:hover:text-[#69BFB5] focus-accessible"
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
            className="flex flex-col justify-between rounded-3xl border border-[#E8E5DC] dark:border-[#253633] border-t-4 border-t-[#0E5A54] dark:border-t-[#57ADA3] hover:-translate-y-1 transition-transform duration-200 h-full"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#F0F9F8] dark:bg-[#142825] border border-[#CEF0EB] dark:border-[#2B5751] flex items-center justify-center text-[#0E5A54] dark:text-[#57ADA3]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="font-heading text-lg font-bold text-[#1A242B] dark:text-[#F1F5F3]">
                  Campus Counseling
                </h3>
                <p className="text-xs font-medium text-[#5D6E77] dark:text-[#9EAEA9]">
                  Licensed staff &bull; 1-on-1 Sessions
                </p>
              </div>
              <p className="text-xs sm:text-sm text-[#5D6E77] dark:text-[#9EAEA9] leading-relaxed">
                View available counselor appointment times and reserve university counseling sessions (anonymous-optional).
              </p>
            </div>
            <div className="pt-5 flex items-center justify-between">
              <Link
                href="/booking"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#0E5A54] dark:text-[#57ADA3] hover:text-[#126D66] dark:hover:text-[#69BFB5] focus-accessible"
              >
                <span>Meet Counselors</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link
                href="/booking/status"
                className="text-[11px] font-semibold text-[#8A9CA5] dark:text-[#6D7F7A] hover:text-[#1A242B] dark:hover:text-[#F1F5F3] transition-colors"
              >
                Check Status
              </Link>
            </div>
          </Card>

          {/* Card 3: Verified Resources */}
          <Card
            variant="interactive"
            padding="lg"
            className="flex flex-col justify-between rounded-3xl border border-[#E8E5DC] dark:border-[#253633] border-t-4 border-t-[#CE674D] dark:border-t-[#E58A73] hover:-translate-y-1 transition-transform duration-200 h-full"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FDF5F2] dark:bg-[#2A1D1A] border border-[#F7D4CA] dark:border-[#563932] flex items-center justify-center text-[#CE674D] dark:text-[#E58A73]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="font-heading text-lg font-bold text-[#1A242B] dark:text-[#F1F5F3]">
                  Verified Resources
                </h3>
                <p className="text-xs font-medium text-[#5D6E77] dark:text-[#9EAEA9]">
                  24/7 Helplines &bull; Self-Care Guides
                </p>
              </div>
              <p className="text-xs sm:text-sm text-[#5D6E77] dark:text-[#9EAEA9] leading-relaxed">
                Access official toll-free national helplines, somatic breathing grounding tools, and evidence-based sleep guides.
              </p>
            </div>
            <div className="pt-5">
              <Link
                href="/resources"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#CE674D] dark:text-[#E58A73] hover:text-[#B9573E] dark:hover:text-[#F09B85] focus-accessible"
              >
                <span>Browse Directory</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* 4. CONFIDENTIALITY & TRUST PRINCIPLES */}
      <section aria-labelledby="trust-heading" className="relative z-10 space-y-6 pt-2">
        <div className="text-center space-y-1.5">
          <h2 id="trust-heading" className="font-heading text-xl sm:text-2xl font-bold text-[#1A242B] dark:text-[#F1F5F3]">
            Built with Privacy &amp; Psychological Safety at Core
          </h2>
          <p className="text-xs sm:text-sm text-[#5D6E77] dark:text-[#9EAEA9]">
            How we protect student identity and psychological well-being at every single step.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {trustPrinciples.map((principle) => (
            <div
              key={principle.title}
              className="p-5 rounded-3xl bg-white/90 dark:bg-[#162220]/90 backdrop-blur-md border border-[#E8E5DC] dark:border-[#253633] shadow-xs space-y-3"
            >
              <div className="w-9 h-9 rounded-xl bg-[#F0F9F8] dark:bg-[#142825] flex items-center justify-center">
                {principle.icon}
              </div>
              <h3 className="font-heading text-sm font-bold text-[#1A242B] dark:text-[#F1F5F3]">
                {principle.title}
              </h3>
              <p className="text-xs text-[#5D6E77] dark:text-[#9EAEA9] leading-relaxed">
                {principle.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center pt-2">
          <Link
            href="/about"
            className="text-xs font-semibold text-[#0E5A54] dark:text-[#57ADA3] hover:text-[#126D66] dark:hover:text-[#69BFB5] underline underline-offset-4 focus-accessible"
          >
            Read our full Privacy Architecture &amp; Clinical Safeguards &rarr;
          </Link>
        </div>
      </section>

      {/* 5. REASSURING CRISIS NOTICE */}
      <div className="relative z-10 p-5 rounded-3xl bg-[#FFFBEB] dark:bg-[#281D10] border border-[#FDE68A] dark:border-[#5C3F1C] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-[#78350F] dark:text-[#FDE68A]">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-9 h-9 rounded-2xl bg-[#FEF3C7] dark:bg-[#342410] border border-[#FDE68A] dark:border-[#5C3F1C] flex items-center justify-center shrink-0 text-[#92400E] dark:text-[#ECA347]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-[#92400E] dark:text-[#FDE68A]">
              In immediate emotional crisis or severe distress?
            </p>
            <p className="text-amber-900/90 dark:text-amber-200/90 text-xs">
              Tele-MANAS free national 24/7 helpline is available at <strong className="font-bold">14416</strong> or <strong className="font-bold">1800 891 4416</strong>.
            </p>
          </div>
        </div>
        <Link href="/support-now" className="shrink-0">
          <Button variant="crisis" size="sm" className="rounded-full">
            Emergency Contacts
          </Button>
        </Link>
      </div>
    </div>
  );
}
