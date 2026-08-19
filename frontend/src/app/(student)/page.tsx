import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  const starterPrompts = [
    { text: "I'm feeling overwhelmed with exam pressure", topic: 'exam-stress' },
    { text: "I'm having trouble sleeping because my mind is racing", topic: 'sleep' },
    { text: "I feel burnt out and can't focus on studying", topic: 'burnout' },
    { text: "I just need someone to listen without judgment", topic: 'vent' },
  ];

  return (
    <div className="space-y-10 py-4 max-w-5xl mx-auto">
      {/* Hero Section */}
      <section className="text-center space-y-4 max-w-3xl mx-auto pt-4">
        <Badge variant="brand" size="md">
          Student Mental Well-being &bull; 100% Anonymous
        </Badge>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
          A safe, confidential space for your emotional well-being.
        </h1>
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Navigate academic stress, anxiety, burnout, or daily challenges with empathetic AI support, clinical self-screenings, verified support resources, and one-to-one university counseling.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/chat">
            <Button variant="primary" size="lg">
              Start Anonymous Chat &rarr;
            </Button>
          </Link>
          <Link href="/booking">
            <Button variant="brand" size="lg">
              University Counseling &rarr;
            </Button>
          </Link>
          <Link href="/screening">
            <Button variant="secondary" size="lg">
              Take a Self Check-in
            </Button>
          </Link>
        </div>
      </section>

      {/* Three Core Pathways */}
      <section aria-labelledby="pathways-heading" className="space-y-4">
        <h2 id="pathways-heading" className="sr-only">
          Support Pathways
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pathway 1: Chat */}
          <Card
            variant="interactive"
            padding="lg"
            className="flex flex-col justify-between border-t-4 border-t-[#0F766E]"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F0FDFA] flex items-center justify-center text-[#0F766E]">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Emotional Support Chat
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Talk through thoughts, vent safely, or receive personalized coping exercises for exam anxiety, loneliness, and sleep hygiene.
              </p>
            </div>
            <div className="pt-6">
              <Link href="/chat" className="inline-flex items-center text-sm font-bold text-[#0F766E] hover:underline focus-accessible">
                Talk to Assistant &rarr;
              </Link>
            </div>
          </Card>

          {/* Pathway 2: Screening */}
          <Card
            variant="interactive"
            padding="lg"
            className="flex flex-col justify-between border-t-4 border-t-[#52796F]"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F4F7F5] flex items-center justify-center text-[#52796F]">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Confidential Check-in
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Complete evidence-based PHQ-9 (mood) and GAD-7 (anxiety) screeners to gain clarity on your symptoms with zero diagnostic labels.
              </p>
            </div>
            <div className="pt-6">
              <Link href="/screening" className="inline-flex items-center text-sm font-bold text-[#52796F] hover:underline focus-accessible">
                Start Screening (2 min) &rarr;
              </Link>
            </div>
          </Card>

          {/* Pathway 3: University Counseling */}
          <Card
            variant="interactive"
            padding="lg"
            className="flex flex-col justify-between border-t-4 border-t-[#0F766E]"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F0FDFA] flex items-center justify-center text-[#0F766E]">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                University Counseling
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Meet the counseling team and book a confidential appointment time that fits your schedule.
              </p>
            </div>
            <div className="pt-6">
              <Link href="/booking" className="inline-flex items-center text-sm font-bold text-[#0F766E] hover:underline focus-accessible">
                Meet the team &rarr;
              </Link>
            </div>
          </Card>

          {/* Pathway 4: Resources */}
          <Card
            variant="interactive"
            padding="lg"
            className="flex flex-col justify-between border-t-4 border-t-[#E07A5F]"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF5F2] flex items-center justify-center text-[#E07A5F]">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Verified Resources
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Access 24/7 free national helplines, university counseling directories, and practical self-care guides designed for students.
              </p>
            </div>
            <div className="pt-6">
              <Link href="/resources" className="inline-flex items-center text-sm font-bold text-[#E07A5F] hover:underline focus-accessible">
                Browse Resources &rarr;
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* Starter Prompts Section */}
      <section aria-labelledby="starters-heading" className="space-y-3 pt-2">
        <h2 id="starters-heading" className="text-lg font-bold text-slate-800">
          Not sure where to begin? Try one of these:
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {starterPrompts.map((prompt) => (
            <Link
              key={prompt.topic}
              href={`/chat?starter=${encodeURIComponent(prompt.text)}`}
              className="p-4 rounded-xl bg-white border border-slate-200 hover:border-[#0F766E] hover:bg-[#F0FDFA]/50 transition-all text-sm font-medium text-slate-700 flex items-center justify-between group focus-accessible"
            >
              <span>&ldquo;{prompt.text}&rdquo;</span>
              <span className="text-[#0F766E] font-bold group-hover:translate-x-1 transition-transform">
                &rarr;
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Privacy Architecture Guarantee Banner */}
      <Card variant="subtle" padding="lg" className="border border-stone-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-slate-700">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="font-bold text-slate-900 text-base">
              Privacy-by-Design & Zero Registration
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-normal">
              You are completely anonymous. No student ID, name, email, or password is ever required. Messages and individual questionnaire answers are processed in memory and never stored in persistent databases.
            </p>
          </div>
          <Link
            href="/about"
            className="text-xs font-semibold text-[#0F766E] underline hover:text-[#115E59] focus-accessible shrink-0"
          >
            How Privacy Works &rarr;
          </Link>
        </div>
      </Card>
    </div>
  );
}
