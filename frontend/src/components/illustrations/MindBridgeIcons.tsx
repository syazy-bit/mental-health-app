import React from 'react';

// --- Mood Face Icons ---
export const MoodOkayIcon: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="24" cy="24" r="21" stroke="#315243" strokeWidth="2.5" fill="#EBF4EE" />
    {/* Eyes */}
    <circle cx="17" cy="20" r="2.5" fill="#315243" />
    <circle cx="31" cy="20" r="2.5" fill="#315243" />
    {/* Gentle smile */}
    <path d="M16 27 C20 33 28 33 32 27" stroke="#315243" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const MoodAnxiousIcon: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="24" cy="24" r="21" stroke="#C76D54" strokeWidth="2.5" fill="#FDF3F0" />
    {/* Worried brows & eyes */}
    <path d="M14 16 L19 18" stroke="#C76D54" strokeWidth="2" strokeLinecap="round" />
    <path d="M34 16 L29 18" stroke="#C76D54" strokeWidth="2" strokeLinecap="round" />
    <circle cx="17" cy="22" r="2.2" fill="#C76D54" />
    <circle cx="31" cy="22" r="2.2" fill="#C76D54" />
    {/* Wavy anxious mouth */}
    <path d="M17 30 Q21 27 24 30 T31 30" stroke="#C76D54" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const MoodStressedIcon: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="24" cy="24" r="21" stroke="#D97706" strokeWidth="2.5" fill="#FEF8EE" />
    {/* Tense angled brows */}
    <path d="M15 17 L20 19" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M33 17 L28 19" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="17" cy="22" r="2.2" fill="#D97706" />
    <circle cx="31" cy="22" r="2.2" fill="#D97706" />
    {/* Tight straight frown */}
    <path d="M17 31 L31 31" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const MoodDrainedIcon: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="24" cy="24" r="21" stroke="#607274" strokeWidth="2.5" fill="#F4F6F6" />
    {/* Sleepy closed eyes */}
    <path d="M14 22 L20 22" stroke="#607274" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M28 22 L34 22" stroke="#607274" strokeWidth="2.5" strokeLinecap="round" />
    {/* Slumped mouth */}
    <path d="M18 31 C22 28 26 28 30 31" stroke="#607274" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const MoodLowIcon: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="24" cy="24" r="21" stroke="#7C738A" strokeWidth="2.5" fill="#F6F4F9" />
    {/* Sad eyes */}
    <circle cx="17" cy="21" r="2.2" fill="#7C738A" />
    <circle cx="31" cy="21" r="2.2" fill="#7C738A" />
    {/* Downturned mouth */}
    <path d="M17 32 C21 27 27 27 31 32" stroke="#7C738A" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// --- Support Topic Icons ---
export const AcademicPressureIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 26V8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v18" fill="#E4EFE7" fillOpacity="0.4" />
    <path d="M13 26V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v20" fill="#E4EFE7" fillOpacity="0.4" />
    <path d="M21 26l5-18a2 2 0 0 1 2.4-1.4l1.9.5a2 2 0 0 1 1.4 2.4l-4.7 17.5" fill="#E4EFE7" fillOpacity="0.3" />
    <line x1="3" y1="26" x2="29" y2="26" strokeWidth="2" />
    <line x1="9" y1="10" x2="9" y2="20" strokeDasharray="1 3" />
  </svg>
);

export const AnxietyTopicIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8 C11 5 7 10 9 15 C6 18 8 23 12 24 C10 27 15 28 17 26 C20 28 25 26 24 22 C28 20 27 14 23 12 C24 7 19 5 16 8 Z" fill="#E4EFE7" fillOpacity="0.3" />
    <path d="M13 14 C15 11 18 13 16 17 C14 20 20 21 19 16" />
    <path d="M12 18 C14 20 18 19 17 22" strokeDasharray="1 2" />
  </svg>
);

export const SleepTopicIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 5 C11 6 7 12 8 18 C9 24 15 28 21 27 C24 26 26 24 27 22 C21 22 17 17 18 11 C18 9 19 7 20 5 C19 5 18 5 17 5 Z" fill="#E4EFE7" fillOpacity="0.4" />
    <path d="M25 8 L25 12 M23 10 L27 10" strokeWidth="1.5" />
    <path d="M22 17 L22 19 M21 18 L23 18" strokeWidth="1.3" />
  </svg>
);

export const BurnoutTopicIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="9" width="22" height="14" rx="3" fill="#E4EFE7" fillOpacity="0.3" />
    <path d="M26 13 C27.5 13 28 14 28 16 C28 18 27.5 19 26 19" />
    <rect x="7" y="12" width="6" height="8" rx="1.5" fill="#315243" />
  </svg>
);

export const NeedToTalkTopicIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 19 L4 25 L10 23 C12 24 14 24 16 24 C22.6 24 28 19.5 28 14 C28 8.5 22.6 4 16 4 C9.4 4 4 8.5 4 14 C4 15.8 4.7 17.5 6 19 Z" fill="#E4EFE7" fillOpacity="0.3" />
    <path d="M16 16 C14.5 14 12.5 14.5 12.5 16 C12.5 17.5 16 20 16 20 C16 20 19.5 17.5 19.5 16 C19.5 14.5 17.5 14 16 16 Z" fill="#C76D54" stroke="#C76D54" strokeWidth="1.2" />
  </svg>
);

// --- 4 Step Pathway Icons ---
export const ChatBubblePathwayIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    <circle cx="9" cy="11.5" r="0.75" fill="currentColor" />
    <circle cx="12" cy="11.5" r="0.75" fill="currentColor" />
    <circle cx="15" cy="11.5" r="0.75" fill="currentColor" />
  </svg>
);

export const AssessmentClipboardIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M9 12l2 2 4-4" />
    <line x1="9" y1="17" x2="15" y2="17" />
  </svg>
);

export const ProfessionalSupportIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M19 8v6M16 11h6" strokeWidth="1.75" />
  </svg>
);

export const ImmediateHelpPhoneIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

// --- Trust Badges Icons ---
export const AnonymousShieldIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const LockKeyholeIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="3" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    <circle cx="12" cy="16" r="1.5" />
    <path d="M12 17.5V19" />
  </svg>
);

export const NoJudgmentHeartShieldIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M12 9 C11 7.5 9.5 7.5 9.5 9 C9.5 10.5 12 13 12 13 C12 13 14.5 10.5 14.5 9 C14.5 7.5 13 7.5 12 9 Z" fill="currentColor" fillOpacity="0.2" />
  </svg>
);

export const GentleHandsIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 13h6a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H3a1 1 0 0 1-1-1v-5z" />
    <path d="M22 13h-6a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h5a1 1 0 0 0 1-1v-5z" />
    <path d="M12 4 C10.5 2.5 8.5 2.5 8.5 4 C8.5 5.5 12 8 12 8 C12 8 15.5 5.5 15.5 4 C15.5 2.5 13.5 2.5 12 4 Z" fill="currentColor" fillOpacity="0.3" />
  </svg>
);
