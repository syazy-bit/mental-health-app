import React from 'react';
import { Badge, BadgeProps } from './Badge';

export interface StatusBadgeProps {
  status: string;
  size?: BadgeProps['size'];
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'sm',
  className = '',
}) => {
  const normalized = status.toUpperCase();

  switch (normalized) {
    case 'CONFIRMED':
    case 'ACTIVE':
    case 'NORMAL':
    case 'MINIMAL':
      return (
        <Badge variant="brand" size={size} dot className={className}>
          {status}
        </Badge>
      );

    case 'COMPLETED':
    case 'MILD':
      return (
        <Badge variant="sage" size={size} dot className={className}>
          {status}
        </Badge>
      );

    case 'PENDING':
    case 'MODERATE':
      return (
        <Badge variant="amber" size={size} dot className={className}>
          {status}
        </Badge>
      );

    case 'CANCELLED':
    case 'INACTIVE':
    case 'HIGH_RISK':
    case 'SEVERE':
    case 'MODERATELY SEVERE':
      return (
        <Badge variant="coral" size={size} dot className={className}>
          {status}
        </Badge>
      );

    default:
      return (
        <Badge variant="neutral" size={size} className={className}>
          {status}
        </Badge>
      );
  }
};
