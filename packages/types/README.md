# @upcore/types

Shared Zod schemas, TypeScript types, and API contracts for the Upcore platform.

## Overview

This package is the single source of truth for data shapes used across:

- Web app (employee/manager/HR dashboards)
- Admin app (super-admin / tenant management)
- API client (typed fetch wrappers)
- Backend services (validated against OpenAPI)

## Installation

```bash
pnpm add @upcore/types
```

## Usage

```typescript
import { EmployeeSchema, UserRole, LoginRequest } from '@upcore/types';

// Validate input
const employee = EmployeeSchema.parse(rawData);

// Use in API route
const body = LoginRequestSchema.parse(await req.json());
```

## Structure

- `src/schemas/` — Domain entity Zod schemas (Employee, Tenant, Department, ...)
- `src/enums/` — String enums with Zod schemas (UserRole, BurnoutLevel, LeaveType, ...)
- `src/api/` — Request/response contract schemas per endpoint
- `src/validators/` — Turkish-specific validators (TCKN, IBAN, phone, VKN)
- `src/ids.ts` — Branded UUID types per entity

## Branded IDs

All entity IDs are branded at the type level so you cannot accidentally pass
an `EmployeeId` where a `TenantId` is expected.

```typescript
import { EmployeeId, TenantId } from '@upcore/types';

function getEmployee(id: EmployeeId) { /* ... */ }
const tid = TenantId.parse('...');
getEmployee(tid); // ❌ TypeScript error
```

## Turkish Validators

- `TcknSchema` — 11-digit TCKN with mod 10/11 checksum
- `VknSchema` — 10-digit VKN (tax number)
- `IbanTrSchema` — TR + 24 digits, MOD 97 checksum
- `TurkishPhoneSchema` — +90 5XX XXX XX XX

## Scripts

```bash
pnpm build       # Bundle ESM + CJS + .d.ts
pnpm typecheck   # Run tsc --noEmit
pnpm test        # Run vitest
pnpm lint        # ESLint
```
