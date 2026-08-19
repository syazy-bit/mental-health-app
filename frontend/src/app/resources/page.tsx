'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState<'crisis' | 'counseling' | 'wellbeing'>('crisis');

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="space-y-3">
        <Badge variant="brand" size="md">
          Support & Mental Well-being Directory
        </Badge>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">
          Mental Health Resources for Students
        </h1>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Explore verified 24/7 crisis lines, professional student counseling guidance, and evidence-based self-care coping tools.
        </p>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Resource categories"
        className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-px"
      >
        <button
          role="tab"
          aria-selected={activeTab === 'crisis'}
          onClick={() => setActiveTab('crisis')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap focus-accessible cursor-pointer ${
            activeTab === 'crisis'
              ? 'border-[#D97706] text-[#B45309]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          1. Immediate & Crisis Helplines
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'counseling'}
          onClick={() => setActiveTab('counseling')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap focus-accessible cursor-pointer ${
            activeTab === 'counseling'
              ? 'border-[#0F766E] text-[#0F766E]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          2. Counseling & Professional Support
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'wellbeing'}
          onClick={() => setActiveTab('wellbeing')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap focus-accessible cursor-pointer ${
            activeTab === 'wellbeing'
              ? 'border-[#0F766E] text-[#0F766E]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          3. Everyday Wellbeing & Tools
        </button>
      </div>

      {/* Tab 1: Crisis Helplines */}
      {activeTab === 'crisis' && (
        <section className="space-y-6" aria-label="Crisis Helplines">
          <Card variant="crisis" padding="md" className="space-y-2 border-l-8 border-l-[#D97706]">
            <h2 className="text-lg font-bold text-amber-950">
              Need immediate help? Free, confidential support is available 24/7.
            </h2>
            <p className="text-xs sm:text-sm text-amber-900">
              You can call or text trained crisis counselors anytime across India. Calls are anonymous and toll-free.
            </p>
            <div className="pt-2">
              <Link href="/support-now">
                <Button variant="crisis" size="sm">
                  View Emergency Support Screen &rarr;
                </Button>
              </Link>
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card variant="default" padding="md" className="space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-900 text-base">Tele-MANAS</h3>
                <Badge variant="amber" size="sm">24/7 Free</Badge>
              </div>
              <p className="text-xs text-slate-600">
                Government of India national tele-mental health programme. Available in English, Hindi, and regional languages.
              </p>
              <div className="pt-2 flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-slate-800">14416</span>
                <a href="tel:14416" className="text-xs font-bold text-[#0F766E] hover:underline p-1">
                  Call Now &rarr;
                </a>
              </div>
            </Card>

            <Card variant="default" padding="md" className="space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-900 text-base">KIRAN Helpline</h3>
                <Badge variant="neutral" size="sm">24/7 Toll-free</Badge>
              </div>
              <p className="text-xs text-slate-600">
                Ministry of Social Justice 24/7 helpline for anxiety, stress, depression, and mental health emergencies.
              </p>
              <div className="pt-2 flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-slate-800">1800-599-0019</span>
                <a href="tel:18005990019" className="text-xs font-bold text-[#0F766E] hover:underline p-1">
                  Call Now &rarr;
                </a>
              </div>
            </Card>

            <Card variant="default" padding="md" className="space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-900 text-base">AASRA</h3>
                <Badge variant="neutral" size="sm">24/7 Suicide Prevention</Badge>
              </div>
              <p className="text-xs text-slate-600">
                Non-judgmental, confidential emotional support and suicide prevention intervention.
              </p>
              <div className="pt-2 flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-slate-800">+91-98204-66726</span>
                <a href="tel:+919820466726" className="text-xs font-bold text-[#0F766E] hover:underline p-1">
                  Call Now &rarr;
                </a>
              </div>
            </Card>

            <Card variant="default" padding="md" className="space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-900 text-base">Vandrevala Foundation</h3>
                <Badge variant="neutral" size="sm">24/7 Support</Badge>
              </div>
              <p className="text-xs text-slate-600">
                Free professional mental health counseling by experienced clinical psychologists.
              </p>
              <div className="pt-2 flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-slate-800">1860-2662-345</span>
                <a href="tel:18602662345" className="text-xs font-bold text-[#0F766E] hover:underline p-1">
                  Call Now &rarr;
                </a>
              </div>
            </Card>
          </div>
        </section>
      )}

      {/* Tab 2: Counseling & Professional Support */}
      {activeTab === 'counseling' && (
        <section className="space-y-6" aria-label="Counseling Guidance">
          <Card variant="default" padding="lg" className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              Campus Counseling & Institutional Support
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Most universities and colleges provide dedicated student counseling cells or wellness centers with licensed psychologists.
            </p>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs text-slate-600">
              <p className="font-bold text-slate-800 uppercase tracking-wide">
                Book an appointment
              </p>
              <p>
                You can meet the university counseling team and request a
                confidential appointment directly through MindBridge.
              </p>
              <div className="pt-1">
                <Link href="/booking">
                  <Button variant="secondary" size="sm">
                    Meet the team & book a time &rarr;
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          <Card variant="sage" padding="lg" className="space-y-3">
            <h3 className="text-base font-bold text-slate-900">
              What to Expect in Your First Counseling Session
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700 pt-2">
              <div className="bg-white/80 p-3.5 rounded-xl border border-slate-200">
                <span className="font-bold text-[#0F766E] block mb-1">1. Confidentiality</span>
                Sessions are confidential and will not appear on your academic transcript or grade report.
              </div>
              <div className="bg-white/80 p-3.5 rounded-xl border border-slate-200">
                <span className="font-bold text-[#0F766E] block mb-1">2. Collaborative</span>
                You set the agenda. The counselor helps you identify patterns and build coping mechanisms.
              </div>
              <div className="bg-white/80 p-3.5 rounded-xl border border-slate-200">
                <span className="font-bold text-[#0F766E] block mb-1">3. Non-Judgmental</span>
                No feeling is too small. Academic stress, relationship challenges, or loneliness are all valid topics.
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Tab 3: Everyday Wellbeing */}
      {activeTab === 'wellbeing' && (
        <section className="space-y-6" aria-label="Everyday Wellbeing">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box Breathing */}
            <Card variant="default" padding="lg" className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">🫁</span>
                <h3 className="font-bold text-slate-900 text-base">Box Breathing (4-4-4-4)</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Used by students and professionals to rapidly reset the autonomic nervous system during acute panic or exam anxiety.
              </p>
              <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1.5 pt-1">
                <li>Inhale slowly through your nose for <strong>4 seconds</strong></li>
                <li>Hold your breath gently for <strong>4 seconds</strong></li>
                <li>Exhale smoothly through your mouth for <strong>4 seconds</strong></li>
                <li>Hold empty for <strong>4 seconds</strong></li>
                <li>Repeat for 3–4 cycles</li>
              </ol>
            </Card>

            {/* 5-4-3-2-1 Grounding */}
            <Card variant="default" padding="lg" className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">👁️</span>
                <h3 className="font-bold text-slate-900 text-base">5-4-3-2-1 Sensory Grounding</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pulls your mind out of spiraling thoughts back into the present physical environment.
              </p>
              <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 pt-1">
                <li><strong>5 things</strong> you can see around the room</li>
                <li><strong>4 things</strong> you can physically touch/feel</li>
                <li><strong>3 things</strong> you can hear right now</li>
                <li><strong>2 things</strong> you can smell</li>
                <li><strong>1 thing</strong> you can taste or positive affirmation</li>
              </ul>
            </Card>

            {/* Sleep Hygiene */}
            <Card variant="default" padding="lg" className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">🌙</span>
                <h3 className="font-bold text-slate-900 text-base">Student Sleep Hygiene</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sleep quality directly impacts memory consolidation and emotional resilience during exams.
              </p>
              <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 pt-1">
                <li>Keep a fixed wake-up time even on weekends</li>
                <li>Avoid screens and high-stimulus study 30m before sleep</li>
                <li>Keep caffeine consumption before 2:00 PM</li>
                <li>Reserve your bed for sleep rather than laptop studying</li>
              </ul>
            </Card>

            {/* Study Break Strategy */}
            <Card variant="default" padding="lg" className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">⏱️</span>
                <h3 className="font-bold text-slate-900 text-base">Pomodoro & Deliberate Rest</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Prevents academic burnout by alternating intense focus with genuine cognitive rest.
              </p>
              <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 pt-1">
                <li>25 minutes focused study on a single topic</li>
                <li>5 minutes physical break (stretch, drink water, no social media)</li>
                <li>After 4 cycles, take a longer 20–30 minute walk or meal</li>
              </ul>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}
