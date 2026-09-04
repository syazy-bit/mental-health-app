import React from 'react';
import { Badge } from '@/components/ui/Badge';

/**
 * Signed-in session indicator (Phase 2C).
 * Existing Badge primitive, brand variant, small dot — the authenticated
 * counterpart to the anonymous "Anonymous • Not Stored" badge.
 */
export const SessionModeBadge: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  return (
    <Badge variant="brand" size="sm" dot className={className}>
      Signed in &bull; account session
    </Badge>
  );
};
