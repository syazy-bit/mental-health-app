import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="space-y-3">
        <Badge variant="brand" size="md">
          About & Privacy Architecture
        </Badge>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">
          Built for Student Privacy, Safety, and Trust
        </h1>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          MindBridge was created to provide timely, barrier-free emotional support and self-reflection tools for students, with uncompromising privacy and safety engineering.
        </p>
      </div>

      {/* Core Architectural Principles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="default" padding="lg" className="space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] flex items-center justify-center text-[#0F766E] font-bold">
            🔒
          </div>
          <h2 className="text-base font-bold text-slate-900">100% Anonymous</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            No registration, email, roll number, or Google sign-in. Your session is identified by a transient handle stored in your browser session that expires when you close the tab.
          </p>
        </Card>

        <Card variant="default" padding="lg" className="space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#F4F7F5] flex items-center justify-center text-[#52796F] font-bold">
            🛡️
          </div>
          <h2 className="text-base font-bold text-slate-900">Zero Data Retention</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Neither raw chat messages nor individual questionnaire answer arrays are ever written to a permanent database. Only aggregated risk classifications and screening summary scores are kept.
          </p>
        </Card>

        <Card variant="default" padding="lg" className="space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] flex items-center justify-center text-[#D97706] font-bold">
            ⚕️
          </div>
          <h2 className="text-base font-bold text-slate-900">Safety by Design</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            A deterministic safety engine screens every message. If crisis or acute harm signals are detected, the system immediately bypasses AI generation and guides the student to real 24/7 human helplines.
          </p>
        </Card>
      </div>

      {/* Scope and Boundaries */}
      <Card variant="sage" padding="lg" className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          What This Platform Is — And Is Not
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-700">
          <div className="bg-white/80 p-4 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-[#0F766E] uppercase tracking-wider text-xs block">
              What We Provide:
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Empathetic, non-judgmental active listening</li>
              <li>Practical coping techniques for study stress & burnout</li>
              <li>Standardized self-reflection screeners (PHQ-9, GAD-7)</li>
              <li>Instant routing to verified 24/7 national helplines</li>
            </ul>
          </div>

          <div className="bg-white/80 p-4 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-[#D97706] uppercase tracking-wider text-xs block">
              What We Do Not Provide:
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Medical or psychiatric diagnosis</li>
              <li>Formal psychotherapy or clinical treatment</li>
              <li>Prescription medication advice or dosages</li>
              <li>Replacement for emergency medical care</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Frequently Asked Questions */}
      <section aria-labelledby="faq-heading" className="space-y-4">
        <h2 id="faq-heading" className="text-xl font-bold text-slate-900">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          <Card variant="default" padding="md" className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">
              Can my university or professors see what I type?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              No. There is no user authentication, account linking, IP tracking, or logging of chat content. Nothing you type can be associated with your identity or academic record.
            </p>
          </Card>

          <Card variant="default" padding="md" className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">
              How does the AI assistant work?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              The assistant is powered by private, local language models governed by strict safety guardrails. It is trained to validate student experiences and suggest evidence-based self-care tools (such as mindfulness, box breathing, and sleep routines).
            </p>
          </Card>

          <Card variant="default" padding="md" className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">
              What happens if I express thoughts of self-harm?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Our deterministic safety engine immediately halts AI generation and directs you to verified 24/7 human crisis counselors (like Tele-MANAS at 14416 and AASRA). Your safety and access to real help is our highest priority.
            </p>
          </Card>
        </div>
      </section>

      {/* Contact & Support Link */}
      <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200">
        <Link href="/chat">
          <Button variant="primary" size="md">
            Start Anonymous Chat &rarr;
          </Button>
        </Link>
        <Link href="/support-now">
          <Button variant="crisis" size="md">
            View 24/7 Crisis Helplines &rarr;
          </Button>
        </Link>
      </div>
    </div>
  );
}
