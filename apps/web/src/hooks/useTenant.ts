'use client';

import { useOrganization } from '@clerk/nextjs';

/**
 * Returns the active tenant (Clerk organization) for the current user.
 * Tenant slug is sourced from the organization slug set during onboarding.
 */
export function useTenant() {
  const { organization, isLoaded } = useOrganization();
  return {
    tenant: organization
      ? {
          id: organization.id,
          slug: organization.slug,
          name: organization.name,
        }
      : null,
    isLoaded,
  };
}
