---
id: javascript
title: "JavaScript / TypeScript SDK"
sidebar_position: 1
---

# JavaScript / TypeScript SDK

Node.js + browser.

## Kurulum

```bash
npm install @upcore/sdk
```

## Quick start

```typescript
import { UpCoreClient } from '@upcore/sdk';

const client = new UpCoreClient({
  apiKey: process.env.UPCORE_API_KEY,
  environment: 'production', // veya 'sandbox'
});

const employees = await client.employees.list({
  departmentId: 'dept_123',
  limit: 50,
});

for await (const emp of client.employees.listPaginated()) {
  console.log(emp.email);
}
```

## TypeScript tipler

```typescript
import type { Employee, PulseResponse } from '@upcore/sdk';

const emp: Employee = await client.employees.get('emp_123');
```

## Webhook doğrulama

```typescript
import { verifyWebhook } from '@upcore/sdk/webhooks';

app.post('/webhook', (req, res) => {
  try {
    verifyWebhook(req, process.env.UPCORE_WEBHOOK_SECRET);
    // process event
    res.status(200).send('ok');
  } catch (err) {
    res.status(401).send('invalid signature');
  }
});
```

## Özellikler

- Auto retry (exponential backoff)
- Auto idempotency key
- Pagination helper
- Webhook signature verification
- TypeScript strict mode
- Tree-shakeable (modular)
- 0 runtime dependencies (fetch native)

## Versiyon

- `@upcore/sdk@2.x` — ES2022, Node 18+
- `@upcore/sdk@1.x` — legacy, Node 14+ (deprecated)
