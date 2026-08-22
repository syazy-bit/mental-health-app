'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ResetIllustration } from '@/components/illustrations/ResetIllustration';
import { MeditationIllustration } from '@/components/illustrations/MeditationIllustration';
import { BotanicalVaseIllustration } from '@/components/illustrations/BotanicalVaseIllustration';
import {
  MoodOkayIcon,
  MoodAnxiousIcon,
  MoodStressedIcon,
  MoodDrainedIcon,
  MoodLowIcon,
  AcademicPressureIcon,
  AnxietyTopicIcon,
  SleepTopicIcon,
  BurnoutTopicIcon,
  NeedToTalkTopicIcon,
  ChatBubblePathwayIcon,
  AssessmentClipboardIcon,
  ProfessionalSupportIcon,
  ImmediateHelpPhoneIcon,
  AnonymousShieldIcon,
  LockKeyholeIcon,
  NoJudgmentHeartShieldIcon,
  GentleHandsIcon,
} from '@/components/illustrations/MindBridgeIcons';
import { BreathingWidget } from '@/components/ui/BreathingWidget';

export default function HomePage() {
  const router = useRouter();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showBreathing, setShowBreathing] = useState(false);

  const moods = [
    {
      id: 'okay',
      label: 'Okay',
      desc: "I'm doing alright",
      icon: <MoodOkayIcon className="w-10 h-10" />,
      starter: "I'm doing alright today, just checking in and exploring tools for maintaining balance.",
    },
    {
      id: 'anxious',
      label: 'Anxious',
      desc: 'Feeling worried or overwhelmed',
      icon: <MoodAnxiousIcon className="w-10 h-10" />,
      starter: "I'm feeling worried and overwhelmed right now. Can we talk through what's making me anxious?",
    },
    {
      id: 'stressed',
      label: 'Stressed',
      desc: 'Pressure, deadlines or tension',
      icon: <MoodStressedIcon className="w-10 h-10" />,
      starter: "I am feeling a lot of pressure from deadlines and academic stress. I'd like help breaking it down.",
    },
    {
      id: 'drainout',
      label: 'Drainout',
      desc: 'Mentally and physically tired',
      icon: <MoodDrainedIcon className="w-10 h-10" />,
      starter: "I'm completely drained and exhausted mentally and physically. I need gentle guidance to recover.",
    },
    {
      id: 'low',
      label: 'Low',
      desc: 'Feeling down or hopeless',
      icon: <MoodLowIcon className="w-10 h-10" />,
      starter: "I've been feeling quite low and unmotivated lately. I need a compassionate, quiet space to reflect.",
    },
  ];

  const topics = [
    {
      title: 'Academic pressure',
      desc: 'Exams, deadlines & expectations',
      icon: <AcademicPressureIcon className="w-7 h-7 text-[#204E3F] dark:text-[#A3C9A8]" />,
      href: '/chat?starter=' + encodeURIComponent('I am struggling with academic pressure, exam anxiety, and heavy workload.'),
    },
    {
      title: 'Anxiety',
      desc: 'Racing thoughts & panic',
      icon: <AnxietyTopicIcon className="w-7 h-7 text-[#204E3F] dark:text-[#A3C9A8]" />,
      href: '/chat?starter=' + encodeURIComponent('I have racing thoughts and feel panic creeping in. Can you help me ground myself?'),
    },
    {
      title: 'Sleep',
      desc: 'Rest, routine & insomnia',
      icon: <SleepTopicIcon className="w-7 h-7 text-[#204E3F] dark:text-[#A3C9A8]" />,
      href: '/resources',
    },
    {
      title: 'Burnout',
      desc: 'Exhaustion & emotional fatigue',
      icon: <BurnoutTopicIcon className="w-7 h-7 text-[#204E3F] dark:text-[#A3C9A8]" />,
      href: '/screening',
    },
    {
      title: 'Just need to talk',
      desc: 'A safe space to let it out',
      icon: <NeedToTalkTopicIcon className="w-7 h-7 text-[#C76D54] dark:text-[#EAA08C]" />,
      href: '/chat',
    },
  ];

  const pathwaySteps = [
    {
      num: '01',
      title: 'Talk & Reflect',
      desc: 'Private space with AI-guided reflection',
      icon: <ChatBubblePathwayIcon className="w-5 h-5 text-[#204E3F] dark:text-[#A3C9A8]" />,
      bg: 'bg-[#E3EEE7] dark:bg-[#1C2F27]',
      href: '/chat',
    },
    {
      num: '02',
      title: 'Self-Assessment',
      desc: 'PHQ-9 / GAD-7 self-assessments',
      icon: <AssessmentClipboardIcon className="w-5 h-5 text-[#D97706] dark:text-[#FBBF24]" />,
      bg: 'bg-[#FEF3C7] dark:bg-[#32230E]',
      href: '/screening',
    },
    {
      num: '03',
      title: 'Professional Support',
      desc: 'Connect with licensed university counselors',
      icon: <ProfessionalSupportIcon className="w-5 h-5 text-[#204E3F] dark:text-[#A3C9A8]" />,
      bg: 'bg-[#E3EEE7] dark:bg-[#1C2F27]',
      href: '/booking',
    },
    {
      num: '04',
      title: 'Immediate Help',
      desc: '24/7 crisis resources when you need it',
      icon: <ImmediateHelpPhoneIcon className="w-5 h-5 text-[#C76D54] dark:text-[#F87171]" />,
      bg: 'bg-[#FFE4E6] dark:bg-[#34181E]',
      href: '/support-now',
    },
  ];

  const trustBadges = [
    {
      title: 'Anonymous by design',
      desc: 'We collect the minimum necessary. You stay in control.',
      icon: <AnonymousShieldIcon className="w-5 h-5 text-[#204E3F] dark:text-[#A3C9A8]" />,
    },
    {
      title: 'Private & secure',
      desc: 'Encryption, zero-trace gateway & strict data protection.',
      icon: <LockKeyholeIcon className="w-5 h-5 text-[#204E3F] dark:text-[#A3C9A8]" />,
    },
    {
      title: 'No judgment',
      desc: 'A safe, welcoming space for every student.',
      icon: <NoJudgmentHeartShieldIcon className="w-5 h-5 text-[#204E3F] dark:text-[#A3C9A8]" />,
    },
    {
      title: "You're not alone",
      desc: 'Support is available, whenever you need it.',
      icon: <GentleHandsIcon className="w-5 h-5 text-[#204E3F] dark:text-[#A3C9A8]" />,
    },
  ];

  const handleStartWithMood = () => {
    if (!selectedMood) {
      router.push('/chat');
      return;
    }
    const moodObj = moods.find((m) => m.id === selectedMood);
    if (moodObj) {
      router.push(`/chat?starter=${encodeURIComponent(moodObj.starter)}`);
    } else {
      router.push('/chat');
    }
  };

  return (
    <div className="space-y-10 sm:space-y-14 py-2 sm:py-4 max-w-5xl mx-auto w-full">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden rounded-3xl bg-[#FAF6F0]/90 dark:bg-[#16231E]/90 border border-[#ECE5D8] dark:border-[#263730] p-6 sm:p-8 md:p-10 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center relative z-10">
          {/* Left Column: Typography & CTAs */}
          <div className="md:col-span-7 space-y-5 text-center md:text-left">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-medium bg-[#E8F0EA] dark:bg-[#1F3329] text-[#1E4D3D] dark:text-[#A8CEB1] border border-[#D5E3D8] dark:border-[#2D493B]">
              <span>University Student Well-being Service</span>
              <span className="opacity-60">&bull;</span>
              <span>Anonymous Care Gateway</span>
            </div>

            {/* Headline */}
            <h1 className="space-y-1">
              <span className="block font-serif text-3xl sm:text-4xl lg:text-5xl text-[#182C24] dark:text-[#F3F7F5] font-bold tracking-tight leading-[1.12]">
                Start where you are.
              </span>
              <span className="block font-serif text-3xl sm:text-4xl lg:text-5xl text-[#184D3D] dark:text-[#7EA68E] font-bold tracking-tight leading-[1.12]">
                Find your next step.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-[#5C7067] dark:text-[#A3B8AF] font-normal leading-relaxed max-w-lg">
              A private space to reflect, understand how you&apos;re feeling, and connect with the support you need.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
              <Link
                href="/chat"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 sm:px-7 sm:py-3 rounded-full text-xs sm:text-sm font-semibold bg-[#143D32] hover:bg-[#1D4E41] active:bg-[#0F2F26] text-white shadow-2xs hover:shadow-xs transition-all duration-200 active:scale-95 focus-accessible"
              >
                <span>Start a conversation</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link
                href="/screening"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full text-xs sm:text-sm font-medium bg-white dark:bg-[#1A2822] text-[#182C24] dark:text-[#E2EBE5] border border-[#D8D1C4] dark:border-[#2E4239] hover:bg-[#F2ECE1] dark:hover:bg-[#20312A] transition-all duration-200 active:scale-95 focus-accessible"
              >
                <span>Explore support</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>

            {/* Privacy Guarantee Note */}
            <div className="flex items-center justify-center md:justify-start gap-2 pt-1 text-[11px] sm:text-xs text-[#6F8279] dark:text-[#8E9F98]">
              <span className="p-1 rounded-md bg-[#ECE5D8] dark:bg-[#20312A] text-[#1E4D3D] dark:text-[#A8CEB1]">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <div>
                <strong className="font-semibold text-[#182C24] dark:text-[#E2EBE5]">Your privacy is our promise.</strong>{' '}
                <span>100% anonymous &bull; Confidential &bull; No judgment</span>
              </div>
            </div>
          </div>

          {/* Right Column: Meditation Illustration */}
          <div className="md:col-span-5 flex items-center justify-center">
            <div className="relative w-full max-w-[260px] sm:max-w-[300px] md:max-w-[340px] transition-transform duration-300 hover:scale-[1.03]">
              <MeditationIllustration className="w-full h-auto drop-shadow-xs" />
            </div>
          </div>
        </div>
      </section>

      {/* 2. PROMINENT UNIVERSITY COUNSELING HIGHLIGHT BANNER */}
      <section aria-labelledby="counseling-highlight-heading" className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#143D32] to-[#1D5445] text-white p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2.5 text-center md:text-left max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#A3C9A8]/20 text-[#A3C9A8] border border-[#A3C9A8]/30">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>University Counseling Service</span>
            </div>

            <h2 id="counseling-highlight-heading" className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Confidential Support with Campus Counselors
            </h2>

            <p className="text-xs sm:text-sm text-[#D1E5D8] leading-relaxed">
              Every enrolled student has access to free, 1-on-1 confidential counseling sessions with licensed university mental health professionals. Choose in-person campus appointments or secure telehealth.
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1 text-[11px] sm:text-xs text-[#B2D4BD]">
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-[#A3C9A8]" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                100% Free &amp; Confidential
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-[#A3C9A8]" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Zero Academic Record Sharing
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-[#A3C9A8]" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Flexible Scheduling
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <Link
              href="/booking"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 sm:px-7 sm:py-3 rounded-full text-xs sm:text-sm font-semibold bg-[#C5592D] hover:bg-[#B34D23] active:bg-[#9B411C] text-white shadow-xs transition-all duration-200 active:scale-95 text-center focus-accessible"
            >
              <span>Schedule a Session</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
            <Link
              href="/booking"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium text-[#D1E5D8] hover:text-white hover:bg-white/10 transition-all text-center focus-accessible"
            >
              <span>Meet Counselors &rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. HOW ARE YOU FEELING TODAY? (MOOD SELECTOR) */}
      <section aria-labelledby="mood-heading" className="space-y-5 text-center">
        <div className="space-y-1">
          <h2 id="mood-heading" className="font-serif text-2xl sm:text-3xl text-[#182C24] dark:text-[#F3F7F5] font-bold">
            How are you feeling today?
          </h2>
          <p className="text-xs sm:text-sm text-[#5C7067] dark:text-[#A3B8AF]">
            There&apos;s no right or wrong answer. We&apos;re here for whatever you&apos;re going through.
          </p>
        </div>

        {/* Mood Options Row with Right Decorative Vase */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-5 pt-1">
          {/* 5 Mood Circular Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 w-full max-w-3xl">
            {moods.map((mood) => {
              const isSelected = selectedMood === mood.id;
              return (
                <button
                  key={mood.id}
                  type="button"
                  onClick={() => setSelectedMood(mood.id)}
                  className={`p-3.5 sm:p-4 rounded-3xl transition-all duration-200 flex flex-col items-center justify-center text-center space-y-1.5 cursor-pointer focus-accessible ${
                    isSelected
                      ? 'bg-white dark:bg-[#1E2E27] ring-2 ring-[#143D32] dark:ring-[#7EA68E] shadow-md -translate-y-0.5'
                      : 'bg-white/70 dark:bg-[#16231E]/70 hover:bg-white dark:hover:bg-[#1A2923] border border-[#ECE5D8] dark:border-[#263730] shadow-2xs hover:shadow-xs hover:-translate-y-0.5'
                  }`}
                >
                  <div className="p-0.5 transition-transform duration-200">
                    {mood.icon}
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-sm text-[#182C24] dark:text-[#F3F7F5]">
                      {mood.label}
                    </h3>
                    <p className="text-[11px] text-[#6E8078] dark:text-[#90A29A] leading-tight mt-0.5">
                      {mood.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Decorative Botanical Vase (Desktop side accent) */}
          <div className="hidden lg:flex items-center justify-center shrink-0 pl-1">
            <BotanicalVaseIllustration className="w-24 h-auto opacity-95" />
          </div>
        </div>

        {/* Start with Mood Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleStartWithMood}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-[#D7E8DB] hover:bg-[#C9DEC3] active:bg-[#BCD2BE] text-[#143D32] dark:bg-[#223B2E] dark:hover:bg-[#2C4A3A] dark:text-[#D7E8DB] transition-all duration-200 active:scale-95 shadow-2xs cursor-pointer focus-accessible"
          >
            <span>Let&apos;s start there</span>
            <span aria-hidden="true">&rarr;</span>
          </button>
        </div>
      </section>

      {/* 4. FIND SUPPORT FOR WHAT MATTERS TO YOU (5 TOPIC CARDS) */}
      <section aria-labelledby="topics-heading" className="space-y-5 text-center">
        <div className="space-y-1">
          <h2 id="topics-heading" className="font-serif text-2xl sm:text-3xl text-[#182C24] dark:text-[#F3F7F5] font-bold">
            Find support for what matters to you
          </h2>
          <p className="text-xs sm:text-sm text-[#5C7067] dark:text-[#A3B8AF]">
            Choose a topic that feels closest to what you&apos;re going through.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 text-left">
          {topics.map((topic) => (
            <Link
              key={topic.title}
              href={topic.href}
              className="group p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#16231E] border border-[#ECE5D8] dark:border-[#263730] shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between space-y-3.5 focus-accessible"
            >
              <div className="space-y-2.5">
                <div className="p-2.5 w-fit rounded-2xl bg-[#FAF7F2] dark:bg-[#121B17] border border-[#EFE9DF] dark:border-[#20312A] group-hover:scale-105 transition-transform duration-200">
                  {topic.icon}
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-serif font-bold text-sm text-[#182C24] dark:text-[#F3F7F5] group-hover:text-[#143D32] dark:group-hover:text-[#A3C9A8] transition-colors">
                    {topic.title}
                  </h3>
                  <p className="text-[11px] text-[#6E8078] dark:text-[#90A29A] leading-relaxed">
                    {topic.desc}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-0.5">
                <span className="text-xs text-[#143D32] dark:text-[#A3C9A8] font-medium group-hover:translate-x-1 transition-transform duration-200">
                  &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. TAKE A MINUTE FOR YOURSELF (60-SECOND RESET BANNER) */}
      <section aria-labelledby="reset-heading" className="overflow-hidden rounded-3xl bg-[#E6F0EA] dark:bg-[#162820] border border-[#D2E4D8] dark:border-[#254034] p-6 sm:p-8 text-[#182C24] dark:text-[#F3F7F5] shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left Illustration */}
          <div className="md:col-span-4 flex items-center justify-center">
            <ResetIllustration className="w-44 sm:w-52 h-auto" />
          </div>

          {/* Right Content */}
          <div className="md:col-span-8 space-y-5 text-center md:text-left">
            <div className="space-y-1">
              <h2 id="reset-heading" className="font-serif text-2xl sm:text-3xl font-bold text-[#143D32] dark:text-[#E2EBE5]">
                Take a minute for yourself.
              </h2>
              <p className="text-xs sm:text-sm text-[#4E675D] dark:text-[#A3B8AF]">
                You don&apos;t have to solve everything right now.
              </p>
            </div>

            {/* 3 Step Sequence with clean SVG indicators */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-3 text-xs font-medium">
              {/* Step 1 */}
              <div className="flex items-center gap-2 p-2 px-3 rounded-2xl bg-white/80 dark:bg-[#1C3228] border border-[#D5E5DB] dark:border-[#2D4C3E] shadow-2xs">
                <span className="w-5 h-5 rounded-full bg-[#143D32] text-white flex items-center justify-center text-[10px] font-bold">1</span>
                <div>
                  <p className="font-bold text-[11px] text-[#143D32] dark:text-[#E2EBE5]">01:00</p>
                  <p className="text-[10px] text-[#5C7067] dark:text-[#9FB1A9]">Slow down</p>
                </div>
              </div>

              <span className="text-[#88A696] dark:text-[#4A685A]">&rarr;</span>

              {/* Step 2 */}
              <div className="flex items-center gap-2 p-2 px-3 rounded-2xl bg-white/80 dark:bg-[#1C3228] border border-[#D5E5DB] dark:border-[#2D4C3E] shadow-2xs">
                <span className="w-5 h-5 rounded-full bg-[#143D32] text-white flex items-center justify-center text-[10px] font-bold">2</span>
                <div>
                  <p className="font-bold text-[11px] text-[#143D32] dark:text-[#E2EBE5]">Notice</p>
                  <p className="text-[10px] text-[#5C7067] dark:text-[#9FB1A9]">How you feel</p>
                </div>
              </div>

              <span className="text-[#88A696] dark:text-[#4A685A]">&rarr;</span>

              {/* Step 3 */}
              <div className="flex items-center gap-2 p-2 px-3 rounded-2xl bg-white/80 dark:bg-[#1C3228] border border-[#D5E5DB] dark:border-[#2D4C3E] shadow-2xs">
                <span className="w-5 h-5 rounded-full bg-[#143D32] text-white flex items-center justify-center text-[10px] font-bold">3</span>
                <div>
                  <p className="font-bold text-[11px] text-[#143D32] dark:text-[#E2EBE5]">Reset</p>
                  <p className="text-[10px] text-[#5C7067] dark:text-[#9FB1A9]">Give yourself grace</p>
                </div>
              </div>
            </div>

            {/* Action Trigger & Evidence Subtext */}
            <div className="space-y-2 pt-0.5">
              <button
                type="button"
                onClick={() => setShowBreathing((prev) => !prev)}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 sm:px-7 sm:py-3 rounded-full text-xs sm:text-sm font-semibold bg-[#143D32] hover:bg-[#1C4E40] active:bg-[#0E2E25] text-white shadow-xs transition-all duration-200 active:scale-95 cursor-pointer focus-accessible"
              >
                <span>{showBreathing ? 'Close reset tool' : 'Start 60-second reset'}</span>
                <span aria-hidden="true">{showBreathing ? '▲' : '→'}</span>
              </button>

              <p className="text-[11px] text-[#557065] dark:text-[#9FB1A9] flex items-center justify-center md:justify-start gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-[#507565]" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>Exercises backed by evidence-based practices</span>
              </p>
            </div>
          </div>
        </div>

        {/* Expandable Guided Breathing Tool */}
        {showBreathing && (
          <div className="mt-6 pt-5 border-t border-[#D0E2D6] dark:border-[#243F33] animate-page-enter">
            <BreathingWidget />
          </div>
        )}
      </section>

      {/* 6. SUPPORT THAT GROWS WITH YOU (4-STEP PROGRESSION PATHWAY) */}
      <section aria-labelledby="pathway-heading" className="space-y-6 text-center">
        <div className="space-y-1">
          <h2 id="pathway-heading" className="font-serif text-2xl sm:text-3xl text-[#182C24] dark:text-[#F3F7F5] font-bold">
            Support that grows with you
          </h2>
          <p className="text-xs sm:text-sm text-[#5C7067] dark:text-[#A3B8AF]">
            Start wherever you&apos;re comfortable. Move at your own pace.
          </p>
        </div>

        {/* 4 Connected Circular Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative">
          {pathwaySteps.map((step, idx) => (
            <div key={step.num} className="relative flex flex-col items-center text-center space-y-2.5">
              {/* Connector line (desktop) */}
              {idx < pathwaySteps.length - 1 && (
                <div className="hidden lg:block absolute top-7 left-[65%] w-[70%] border-t-2 border-dashed border-[#CCD8D2] dark:border-[#2D453B] z-0 pointer-events-none" />
              )}

              {/* Circular Node */}
              <Link
                href={step.href}
                className={`relative z-10 w-13 h-13 rounded-full ${step.bg} border border-[#D5E3D9] dark:border-[#30483C] flex items-center justify-center shadow-xs hover:scale-105 transition-transform duration-200 focus-accessible`}
              >
                {step.icon}
              </Link>

              {/* Step Info */}
              <div className="space-y-0.5 max-w-[200px]">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#8A9C94] dark:text-[#7D9188]">
                  {step.num}
                </p>
                <h3 className="font-serif font-bold text-sm text-[#182C24] dark:text-[#F3F7F5]">
                  <Link href={step.href} className="hover:underline focus-accessible">
                    {step.title}
                  </Link>
                </h3>
                <p className="text-[11px] text-[#6E8078] dark:text-[#90A29A] leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. TRUST & PRIVACY GUARANTEES (4 PILLARS) */}
      <section aria-label="Trust principles and data security" className="p-5 sm:p-7 rounded-3xl bg-[#F6F2EA]/80 dark:bg-[#16231E]/80 border border-[#ECE5D8] dark:border-[#263730] shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
          {trustBadges.map((badge) => (
            <div key={badge.title} className="flex items-start gap-3">
              <div className="p-2 rounded-2xl bg-white dark:bg-[#1D2E27] border border-[#E8E1D4] dark:border-[#2B4036] shadow-2xs shrink-0">
                {badge.icon}
              </div>
              <div className="space-y-0.5">
                <h4 className="font-serif font-bold text-xs sm:text-sm text-[#182C24] dark:text-[#F3F7F5]">
                  {badge.title}
                </h4>
                <p className="text-[11px] text-[#6E8078] dark:text-[#90A29A] leading-relaxed">
                  {badge.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
