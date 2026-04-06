'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/utils';

interface Plan {
  id: 'starter' | 'growth' | 'enterprise';
  name: string;
  price: string;
  description: string;
}

const plans: Plan[] = [
  { id: 'starter', name: 'Başlangıç', price: '₺0', description: '25 çalışana kadar' },
  { id: 'growth', name: 'Büyüme', price: '₺49/çalışan', description: '100 çalışana kadar' },
  {
    id: 'enterprise',
    name: 'Kurumsal',
    price: 'Özel fiyat',
    description: 'Sınırsız çalışan',
  },
];

interface PlanSelectorProps {
  name: string;
  defaultValue?: Plan['id'];
  error?: string;
}

export function PlanSelector({ name, defaultValue = 'starter', error }: PlanSelectorProps) {
  const [value, setValue] = useState<Plan['id']>(defaultValue);
  const groupId = useId();

  return (
    <div>
      <div
        role="radiogroup"
        aria-labelledby={`${groupId}-label`}
        className="grid gap-3 md:grid-cols-3"
      >
        {plans.map((plan) => {
          const selected = value === plan.id;
          return (
            <label
              key={plan.id}
              className={cn(
                'cursor-pointer rounded-lg border p-4 transition-colors',
                selected
                  ? 'border-accent ring-1 ring-accent bg-accent-soft/30'
                  : 'border-line hover:border-ink-20',
              )}
            >
              <input
                type="radio"
                name={name}
                value={plan.id}
                checked={selected}
                onChange={() => setValue(plan.id)}
                className="sr-only"
              />
              <div className="text-sm font-semibold text-ink">{plan.name}</div>
              <div className="mt-1 text-xs text-ink-60">{plan.description}</div>
              <div className="mt-3 text-sm font-medium text-ink-80">{plan.price}</div>
            </label>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-red">{error}</p>}
    </div>
  );
}
