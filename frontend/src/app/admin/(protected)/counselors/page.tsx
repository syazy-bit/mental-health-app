'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  createCounselor,
  listAdminCounselors,
  updateCounselor,
} from '@/lib/admin-api';
import { AdminApiError } from '@/lib/admin-api';
import type {
  AdminCounselor,
  AdminCounselorPayload,
} from '@/lib/admin-types';
import { truncate } from '@/lib/admin-format';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Dialog } from '@/components/ui/Dialog';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

interface FormState {
  name: string;
  title: string;
  areas: string;
  bio: string;
  isActive: boolean;
}

const emptyForm: FormState = {
  name: '',
  title: '',
  areas: '',
  bio: '',
  isActive: true,
};

function toForm(counselor: AdminCounselor): FormState {
  return {
    name: counselor.name,
    title: counselor.title,
    areas: counselor.areas_of_support.join(', '),
    bio: counselor.bio ?? '',
    isActive: counselor.is_active,
  };
}

export default function AdminCounselorsPage() {
  const [counselors, setCounselors] = useState<AdminCounselor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminCounselor | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toDeactivate, setToDeactivate] = useState<AdminCounselor | null>(null);
  const [toActivate, setToActivate] = useState<AdminCounselor | null>(null);

  const load = () => {
    listAdminCounselors()
      .then(setCounselors)
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'Unable to load counselors.'
        );
      });
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setFormError(null);
    setEditing('new');
  };

  const openEdit = (counselor: AdminCounselor) => {
    setForm(toForm(counselor));
    setFormError(null);
    setEditing(counselor);
  };

  const save = async () => {
    const name = form.name.trim();
    const title = form.title.trim();
    if (!name || !title) {
      setFormError('Name and title are required.');
      return;
    }
    const areas = form.areas
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    setIsSaving(true);
    setFormError(null);
    try {
      if (editing === 'new') {
        await createCounselor({
          name,
          title,
          areas_of_support: areas,
          bio: form.bio.trim() || undefined,
          is_active: form.isActive,
        } satisfies AdminCounselorPayload);
      } else if (editing) {
        await updateCounselor(editing.id, {
          name,
          title,
          areas_of_support: areas,
          bio: form.bio.trim() || undefined,
          is_active: form.isActive,
        });
      }
      setEditing(null);
      load();
    } catch (err) {
      if (err instanceof AdminApiError) {
        setFormError(err.message);
      } else {
        setFormError('Unable to save the counselor. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (counselor: AdminCounselor) => {
    setIsSaving(true);
    setFormError(null);
    try {
      await updateCounselor(counselor.id, {
        is_active: !counselor.is_active,
      });
      setToDeactivate(null);
      setToActivate(null);
      load();
    } catch (err) {
      if (err instanceof AdminApiError) {
        setFormError(err.message);
      } else {
        setFormError('Unable to update the counselor. Please try again.');
      }
      setToDeactivate(null);
      setToActivate(null);
    } finally {
      setIsSaving(false);
    }
  };

  const sorted = (counselors ?? []).slice().sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Counselors</h1>
          <p className="mt-1 text-slate-600">
            Manage counseling staff profiles and availability.
          </p>
        </div>
        <Button variant="brand" onClick={openCreate}>
          Add counselor
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {formError && <Alert variant="error">{formError}</Alert>}

      {counselors === null ? (
        <p className="text-sm text-slate-500 py-6">Loading counselors…</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-slate-500 py-6">
          No counselors yet. Add your first counselor to get started.
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {sorted.map((counselor) => (
            <li
              key={counselor.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-slate-900 truncate">
                    {counselor.name}
                  </h2>
                  <p className="text-sm text-slate-600">{counselor.title}</p>
                </div>
                <Badge variant={counselor.is_active ? 'brand' : 'neutral'}>
                  {counselor.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {counselor.areas_of_support.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {counselor.areas_of_support.map((area) => (
                    <span
                      key={area}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F4F7F5] text-[#3B5B52] border border-[#CBD5E1]"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              )}

              {counselor.bio && (
                <p className="text-sm text-slate-600">
                  {truncate(counselor.bio, 120)}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 mt-auto pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => openEdit(counselor)}>
                  Edit
                </Button>
                <Link
                  href={`/admin/availability?counselor=${counselor.id}`}
                  className="inline-flex items-center text-sm font-medium text-[#0F766E] hover:underline focus-accessible rounded px-2 py-1 touch-target"
                >
                  Manage availability
                </Link>
                {counselor.is_active ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto"
                    onClick={() => setToDeactivate(counselor)}
                  >
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    variant="brand"
                    size="sm"
                    className="ml-auto"
                    onClick={() => setToActivate(counselor)}
                  >
                    Activate
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={editing !== null}
        onClose={() => {
          if (!isSaving) setEditing(null);
        }}
        title={editing === 'new' ? 'Add counselor' : `Edit ${editing?.name ?? 'counselor'}`}
        description="Profile details shown to students. Manage availability separately."
      >
        <div className="space-y-4">
          <Input
            id="counselor-name"
            label="Full name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
          <Input
            id="counselor-title"
            label="Title"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="e.g. Staff Counselor, Wellness Advisor"
            required
          />
          <Input
            id="counselor-areas"
            label="Areas of support"
            value={form.areas}
            onChange={(event) => setForm({ ...form, areas: event.target.value })}
            placeholder="e.g. Anxiety, Relationships, Academic stress"
          />
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="counselor-bio"
              className="text-sm font-medium text-slate-700"
            >
              Bio
            </label>
            <textarea
              id="counselor-bio"
              value={form.bio}
              onChange={(event) => setForm({ ...form, bio: event.target.value })}
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-accessible"
            />
          </div>
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm({ ...form, isActive: event.target.checked })
              }
              className="w-5 h-5 rounded border-slate-300 text-[#0F766E] focus-accessible"
            />
            Active (bookable by students)
          </label>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setEditing(null)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button variant="brand" onClick={save} isLoading={isSaving}>
              Save counselor
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={toDeactivate !== null}
        onClose={() => {
          if (!isSaving) setToDeactivate(null);
        }}
        onConfirm={() => toDeactivate && toggleActive(toDeactivate)}
        title="Deactivate counselor"
        description={`${toDeactivate?.name ?? 'This counselor'} will no longer be bookable by students. Existing bookings are unaffected.`}
        confirmLabel="Deactivate"
        variant="danger"
        isLoading={isSaving}
      />

      <ConfirmDialog
        open={toActivate !== null}
        onClose={() => {
          if (!isSaving) setToActivate(null);
        }}
        onConfirm={() => toActivate && toggleActive(toActivate)}
        title="Activate counselor"
        description={`${toActivate?.name ?? 'This counselor'} will become bookable by students again.`}
        confirmLabel="Activate"
        isLoading={isSaving}
      />
    </div>
  );
}