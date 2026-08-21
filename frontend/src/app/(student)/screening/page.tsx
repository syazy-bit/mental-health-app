import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function ScreeningHubPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-2 sm:py-6">
      {/* 1. EDITORIAL HEADER */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center justify-center">
          <Badge variant="sage" size="md" dot>
            Evidence-Based Self Check-in
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#19232D] tracking-tight">
          Take a moment to understand how you&rsquo;ve been feeling
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm sm:leading-relaxed max-w-xl mx-auto">
          Clinically validated self-assessments to help you gauge mood, stress, and anxiety over the last two weeks. Private, non-diagnostic, and completed in about 2 minutes.
        </p>
      </div>

      {/* 2. INSTRUMENTS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PHQ-9 Card */}
        <Card
          variant="interactive"
          padding="lg"
          className="flex flex-col justify-between border-t-3 border-t-[#0D5C56] h-full"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0D5C56] uppercase tracking-wider">
                Mood & Energy Check-in
              </span>
              <Badge variant="brand" size="sm">
                9 Questions &bull; ~2 mins
              </Badge>
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-[#19232D]">
                PHQ-9 Questionnaire
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Patient Health Questionnaire &bull; Validated Worldwide
              </p>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Assesses the frequency of mood-related symptoms such as low energy, loss of interest, sleep disruption, and sadness over the past 14 days.
            </p>
            <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#E6E4DD] text-xs text-slate-600 space-y-1.5">
              <p className="font-bold text-[#19232D]">What you will receive:</p>
              <ul className="space-y-1 text-slate-500 list-disc list-inside">
                <li>Symptom score (0–27)</li>
                <li>Severity band (Minimal to Significant)</li>
                <li>Contextual self-care recommendations</li>
              </ul>
            </div>
          </div>
          <div className="pt-6">
            <Link href="/screening/phq9" className="block">
              <Button variant="brand" fullWidth size="md">
                <span>Start PHQ-9 Check-in</span>
                <span aria-hidden="true">&rarr;</span>
              </Button>
            </Link>
          </div>
        </Card>

        {/* GAD-7 Card */}
        <Card
          variant="interactive"
          padding="lg"
          className="flex flex-col justify-between border-t-3 border-t-[#4A6B62] h-full"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#4A6B62] uppercase tracking-wider">
                Anxiety & Tension Check-in
              </span>
              <Badge variant="sage" size="sm">
                7 Questions &bull; ~2 mins
              </Badge>
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-[#19232D]">
                GAD-7 Questionnaire
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Generalized Anxiety Scale &bull; Validated Worldwide
              </p>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Measures the presence and severity of anxiety, nervousness, uncontrollable worry, restlessness, and physical tension experienced over the past 14 days.
            </p>
            <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#E6E4DD] text-xs text-slate-600 space-y-1.5">
              <p className="font-bold text-[#19232D]">What you will receive:</p>
              <ul className="space-y-1 text-slate-500 list-disc list-inside">
                <li>Anxiety score (0–21)</li>
                <li>Severity band (Minimal to Significant)</li>
                <li>Grounding & stress de-escalation tools</li>
              </ul>
            </div>
          </div>
          <div className="pt-6">
            <Link href="/screening/gad7" className="block">
              <Button variant="secondary" fullWidth size="md">
                <span>Start GAD-7 Check-in</span>
                <span aria-hidden="true">&rarr;</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* 3. NON-DIAGNOSTIC & PRIVACY DISCLOSURE */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E6E4DD] text-xs text-slate-600 space-y-1.5 shadow-2xs">
        <p className="font-bold text-[#19232D]">
          Important Medical & Privacy Notice:
        </p>
        <p className="leading-relaxed">
          These check-ins are self-reflection instruments designed to help you recognize personal patterns; they are <strong>not medical or psychiatric diagnoses</strong>. Only a licensed physician or mental health professional can provide a formal clinical evaluation.
        </p>
        <p className="leading-relaxed text-slate-500">
          Your individual questionnaire responses are calculated securely by the backend and not retained. Only summary metrics are associated with your anonymous session.
        </p>
      </div>
    </div>
  );
}
