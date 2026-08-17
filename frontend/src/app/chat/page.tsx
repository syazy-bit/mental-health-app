'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ChatMessage } from '@/lib/types';
import { ensureSession } from '@/lib/session';
import { sendChatMessage, ApiError } from '@/lib/api';

const STARTER_PILLS = [
  "I'm stressed about exams and deadlines",
  "I don't know who to talk to about my feelings",
  "I just want to vent about my day",
  "I'm having trouble sleeping well",
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
        // Lock composer and redirect immediately to the dedicated crisis screen
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
          // Session expired or reset
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

  const selectStarterPill = (text: string) => {
    setInputText(text);
    inputRef.current?.focus();
  };

  return (
    <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col space-y-4">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Emotional Support Assistant
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Empathetic, non-judgmental listening. Responses are not saved to a database.
          </p>
        </div>
        <Badge variant="brand" size="sm">
          Anonymous &bull; Non-Clinical
        </Badge>
      </div>

      {/* Messages Container */}
      <div
        className="flex-1 min-h-[380px] max-h-[550px] overflow-y-auto p-4 space-y-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs"
        aria-live="polite"
        aria-label="Conversation messages"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 my-auto">
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
            <div className="space-y-1 max-w-sm">
              <h2 className="text-base font-bold text-slate-800">
                How are you feeling today?
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                You can talk about school stress, burnout, relationship worries, or anything on your mind.
              </p>
            </div>

            {/* Quick Starter Suggestions */}
            <div className="w-full space-y-2 pt-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Tap a topic to fill:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {STARTER_PILLS.map((pill) => (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => selectStarterPill(pill)}
                    className="text-xs px-3 py-1.5 rounded-full bg-slate-100 hover:bg-[#F0FDFA] hover:text-[#0F766E] border border-slate-200 text-slate-700 transition-colors focus-accessible touch-target cursor-pointer"
                  >
                    {pill}
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
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#0F766E] text-white rounded-br-xs shadow-xs'
                    : 'bg-[#F4F7F5] text-slate-800 border border-slate-200/80 rounded-bl-xs'
                }`}
              >
                {msg.content}
              </div>
              <div className="flex items-center gap-2 mt-1 px-1 text-[11px] text-slate-400">
                <span>{msg.role === 'user' ? 'You' : 'Assistant'}</span>
                <span>&bull;</span>
                <span>{msg.timestamp}</span>
              </div>
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex flex-col items-start">
            <div className="bg-[#F4F7F5] border border-slate-200 rounded-2xl rounded-bl-xs p-4 flex items-center gap-2 text-slate-500 text-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-[#0F766E] animate-pulse" />
              <span className="inline-block w-2 h-2 rounded-full bg-[#0F766E] animate-pulse delay-75" />
              <span className="inline-block w-2 h-2 rounded-full bg-[#0F766E] animate-pulse delay-150" />
              <span className="ml-1 text-xs">Assistant is typing...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Rate Limit Banner */}
      {rateLimitTimer !== null && (
        <Card variant="crisis" padding="sm" className="text-xs flex items-center justify-between">
          <span>
            <strong>Message limit reached.</strong> Please wait {rateLimitTimer}s before sending another message.
          </span>
          <span className="font-mono font-bold text-amber-900">{rateLimitTimer}s</span>
        </Card>
      )}

      {/* Error Banner */}
      {errorMessage && rateLimitTimer === null && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-700 font-bold hover:text-red-900 p-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* Composer Form */}
      <form onSubmit={handleSendMessage} className="space-y-2">
        <div className="relative">
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
            placeholder="Type your message here (Shift+Enter for new line)..."
            disabled={isLoading || isCrisisTriggered || rateLimitTimer !== null}
            maxLength={2000}
            className="w-full rounded-2xl border border-slate-300 p-3.5 pr-28 text-sm focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 outline-none resize-none bg-white text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 placeholder:text-slate-400 shadow-xs"
          />
          <div className="absolute right-2.5 bottom-3 flex items-center gap-2">
            <span
              className={`text-[11px] ${
                inputText.length > 1800 ? 'text-amber-600 font-bold' : 'text-slate-400'
              }`}
            >
              {inputText.length}/2000
            </span>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              disabled={!inputText.trim() || isLoading || rateLimitTimer !== null || isCrisisTriggered}
              className="px-4"
            >
              Send
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 text-center">
          In distress or immediate danger?{' '}
          <button
            type="button"
            onClick={() => router.push('/support-now')}
            className="text-amber-700 underline font-semibold hover:text-amber-900 cursor-pointer"
          >
            View 24/7 Crisis Helplines
          </button>
        </p>
      </form>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-500 text-sm">
          Loading emotional support assistant...
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
