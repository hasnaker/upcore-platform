import { NextResponse } from 'next/server';

// Public endpoint — no auth. Returns the UpCore subprocessor registry in
// machine-readable form for automated compliance checks (vendor due
// diligence bots, procurement tooling).
//
// Source of truth: compliance/subprocessors.md. Bu dosya değiştirilince
// elle senkronlanır; CI'da tutarlılık linter'ı (ileride) uyarır.

const SUBPROCESSORS = {
  version: '1.0',
  lastUpdated: '2026-04-22',
  contact: 'kvkk@upcore.app',
  changeNotice: 'tenant admins notified 10 business days prior',

  tier1_direct_data_access: [
    {
      name: 'Microsoft Azure',
      purpose: 'Hosting, PostgreSQL, Blob Storage, Service Bus, Key Vault',
      location: ['TR Central', 'EU North (warm-standby)'],
      data_categories: ['All customer data at rest'],
      dpa_signed: true,
      certifications: ['ISO 27001', 'ISO 27017', 'ISO 27018', 'SOC 2 Type II', 'PCI-DSS'],
    },
    {
      name: 'Clerk',
      purpose: 'Identity management (authn, authz, MFA, SSO)',
      location: ['United States'],
      data_categories: ['User email', 'Name', 'Role'],
      dpa_signed: true,
      certifications: ['SOC 2 Type II'],
    },
    {
      name: 'Iyzico (BKM)',
      purpose: 'Payment processing (TR cards)',
      location: ['Türkiye'],
      data_categories: ['Card token', 'Transaction metadata'],
      dpa_signed: true,
      certifications: ['PCI-DSS Level 1'],
    },
    {
      name: 'Stripe',
      purpose: 'Payment processing (global cards)',
      location: ['Ireland', 'United States'],
      data_categories: ['Card token', 'Transaction metadata'],
      dpa_signed: true,
      certifications: ['PCI-DSS Level 1', 'SOC 2 Type II'],
    },
    {
      name: 'DocuSign',
      purpose: 'Electronic signature (offers, contracts)',
      location: ['United States'],
      data_categories: ['PDF document', 'Signer email'],
      dpa_signed: true,
      certifications: ['SOC 2 Type II', 'ISO 27001'],
    },
  ],

  tier2_auxiliary: [
    {
      name: 'Daily.co',
      purpose: 'Video interview rooms',
      location: ['United States'],
      data_categories: ['Interview participant name', 'Timestamp'],
      dpa_signed: true,
      certifications: ['SOC 2 Type II'],
    },
    {
      name: 'Proxycurl',
      purpose: 'LinkedIn public profile enrichment',
      location: ['United States'],
      data_categories: ['Candidate LinkedIn URL', 'Public profile data'],
      dpa_signed: false,
      dpa_status: 'in_progress',
    },
    {
      name: 'Azure OpenAI',
      purpose: 'AI help assistant (help widget)',
      location: ['Türkiye (data residency mandatory)'],
      data_categories: ['Anonymised chat prompt'],
      dpa_signed: true,
    },
  ],

  tier3_infrastructure_no_customer_data: [
    { name: 'GitHub', purpose: 'Source code + CI/CD', location: ['United States'] },
    { name: 'NPM registry', purpose: 'Package distribution', location: ['United States'] },
    { name: 'Sentry', purpose: 'Error tracking (PII scrubbed)', location: ['EU'] },
  ],
};

export async function GET() {
  return NextResponse.json(SUBPROCESSORS, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
