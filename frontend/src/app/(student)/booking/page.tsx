'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Counselor } from '@/lib/types';
import { listCounselors } from '@/lib/api';

export default function BookingPage() {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listCounselors()
      .then((data) => {
        if (!cancelled) {
          setCounselors(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error ? err.message : 'Failed to load counseling team.'
          );
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8 py-4">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 focus-accessible p-1"
          >
            &larr; Back to Home
          </Link>
          <Badge variant="brand" size="sm">
            University Counseling
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">
          Meet the team
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
          Our university counseling team offers confidential, judgment-free
          support for academic stress, anxiety, relationships, and everyday
          challenges. Choose a counselor to see their available appointment
          times.
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12 text-sm text-slate-500">
          Loading the counseling team...
        </div>
      )}

      {/* Error state */}
      {!isLoading && errorMessage && (
        <Card variant="crisis" padding="md" className="space-y-2">
          <p className="text-sm font-semibold text-amber-950">
            We could not load the counseling team right now.
          </p>
          <p className="text-xs text-amber-900">{errorMessage}</p>
          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsLoading(true);
                setErrorMessage(null);
                listCounselors()
                  .then(setCounselors)
                  .catch((err) =>
                    setErrorMessage(
                      err instanceof Error
                        ? err.message
                        : 'Failed to load counseling team.'
                    )
                  )
                  .finally(() => setIsLoading(false));
              }}
            >
              Try again
            </Button>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !errorMessage && counselors.length === 0 && (
        <Card variant="subtle" padding="lg" className="text-center space-y-2">
          <p className="font-semibold text-slate-700">
            No counselors are available at the moment.
          </p>
          <p className="text-xs text-slate-500">
            Please check back soon or explore our other support pathways.
          </p>
          <div className="pt-2">
            <Link href="/resources">
              <Button variant="secondary" size="md">
                Browse Resources &rarr;
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Counselor list */}
      {!isLoading && !errorMessage && counselors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {counselors.map((counselor) => (
            <Card
              key={counselor.id}
              variant="default"
              padding="lg"
              className="flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#F0FDFA] flex items-center justify-center text-[#0F766E] font-bold text-lg">
                    {counselor.name.charAt(0)}
                  </div>
                  <Badge variant="sage" size="sm">
                    {counselor.title}
                  </Badge>
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  {counselor.name}
                </h2>
                {counselor.bio && (
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {counselor.bio}
                  </p>
                )}
                <ul
                  className="flex flex-wrap gap-2 pt-1"
                  aria-label="Areas of support"
                >
                  {counselor.areas_of_support.map((area) => (
                    <li
                      key={area}
                      className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-2">
                <Link href={`/booking/slots?counselor=${encodeURIComponent(counselor.id)}&name=${encodeURIComponent(counselor.name)}`}>
                  <Button variant="primary" size="md" fullWidth>
                    View available times
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Privacy note */}
      <Card variant="subtle" padding="md" className="space-y-2">
        <h2 className="text-sm font-bold text-slate-800">
          Your privacy comes first
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          You can request an appointment without giving your name, email, or
          phone number. Any details you share are only used to arrange your
          appointment and are never combined with your anonymous chat or
          screening data.
        </p>
      </Card>

      {/* Status lookup link */}
      <Card variant="subtle" padding="md" className="space-y-2">
        <h2 className="text-sm font-bold text-slate-800">
          Already requested an appointment?
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Use your confirmation code to check the latest status of your
          appointment anytime, without an account.
        </p>
        <div className="pt-1">
          <Link href="/booking/status">
            <Button variant="secondary" size="sm">
              Check appointment status
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}