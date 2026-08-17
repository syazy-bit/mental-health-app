import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function ScreeningHubPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <Badge variant="sage" size="md">
          Evidence-Based Self Check-in
        </Badge>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">
          Confidential Mental Health Screenings
        </h1>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Clinically validated instruments used worldwide to help you understand your emotional well-being over the past two weeks.
        </p>
      </div>

      {/* Instruments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PHQ-9 Card */}
        <Card
          variant="interactive"
          padding="lg"
          className="flex flex-col justify-between border-t-4 border-t-[#0F766E]"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0F766E] uppercase tracking-wider">
                Mood & Depression Screener
              </span>
              <Badge variant="brand" size="sm">
                9 Questions &bull; ~2 mins
              </Badge>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              PHQ-9 (Patient Health Questionnaire)
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Assesses the frequency of mood-related symptoms such as low energy, loss of interest, sleep disruption, and sadness over the past 14 days.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">What you get:</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                <li>Total symptom score (0–27)</li>
                <li>Severity band (Minimal to Severe)</li>
                <li>Actionable self-care & support steps</li>
              </ul>
            </div>
          </div>
          <div className="pt-6">
            <Link href="/screening/phq9" className="block">
              <Button variant="brand" fullWidth size="md">
                Start PHQ-9 Screener &rarr;
              </Button>
            </Link>
          </div>
        </Card>

        {/* GAD-7 Card */}
        <Card
          variant="interactive"
          padding="lg"
          className="flex flex-col justify-between border-t-4 border-t-[#52796F]"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#52796F] uppercase tracking-wider">
                Anxiety & Stress Screener
              </span>
              <Badge variant="sage" size="sm">
                7 Questions &bull; ~2 mins
              </Badge>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              GAD-7 (Generalized Anxiety Disorder)
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Measures the presence and severity of anxiety, nervousness, worry, restlessness, and tension experienced over the past 14 days.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">What you get:</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                <li>Total anxiety score (0–21)</li>
                <li>Severity classification (Minimal to Severe)</li>
                <li>Targeted anxiety reduction techniques</li>
              </ul>
            </div>
          </div>
          <div className="pt-6">
            <Link href="/screening/gad7" className="block">
              <Button variant="secondary" fullWidth size="md">
                Start GAD-7 Screener &rarr;
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Non-Diagnostic Disclaimer Box */}
      <Card variant="subtle" padding="md" className="border border-stone-200 text-xs text-slate-600 space-y-1.5">
        <p className="font-bold text-slate-800">
          Important Clinical & Privacy Notice:
        </p>
        <p>
          These screenings are self-reflection tools to help gauge your current state; they are <strong>not medical or psychiatric diagnoses</strong>. Only a licensed physician or mental health professional can provide a formal clinical diagnosis.
        </p>
        <p>
          Your individual question responses are calculated securely by the backend and discarded. Only summary metrics are associated with your anonymous session.
        </p>
      </Card>
    </div>
  );
}
