'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ChatMessage } from '@/lib/types';
import { ensureSession } from '@/lib/session';
import { sendChatMessage, ApiError } from '@/lib/api';

const CONVERSATION_STARTERS = [
  {
    topic: 'Academic Stress',
    text: "I'm feeling overwhelmed with exam pressure and deadlines",
  },
  {
    topic: 'Racing Thoughts',
    text: "I'm having trouble sleeping because my mind won't stop racing",
  },
  {
    topic: 'Exhaustion',
    text: "I feel completely burnt out and can't find motivation to study",
  },
  {
    topic: 'Venting Space',
    text: "I just need someone to listen to what's going on without judgment",
  },
  {
    topic: 'Grounding',
    text: 'Can you guide me through a quick 2-minute calming exercise?',
  },
];

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStarter = searchParams?.get('starter') || '';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState(initialStarter);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rateLimitTimer, setRateLimitTimer] = useState<number | null>(null);
  const [isCrisisTriggered, setIsCrisisTriggered] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initial session check
  useEffect(() => {
    ensureSession().catch((err) => {
      console.warn('Session initialization warning:', err);
    });

    if (initialStarter) {
      inputRef.current?.focus();
    }
  }, [initialStarter]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Countdown timer for rate limiting
  useEffect(() => {
    if (rateLimitTimer === null || rateLimitTimer <= 0) return;
    const interval = setInterval(() => {
      setRateLimitTimer((prev) => {
        if (prev === null || prev <= 1) return null;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitTimer]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isLoading || isCrisisTriggered || rateLimitTimer !== null) {
      return;
    }

    if (trimmed.length > 2000) {
      setErrorMessage('Message exceeds 2000 characters. Please shorten it.');
      return;
    }

    setErrorMessage(null);
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    try {
      const sessionId = await ensureSession();

      // Build transient history (last 8 messages max)
      const historyPayload = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await sendChatMessage({
        session_id: sessionId,
        message: trimmed,
        history: historyPayload.length > 0 ? historyPayload : undefined,
      });

      // CRITICAL SAFETY CHECK:
      // If the backend indicates HIGH_RISK or crisis, IMMEDIATELY route to /support-now
      if (response.is_crisis || response.risk_level === 'HIGH_RISK') {
        setIsCrisisTriggered(true);
        router.push('/support-now');
        return;
      }

      // Normal or Moderate response
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: response.provider,
        model: response.model,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          const waitTime = err.retryAfter || 60;
          setRateLimitTimer(waitTime);
          setErrorMessage(`You've sent several messages quickly. Please take a pause for ${waitTime}s.`);
        } else if (err.status === 404) {
          ensureSession().then(() => {
            setErrorMessage('Your session was refreshed. Please send your message again.');
          });
        } else {
          setErrorMessage(err.message || 'An error occurred while connecting to the assistant.');
        }
      } else {
        setErrorMessage('Unable to reach the assistant. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectStarter = (text: string) => {
    setInputText(text);
    inputRef.current?.focus();
  };

  return (
    <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col space-y-4 py-1 sm:py-3">
      {/* 1. CALM SANCTUARY HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6E4DD] dark:border-[#283632]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-500 dark:text-[#AAB6B1] hover:text-[#0D5C56] dark:hover:text-[#4FA79D] transition-colors focus-accessible rounded-md p-0.5 -ml-0.5"
            >
              &larr; Home
            </Link>
            <span className="text-slate-300 dark:text-[#34413D]">&bull;</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-[#AAB6B1]">
              Supportive Listening
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#19232D] dark:text-[#F1F3EF] tracking-tight">
            A quiet space to talk &amp; reflect
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#AAB6B1] leading-relaxed">
            Take your time. Share whatever is on your mind in complete privacy.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="brand" size="sm" dot>
            Anonymous &bull; Not Stored
          </Badge>
        </div>
      </div>

      {/* 2. CONVERSATION CANVAS */}
      <div
        className="flex-1 min-h-[400px] max-h-[580px] overflow-y-auto p-4 sm:p-6 space-y-5 rounded-2xl bg-white dark:bg-[#18211F] border border-[#E6E4DD] dark:border-[#283632] shadow-[0_1px_3px_rgba(25,35,45,0.03)] dark:shadow-none"
        aria-live="polite"
        aria-label="Conversation messages"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-8 space-y-6 my-auto">
            <div className="space-y-1.5 max-w-md">
              <h2 className="text-base sm:text-lg font-bold text-[#19232D] dark:text-[#F1F3EF]">
                What&rsquo;s weighing on your mind today?
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#AAB6B1] leading-relaxed">
                You can explore academic burnout, pressure to succeed, relationship tension, or simply unpack your day. There is no right or wrong way to start.
              </p>
            </div>

            {/* Guided Starter Prompts */}
            <div className="w-full space-y-2.5 pt-2 max-w-lg">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#73827D]">
                Or tap a prompt to begin:
              </p>
              <div className="flex flex-col gap-2">
                {CONVERSATION_STARTERS.map((starter) => (
                  <button
                    key={starter.text}
                    type="button"
                    onClick={() => selectStarter(starter.text)}
                    className="w-full text-left p-3 rounded-xl bg-[#FAF9F6] dark:bg-[#141C1A] hover:bg-[#F0FDFA] dark:hover:bg-[#142725] border border-[#E6E4DD] dark:border-[#283632] hover:border-[#0D5C56]/40 dark:hover:border-[#4FA79D]/40 text-xs sm:text-sm text-slate-700 dark:text-[#F1F3EF] hover:text-[#0D5C56] dark:hover:text-[#4FA79D] transition-all flex items-center justify-between group focus-accessible cursor-pointer"
                  >
                    <span className="leading-snug">&ldquo;{starter.text}&rdquo;</span>
                    <span className="text-slate-400 dark:text-[#73827D] group-hover:text-[#0D5C56] dark:group-hover:text-[#4FA79D] text-xs font-semibold shrink-0 ml-2" aria-hidden="true">
                      &rarr;
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#0D5C56] dark:bg-[#4FA79D] text-white dark:text-[#101817] rounded-br-xs shadow-2xs font-medium'
                    : 'bg-[#F7FAF8] dark:bg-[#1C2623] text-[#19232D] dark:text-[#F1F3EF] border border-[#E2E8E5] dark:border-[#283632] rounded-bl-xs shadow-2xs'
                }`}
              >
                {msg.content}
              </div>
              <div className="flex items-center gap-1.5 mt-1 px-1 text-[11px] text-slate-400 dark:text-[#73827D]">
                <span className="font-medium text-slate-500 dark:text-[#AAB6B1]">
                  {msg.role === 'user' ? 'You' : 'Support Assistant'}
                </span>
                <span>&bull;</span>
                <span>{msg.timestamp}</span>
              </div>
            </div>
          ))
        )}

        {/* Listening / Typing State */}
        {isLoading && (
          <div className="flex flex-col items-start">
            <div className="bg-[#F7FAF8] dark:bg-[#1C2623] border border-[#E2E8E5] dark:border-[#283632] rounded-2xl rounded-bl-xs p-4 flex items-center gap-2 text-slate-500 dark:text-[#AAB6B1] text-xs sm:text-sm shadow-2xs">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0D5C56] dark:bg-[#4FA79D] animate-pulse" />
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0D5C56] dark:bg-[#4FA79D] animate-pulse delay-75" />
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0D5C56] dark:bg-[#4FA79D] animate-pulse delay-150" />
              <span className="ml-1 text-xs text-slate-500 dark:text-[#AAB6B1] font-medium">Listening and reflecting...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. ALERTS & TIMERS */}
      {rateLimitTimer !== null && (
        <Card variant="crisis" padding="sm" className="text-xs flex items-center justify-between">
          <span>
            <strong>Please pause a moment.</strong> You&rsquo;ve sent several messages quickly. Please wait {rateLimitTimer}s before sending another.
          </span>
          <span className="font-mono font-bold text-amber-900 dark:text-[#FDE68A]">{rateLimitTimer}s</span>
        </Card>
      )}

      {errorMessage && rateLimitTimer === null && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-xs flex items-center justify-between shadow-2xs"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-700 dark:text-red-300 font-bold hover:text-red-950 dark:hover:text-white p-1 cursor-pointer focus-accessible"
          >
            &times;
          </button>
        </div>
      )}

      {/* 4. COMPOSER */}
      <form onSubmit={handleSendMessage} className="space-y-2">
        <div className="relative rounded-2xl bg-white dark:bg-[#18211F] border border-[#E6E4DD] dark:border-[#283632] focus-within:border-[#0D5C56] dark:focus-within:border-[#4FA79D] focus-within:ring-2 focus-within:ring-[#0D5C56]/15 dark:focus-within:ring-[#4FA79D]/20 shadow-2xs transition-all">
          <label htmlFor="chat-composer-input" className="sr-only">
            Your message
          </label>
          <textarea
            id="chat-composer-input"
            ref={inputRef}
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type what's on your mind... (Press Enter to send, Shift+Enter for new line)"
            disabled={isLoading || isCrisisTriggered || rateLimitTimer !== null}
            maxLength={2000}
            className="w-full p-3.5 pb-12 text-xs sm:text-sm text-[#19232D] dark:text-[#F1F3EF] placeholder:text-slate-400 dark:placeholder:text-[#73827D] bg-transparent outline-none resize-none disabled:text-slate-400 dark:disabled:text-slate-600"
          />

          <div className="absolute left-3.5 bottom-2.5 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-[#73827D] pointer-events-none">
            <span>In-memory only &bull; Never stored</span>
          </div>

          <div className="absolute right-2.5 bottom-2.5 flex items-center gap-2">
            <span
              className={`text-[11px] ${
                inputText.length > 1800 ? 'text-amber-600 dark:text-[#E7A044] font-bold' : 'text-slate-400 dark:text-[#73827D]'
              }`}
            >
              {inputText.length > 0 ? `${inputText.length}/2000` : ''}
            </span>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              disabled={!inputText.trim() || isLoading || rateLimitTimer !== null || isCrisisTriggered}
              className="px-4 text-xs font-bold"
            >
              Send
            </Button>
          </div>
        </div>

        {/* Reassuring Crisis Access */}
        <p className="text-[11px] text-slate-500 dark:text-[#AAB6B1] text-center">
          In immediate crisis or severe distress?{' '}
          <Link
            href="/support-now"
            className="text-[#D97706] dark:text-[#E7A044] hover:text-[#B45309] dark:hover:text-[#F0B260] font-bold underline focus-accessible"
          >
            Access 24/7 Free Helplines (Tele-MANAS 14416)
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-500 dark:text-[#AAB6B1] text-sm">
          Loading emotional support space...
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
