---
id: python
title: "Python SDK"
sidebar_position: 2
---

# Python SDK

Python 3.9+.

## Kurulum

```bash
pip install upcore-sdk
```

## Quick start

```python
from upcore import UpCoreClient

client = UpCoreClient(
    api_key=os.environ["UPCORE_API_KEY"],
    environment="production",
)

employees = client.employees.list(department_id="dept_123", limit=50)

for emp in client.employees.list_paginated():
    print(emp.email)
```

## Async destek

```python
from upcore import AsyncUpCoreClient

async def main():
    async with AsyncUpCoreClient(api_key=API_KEY) as client:
        employees = await client.employees.list()
```

## Pydantic modeller

```python
from upcore.models import Employee, PulseResponse

emp: Employee = client.employees.get("emp_123")
assert isinstance(emp.created_at, datetime)
```

## Webhook

```python
from upcore.webhooks import verify_webhook

@app.post("/webhook")
def handle_webhook(request):
    verify_webhook(
        body=request.body,
        timestamp=request.headers["x-upcore-timestamp"],
        signature=request.headers["x-upcore-signature"],
        secret=os.environ["UPCORE_WEBHOOK_SECRET"],
    )
    # process event
```

## Özellikler

- Pydantic v2 modeller
- Sync + async clients
- httpx-based
- Auto retry
- Typed (mypy strict)
