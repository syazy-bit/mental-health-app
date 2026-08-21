import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-2 sm:py-6">
      {/* 1. EDITORIAL HEADER */}
      <div className="space-y-3">
        <Badge variant="brand" size="md" dot>
          About &amp; Privacy Architecture
        </Badge>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#19232D] tracking-tight">
          Built for Student Privacy, Safety, and Trust
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm sm:leading-relaxed max-w-2xl">
          MindBridge was created to provide timely, barrier-free emotional support and self-reflection tools for students, with uncompromising privacy and safety engineering.
        </p>
      </div>

      {/* 2. CORE ARCHITECTURAL PRINCIPLES (Monochrome SVGs, Precise Privacy Copy) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card variant="default" padding="lg" className="bg-white border border-[#E6E4DD] space-y-3">
          <div className="w-9 h-9 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center text-[#0D5C56]">
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-[#19232D]">Transient &amp; Account-Free</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Chat and self-check-ins do not require an account, email, or password. Conversations are processed in transient session memory and are never stored in persistent databases.
          </p>
        </Card>

        <Card variant="default" padding="lg" className="bg-white border border-[#E6E4DD] space-y-3">
          <div className="w-9 h-9 rounded-xl bg-[#F4F7F5] border border-[#CBD5E1] flex items-center justify-center text-[#4A6B62]">
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-[#19232D]">Anonymous-Optional Booking</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            University counseling is anonymous-optional and creates an appointment record containing only the information needed to arrange your session, managed via a private reference code.
          </p>
        </Card>

        <Card variant="default" padding="lg" className="bg-white border border-[#E6E4DD] space-y-3">
          <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-[#D97706]">
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-[#19232D]">Deterministic Safety Engine</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            A deterministic safety check screens every message. If crisis or acute harm signals are detected, the system immediately halts AI generation and guides the student to real 24/7 human helplines.
          </p>
        </Card>
      </div>

      {/* 3. SCOPE AND BOUNDARIES */}
      <Card variant="sage" padding="lg" className="bg-[#F4F7F5] border border-[#E6E4DD] space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-[#19232D]">
          What This Platform Is — And Is Not
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-700">
          <div className="bg-white p-4 rounded-xl border border-[#E6E4DD] space-y-2 shadow-2xs">
            <span className="font-bold text-[#0D5C56] uppercase tracking-wider text-xs block">
              What We Provide:
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-600 text-xs leading-relaxed">
              <li>Empathetic, non-judgmental active listening (Talk &amp; Reflect)</li>
              <li>Practical coping techniques for study stress &amp; burnout</li>
              <li>Standardized self-reflection check-ins (PHQ-9, GAD-7)</li>
              <li>Direct scheduling with campus counselors (anonymous-optional)</li>
              <li>Instant routing to verified 24/7 national crisis helplines</li>
            </ul>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#E6E4DD] space-y-2 shadow-2xs">
            <span className="font-bold text-[#D97706] uppercase tracking-wider text-xs block">
              What We Do Not Provide:
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-600 text-xs leading-relaxed">
              <li>Medical or psychiatric diagnosis</li>
              <li>Formal psychotherapy or clinical treatment</li>
              <li>Prescription medication advice or dosages</li>
              <li>Replacement for emergency medical care</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* 4. FREQUENTLY ASKED QUESTIONS */}
      <section aria-labelledby="faq-heading" className="space-y-4">
        <h2 id="faq-heading" className="text-base sm:text-lg font-bold text-[#19232D]">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          <Card variant="default" padding="md" className="bg-white border border-[#E6E4DD] space-y-1">
            <h3 className="text-xs sm:text-sm font-bold text-[#19232D]">
              Can my university or professors see what I type?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              No. There is no user authentication, account linking, IP tracking, or logging of chat content. Nothing you type in chat or check-ins can be associated with your identity or academic record.
            </p>
          </Card>

          <Card variant="default" padding="md" className="bg-white border border-[#E6E4DD] space-y-1">
            <h3 className="text-xs sm:text-sm font-bold text-[#19232D]">
              How does Talk &amp; Reflect work?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              The conversational listening tool is powered by language models governed by strict safety guardrails. It is designed to validate student experiences and suggest evidence-based self-care tools (such as mindfulness, box breathing, and sleep routines). It is not a clinical therapist.
            </p>
          </Card>

          <Card variant="default" padding="md" className="bg-white border border-[#E6E4DD] space-y-1">
            <h3 className="text-xs sm:text-sm font-bold text-[#19232D]">
              What happens if I express thoughts of self-harm?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Our deterministic safety engine immediately halts AI generation and directs you to verified 24/7 human crisis counselors (such as Tele-MANAS at 14416 and AASRA at +91-98204-66726). Your safety and access to real help is our highest priority.
            </p>
          </Card>
        </div>
      </section>

      {/* 5. CONTACT & SUPPORT LINKS */}
      <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[#E6E4DD]">
        <Link href="/chat">
          <Button variant="brand" size="md">
            <span>Start a conversation</span>
            <span aria-hidden="true">&rarr;</span>
          </Button>
        </Link>
        <Link href="/support-now">
          <Button variant="crisis" size="md">
            <span>View 24/7 Crisis Helplines</span>
            <span aria-hidden="true">&rarr;</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
