/**
 * Formatting helpers for the admin portal.
 *
 * Student contact details are sensitive: they are masked by default and only
 * revealed explicitly by an admin. Booking reasons are never shown in tables.
 */

export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain || !local) return null;
  const head = local.length > 0 ? local[0] : '';
  return `${head}•••@${domain}`;
}

export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return null;
  const tail = digits.slice(-4);
  return `•••-${tail}`;
}

export function maskContact(
  booking: { contact_email?: string | null; contact_phone?: string | null }
): string | null {
  return maskEmail(booking.contact_email) ?? maskPhone(booking.contact_phone) ?? null;
}

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${WEEKDAYS[date.getDay()]}, ${date.toLocaleDateString([], {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${WEEKDAYS[date.getDay()]}, ${date.toLocaleDateString([], {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

export function formatTimeRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  return `${start.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })} – ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function truncate(text: string | null | undefined, max = 48): string {
  if (!text) return '';
  const trimmed = text.trim().replace(/\s+/g, ' ');
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

/** Maps a booking status to the shared UI Badge variant. */
export type StatusBadgeVariant =
  | 'brand'
  | 'sage'
  | 'amber'
  | 'neutral'
  | 'coral';

export function statusBadgeVariant(
  status: string | null | undefined
): StatusBadgeVariant {
  switch (status) {
    case 'PENDING':
      return 'amber';
    case 'CONFIRMED':
      return 'brand';
    case 'CANCELLED':
      return 'coral';
    case 'COMPLETED':
      return 'sage';
    default:
      return 'neutral';
  }
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return 'Available';
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'CANCELLED':
      return 'Cancelled';
    case 'COMPLETED':
      return 'Completed';
    default:
      return status;
  }
}