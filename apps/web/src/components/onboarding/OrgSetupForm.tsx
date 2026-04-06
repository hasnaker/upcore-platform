'use client';

import { useActionState, useState } from 'react';
import { createTenant, type CreateTenantState } from '@/app/onboarding/actions';
import { PlanSelector } from './PlanSelector';
import { slugify } from '@/lib/utils';

const initialState: CreateTenantState = {};

export function OrgSetupForm() {
  const [state, formAction, pending] = useActionState(createTenant, initialState);
  const [companyName, setCompanyName] = useState('');
  const [companySlug, setCompanySlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCompanyName(value);
    if (!slugEdited) {
      setCompanySlug(slugify(value));
    }
  };

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label htmlFor="company_name" className="mb-1.5 block text-sm font-medium text-ink">
          Şirket Adı
        </label>
        <input
          id="company_name"
          name="company_name"
          type="text"
          required
          value={companyName}
          onChange={handleNameChange}
          placeholder="Örn. Acme Teknoloji A.Ş."
          className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          aria-invalid={state.fieldErrors?.company_name ? 'true' : undefined}
        />
        {state.fieldErrors?.company_name && (
          <p className="mt-1 text-xs text-red">{state.fieldErrors.company_name}</p>
        )}
      </div>

      <div>
        <label htmlFor="company_slug" className="mb-1.5 block text-sm font-medium text-ink">
          Şirket URL&apos;si
        </label>
        <div className="flex items-center overflow-hidden rounded-md border border-line bg-bg focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
          <span className="border-r border-line bg-bg-2 px-3 py-2 text-sm text-ink-60">
            upcore.app/
          </span>
          <input
            id="company_slug"
            name="company_slug"
            type="text"
            required
            value={companySlug}
            onChange={(e) => {
              setSlugEdited(true);
              setCompanySlug(e.target.value.toLowerCase());
            }}
            placeholder="acme"
            pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
            className="flex-1 bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-40 focus:outline-none"
            aria-invalid={state.fieldErrors?.company_slug ? 'true' : undefined}
          />
        </div>
        {state.fieldErrors?.company_slug && (
          <p className="mt-1 text-xs text-red">{state.fieldErrors.company_slug}</p>
        )}
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink">Plan Seçimi</span>
        <PlanSelector
          name="plan_id"
          defaultValue="starter"
          error={state.fieldErrors?.plan_id}
        />
      </div>

      {state.error && (
        <div className="rounded-md border border-red-soft bg-red-soft/40 p-3 text-sm text-red">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-bg transition-colors hover:bg-accent/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Kuruluyor…' : 'Kuruluma Başla'}
      </button>
    </form>
  );
}
