import React from 'react';

type Variant = 'job' | 'severity' | 'compliance' | 'priority' | 'generic';

// Each entry: [bgClass, textClass, dotClass]
const JOB_STYLES: Record<string, [string, string, string]> = {
  pending_assignment:  ['bg-slate-100',   'text-slate-600',   'bg-slate-400'],
  assigned:            ['bg-blue-100',    'text-blue-700',    'bg-blue-500'],
  confirmed:           ['bg-amber-100',   'text-amber-700',   'bg-amber-500'],
  completed:           ['bg-violet-100',  'text-violet-700',  'bg-violet-500'],
  certificate_uploaded:['bg-indigo-100',  'text-indigo-700',  'bg-indigo-500'],
  approved:            ['bg-emerald-100', 'text-emerald-700', 'bg-emerald-500'],
  cancelled:           ['bg-red-100',     'text-red-600',     'bg-red-400'],
};

const SEVERITY_STYLES: Record<string, [string, string, string]> = {
  low:      ['bg-sky-100',    'text-sky-700',    'bg-sky-400'],
  medium:   ['bg-amber-100',  'text-amber-700',  'bg-amber-500'],
  high:     ['bg-orange-100', 'text-orange-700', 'bg-orange-500'],
  critical: ['bg-red-100',    'text-red-700',    'bg-red-500'],
};

const COMPLIANCE_STYLES: Record<string, [string, string, string]> = {
  green: ['bg-emerald-100', 'text-emerald-700', 'bg-emerald-500'],
  amber: ['bg-amber-100',   'text-amber-700',   'bg-amber-500'],
  red:   ['bg-red-100',     'text-red-700',     'bg-red-500'],
};

const PRIORITY_STYLES: Record<string, [string, string, string]> = {
  low:    ['bg-slate-100',  'text-slate-600',  'bg-slate-400'],
  medium: ['bg-blue-100',   'text-blue-700',   'bg-blue-500'],
  high:   ['bg-orange-100', 'text-orange-700', 'bg-orange-500'],
  urgent: ['bg-red-100',    'text-red-700',    'bg-red-500'],
};

const AUDIT_STYLES: Record<string, [string, string, string]> = {
  pending:     ['bg-slate-100',  'text-slate-600',  'bg-slate-400'],
  in_progress: ['bg-amber-100',  'text-amber-700',  'bg-amber-500'],
  completed:   ['bg-emerald-100','text-emerald-700', 'bg-emerald-500'],
};

const DEFAULT_STYLE: [string, string, string] = ['bg-slate-100', 'text-slate-600', 'bg-slate-400'];

const LABEL_MAP: Record<string, string> = {
  pending_assignment:   'Needs Assigning',
  assigned:             'Assigned',
  confirmed:            'Confirmed',
  completed:            'Completed',
  certificate_uploaded: 'Cert Uploaded',
  approved:             'Approved ✓',
  cancelled:            'Cancelled',
  pending:              'Pending',
  in_progress:          'In Progress',
  submitted:            'Submitted',
  under_review:         'Under Review',
  job_created:          'Job Created',
  declined:             'Declined',
  accepted:             'Accepted',
  open:                 'Open',
  closed:               'Closed',
};

interface Props {
  value: string;
  variant?: Variant;
}

export default function StatusBadge({ value, variant = 'generic' }: Props) {
  let style = DEFAULT_STYLE;
  if (variant === 'job')        style = JOB_STYLES[value]        ?? DEFAULT_STYLE;
  if (variant === 'severity')   style = SEVERITY_STYLES[value]   ?? DEFAULT_STYLE;
  if (variant === 'compliance') style = COMPLIANCE_STYLES[value] ?? DEFAULT_STYLE;
  if (variant === 'priority')   style = PRIORITY_STYLES[value]   ?? DEFAULT_STYLE;
  if (variant === 'generic') {
    style = AUDIT_STYLES[value] ?? DEFAULT_STYLE;
  }

  const [bg, text, dot] = style;
  const label = LABEL_MAP[value] ?? value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {label}
    </span>
  );
}
