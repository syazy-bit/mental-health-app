'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BreathingWidget } from '@/components/ui/BreathingWidget';

export default function HomePage() {
  const guidedTopics = [
    {
      category: 'Academics',
      label: 'Exam & deadline pressure',
      query: "I'm feeling completely overwhelmed with exam deadlines and pressure",
    },
    {
      category: 'Anxiety',
      label: 'Racing thoughts & panic',
      query: "I'm experiencing intense anxiety and need help calming down",
    },
    {
      category: 'Sleep',
      label: 'Sleep disruption & insomnia',
      query: "I'm having trouble sleeping because my mind won't stop racing",
    },
    {
      category: 'Energy',
      label: 'Burnout & emotional fatigue',
      query: "I feel completely burnt out and have zero energy or motivation",
    },
    {
      category: 'Decompress',
      label: 'Safe space to vent',
      query: "I just need someone to listen to what's going on without judgment",
    },
  ];

  const careTiers = [
    {
      id: 'tier1',
      tier: 'Tier 1',
      badge: 'Immediate & Automated',
      badgeVariant: 'brand' as const,
      title: 'Active Listening & Grounding',
      subtitle: '24/7 Ephemeral AI Reflection',
      desc: 'Private, real-time conversational support to deconstruct daily stress, exam anxiety, and impostor feelings. Governed by a deterministic clinical safety classifier.',
      href: '/chat',
      actionText: 'Launch Anonymous Chat',
      features: ['Zero registration required', 'Deterministic safety pre-check', 'In-memory session processing'],
    },
    {
      id: 'tier2',
      tier: 'Tier 2',
      badge: 'Standardized Instruments',
      badgeVariant: 'sage' as const,
      title: 'Clinical Self-Assessment',
      subtitle: 'PHQ-9 & GAD-7 Validated Scoring',
      desc: 'Standardized psychological screening tools measuring depressive symptom severity and generalized anxiety levels with zero diagnostic stigmatization.',
      href: '/screening',
      actionText: 'Start 2-Min Assessment',
      features: ['Kroenke PHQ-9 (9 items)', 'Spitzer GAD-7 (7 items)', 'Instant severity breakdown'],
    },
    {
      id: 'tier3',
      tier: 'Tier 3',
      badge: 'Licensed Campus Staff',
      badgeVariant: 'brand' as const,
      title: '1-on-1 Campus Counseling',
      subtitle: 'Direct Appointment Scheduling',
      desc: 'Connect with verified university mental health practitioners for scheduled confidential sessions. Uses cryptographic confirmation codes for anonymous ownership.',
      href: '/booking',
      actionText: 'Browse Available Slots',
      features: ['8-char confirmation code', 'Confidential appointment notes', 'Reschedule or cancel anytime'],
    },
    {
      id: 'tier4',
      tier: 'Tier 4',
      badge: 'Emergency & Helplines',
      badgeVariant: 'amber' as const,
      title: '24/7 Crisis Intervention',
      subtitle: 'National Toll-Free Hotlines',
      desc: 'Immediate emergency support routing for acute distress, severe trauma, or suicidal ideation. Verified direct lines to Tele-MANAS, Vandrevala, and Kiran.',
      href: '/support-now',
      actionText: 'View Emergency Numbers',
      features: ['Tele-MANAS (14416 / 1800 891 4416)', 'Vandrevala (9999 666 555)', '24/7 Toll-Free Access'],
    },
  ];

  const complianceStandards = [
    {
      title: 'Zero Data Retention',
      badge: 'Privacy Protocol',
      desc: 'Student conversations are processed ephemerally in volatile memory. No text logs, IP addresses, or student identities are ever written to disk.',
    },
    {
      title: 'Deterministic Safety Engine',
      badge: 'Clinical Safeguard',
      desc: 'Strict multi-lingual keyword and semantic classifiers intercept crisis risk before any AI generation, guaranteeing instant helpline redirection.',
    },
    {
      title: 'Standardized Clinical Metrics',
      badge: 'Evidence-Based',
      desc: 'Utilizes peer-reviewed instruments (PHQ-9 and GAD-7) with deterministic item scoring to provide clinical clarity without diagnostic labeling.',
    },
    {
      title: 'Anonymous Counselor Booking',
      badge: 'Cryptographic Key',
      desc: 'Appointments are reserved using random 8-character confirmation keys. No student email, phone number, or student ID is required.',
    },
  ];

  return (
    <div className="relative space-y-12 sm:space-y-16 py-3 sm:py-6 max-w-6xl mx-auto w-full">
      {/* Background ambient lighting blooms */}
      <div className="ambient-glow-teal top-12 left-1/4 w-96 h-96 -translate-x-1/2 opacity-60" />
      <div className="ambient-glow-amber top-36 right-1/4 w-80 h-80 translate-x-1/2 opacity-40" />

      {/* SYSTEM TELEMETRY / STATUS HEADER BAR */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-[#162220]/80 backdrop-blur-md border border-[#E8E5DC] dark:border-[#253633] text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0E5A54] dark:bg-[#57ADA3] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0E5A54] dark:bg-[#57ADA3]" />
          </span>
          <span className="font-semibold text-[#1A242B] dark:text-[#F1F5F3]">
            System Operational
          </span>
          <span className="text-[#8A9CA5] dark:text-[#6D7F7A] hidden sm:inline">&bull;</span>
          <span className="text-[#5D6E77] dark:text-[#9EAEA9] hidden sm:inline">
            Zero-Trace Anonymous Gateway Active
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[#5D6E77] dark:text-[#9EAEA9]">
          <span>Safety Engine: <strong className="text-[#0E5A54] dark:text-[#57ADA3] font-semibold">Deterministic v1.0</strong></span>
          <span>&bull;</span>
          <span>Availability: <strong className="text-[#0E5A54] dark:text-[#57ADA3] font-semibold">24/7</strong></span>
        </div>
      </div>

      {/* 1. EDITORIAL INSTITUTIONAL HERO */}
      <section className="relative z-10 text-center space-y-5 max-w-3xl mx-auto pt-2 sm:pt-6">
        <div className="inline-flex items-center justify-center">
          <Badge variant="brand" size="md" dot>
            University Student Well-being Service &bull; Anonymous Care Gateway
          </Badge>
        </div>

        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-[3.35rem] font-extrabold text-[#1A242B] dark:text-[#F1F5F3] tracking-tight leading-[1.12]">
          A structured, confidential space <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#0E5A54] via-[#126D66] to-[#456B61] dark:from-[#57ADA3] dark:via-[#69BFB5] dark:to-[#8CB1A7] bg-clip-text text-transparent">
            for your mental health.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-[#5D6E77] dark:text-[#9EAEA9] leading-relaxed max-w-2xl mx-auto font-normal">
          Access stepped-care support—from instant AI reflection and standardized clinical check-ins (PHQ-9/GAD-7) to licensed university counselor appointments and 24/7 crisis resources.
        </p>

        {/* Guided Symptom & State Capsules */}
        <div className="pt-3 space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8A9CA5] dark:text-[#6D7F7A]">
            Select a common focus area to begin:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto">
            {guidedTopics.map((topic) => (
              <Link
                key={topic.label}
                href={`/chat?starter=${encodeURIComponent(topic.query)}`}
                className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-[#162220]/90 backdrop-blur-md border border-[#E8E5DC] dark:border-[#253633] hover:border-[#0E5A54] dark:hover:border-[#57ADA3] hover:bg-[#F0F9F8] dark:hover:bg-[#142825] text-xs font-medium text-[#1A242B] dark:text-[#F1F5F3] hover:text-[#0E5A54] dark:hover:text-[#57ADA3] transition-all duration-150 shadow-2xs hover:shadow-xs active:scale-[0.98] focus-accessible"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.08] text-[#5D6E77] dark:text-[#9EAEA9]">
                  {topic.category}
                </span>
                <span>{topic.label}</span>
                <span className="text-[#8A9CA5] dark:text-[#6D7F7A] group-hover:text-[#0E5A54] dark:group-hover:text-[#57ADA3] transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                  &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 2. SOMATIC GROUNDING STATION (4-7-8 RHYTHM) */}
      <section aria-label="Somatic Grounding Station" className="relative z-10">
        <BreathingWidget />
      </section>

      {/* 3. STEPPED-CARE PATHWAY MATRIX (TIERS 1 TO 4) */}
      <section aria-labelledby="care-pathways-heading" className="relative z-10 space-y-6">
        <div className="pb-2 border-b border-[#E8E5DC] dark:border-[#253633]">
          <span className="text-xs font-bold uppercase tracking-widest text-[#0E5A54] dark:text-[#57ADA3]">
            Clinical Care Model
          </span>
          <h2 id="care-pathways-heading" className="font-heading text-2xl sm:text-3xl font-bold text-[#1A242B] dark:text-[#F1F5F3]">
            Stepped-Care Support Pathway
          </h2>
        </div>

        {/* Pathway Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {careTiers.map((tier) => (
            <Card
              key={tier.id}
              variant="interactive"
              padding="lg"
              className="flex flex-col justify-between rounded-3xl border border-[#E8E5DC] dark:border-[#253633] hover:border-[#0E5A54]/50 dark:hover:border-[#57ADA3]/50 transition-all duration-200"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#0E5A54] dark:text-[#57ADA3] bg-[#F0F9F8] dark:bg-[#142825] px-2.5 py-1 rounded-md border border-[#CEF0EB] dark:border-[#28534E]">
                    {tier.tier}
                  </span>
                  <Badge variant={tier.badgeVariant} size="sm">
                    {tier.badge}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <h3 className="font-heading text-xl font-bold text-[#1A242B] dark:text-[#F1F5F3]">
                    {tier.title}
                  </h3>
                  <p className="text-xs font-semibold text-[#5D6E77] dark:text-[#9EAEA9]">
                    {tier.subtitle}
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-[#5D6E77] dark:text-[#9EAEA9] leading-relaxed">
                  {tier.desc}
                </p>

                {/* Feature checklist */}
                <ul className="space-y-1.5 pt-2 border-t border-black/[0.04] dark:border-white/[0.05]">
                  {tier.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs text-[#5D6E77] dark:text-[#9EAEA9]">
                      <svg className="w-3.5 h-3.5 text-[#0E5A54] dark:text-[#57ADA3] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6">
                <Link href={tier.href} className="block w-full">
                  <Button
                    variant={tier.id === 'tier4' ? 'crisis' : tier.id === 'tier1' ? 'brand' : 'outline'}
                    size="md"
                    fullWidth
                    className="rounded-xl shadow-2xs hover:shadow-xs"
                  >
                    <span>{tier.actionText}</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 4. SECURITY & CLINICAL COMPLIANCE PROTOCOL SPEC */}
      <section aria-labelledby="compliance-heading" className="relative z-10 space-y-6 pt-4">
        <div className="text-center space-y-1.5 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-[#0E5A54] dark:text-[#57ADA3]">
            Security &amp; Institutional Governance
          </span>
          <h2 id="compliance-heading" className="font-heading text-2xl font-bold text-[#1A242B] dark:text-[#F1F5F3]">
            Clinical Governance &amp; Anonymity Guarantees
          </h2>
          <p className="text-xs sm:text-sm text-[#5D6E77] dark:text-[#9EAEA9]">
            Engineered from ground up to satisfy stringent institutional confidentiality and mental health safety requirements.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {complianceStandards.map((std) => (
            <div
              key={std.title}
              className="p-5 rounded-2xl bg-white/90 dark:bg-[#162220]/90 backdrop-blur-md border border-[#E8E5DC] dark:border-[#253633] shadow-2xs space-y-2.5 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0E5A54] dark:text-[#57ADA3] bg-[#F0F9F8] dark:bg-[#142825] px-2 py-0.5 rounded border border-[#CEF0EB] dark:border-[#28534E]">
                  {std.badge}
                </span>
                <h3 className="font-heading text-sm font-bold text-[#1A242B] dark:text-[#F1F5F3]">
                  {std.title}
                </h3>
                <p className="text-xs text-[#5D6E77] dark:text-[#9EAEA9] leading-relaxed">
                  {std.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-2">
          <Link
            href="/about"
            className="text-xs font-semibold text-[#0E5A54] dark:text-[#57ADA3] hover:text-[#126D66] dark:hover:text-[#69BFB5] underline underline-offset-4 focus-accessible"
          >
            Review Detailed Architecture &amp; Clinical Safety Whitepaper &rarr;
          </Link>
        </div>
      </section>

      {/* 5. 24/7 CRISIS DISPATCH NOTICE */}
      <div className="relative z-10 p-5 rounded-2xl bg-[#FFFBEB] dark:bg-[#281D10] border border-[#FDE68A] dark:border-[#5C3F1C] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-[#78350F] dark:text-[#FDE68A]">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] dark:bg-[#342410] border border-[#FDE68A] dark:border-[#5C3F1C] flex items-center justify-center shrink-0 text-[#92400E] dark:text-[#ECA347]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-[#92400E] dark:text-[#FDE68A]">
              Experiencing Acute Crisis or Severe Emotional Distress?
            </p>
            <p className="text-amber-900/90 dark:text-amber-200/90 text-xs">
              National Tele-MANAS toll-free crisis counselors are on standby 24/7: Dial <strong className="font-bold">14416</strong> or <strong className="font-bold">1800 891 4416</strong>.
            </p>
          </div>
        </div>
        <Link href="/support-now" className="shrink-0">
          <Button variant="crisis" size="sm" className="rounded-xl font-bold">
            Emergency Contacts Directory
          </Button>
        </Link>
      </div>
    </div>
  );
}
