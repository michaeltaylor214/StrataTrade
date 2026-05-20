import React from 'react';

type Variant = 'job' | 'severity' | 'compliance' | 'priority' | 'generic';

const JOB_COLORS: Record<string, string> = {
  pending_assignment: 'bg-gray-100 text-gray-700',
  assigned:           'bg-blue-100 text-blue-700',
  confirmed:          'bg-yellow-100 text-yellow-700',
  completed:          'bg-purple-100 text-purple-700',
  certificate_uploaded:'bg-indigo-100 text-indigo-700',
  approved:           'bg-green-100 text-green-700',
  cancelled:          'bg-red-100 text-red-700',
};

const SEVERITY_COLORS: Record<string, string> = {
  low:      'bg-blue-100 text-blue-700',
  medium:   'bg-yellow-100 text-yellow-700',
  high:     'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const COMPLIANCE_COLORS: Record<string, string> = {
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red:   'bg-red-100 text-red-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  low:    'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high:   'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

interface Props {
  value: string;
  variant?: Variant;
}

export default function StatusBadge({ value, variant = 'generic' }: Props) {
  let colorClass = 'bg-gray-100 text-gray-700';
  if (variant === 'job')        colorClass = JOB_COLORS[value]        ?? colorClass;
  if (variant === 'severity')   colorClass = SEVERITY_COLORS[value]   ?? colorClass;
  if (variant === 'compliance') colorClass = COMPLIANCE_COLORS[value] ?? colorClass;
  if (variant === 'priority')   colorClass = PRIORITY_COLORS[value]   ?? colorClass;

  const label = value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
