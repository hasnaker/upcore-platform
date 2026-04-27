import { AlertTriangle, Info, Quote } from 'lucide-react';
import type { ReactNode } from 'react';

interface CalloutProps {
  variant: 'info' | 'warning' | 'quote';
  children: ReactNode;
}

const VARIANTS = {
  info: {
    icon: Info,
    bg: 'bg-[#EFF6FF]',
    border: 'border-[#3B82F6]',
    fg: 'text-[#1E3A8A]',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-[#FEF3C7]',
    border: 'border-[#D97706]',
    fg: 'text-[#78350F]',
  },
  quote: {
    icon: Quote,
    bg: 'bg-[#F3F4F6]',
    border: 'border-[#6B7280]',
    fg: 'text-[#111827]',
  },
} as const;

export function Callout({ variant, children }: CalloutProps) {
  const V = VARIANTS[variant];
  const Icon = V.icon;
  return (
    <aside
      className={`my-6 flex gap-3 rounded-lg border-l-4 ${V.bg} ${V.border} px-5 py-4`}
      role="note"
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${V.fg}`} aria-hidden="true" />
      <div className={`text-sm leading-relaxed ${V.fg}`}>{children}</div>
    </aside>
  );
}
