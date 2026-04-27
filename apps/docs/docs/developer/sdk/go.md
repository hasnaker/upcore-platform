---
id: go
title: "Go SDK"
sidebar_position: 3
---

# Go SDK

Go 1.23+.

## Kurulum

```bash
go get github.com/upcore/upcore-go-sdk
```

## Quick start

```go
package main

import (
    "context"
    "log"

    "github.com/upcore/upcore-go-sdk"
)

func main() {
    client := upcore.NewClient(upcore.Config{
        APIKey:      os.Getenv("UPCORE_API_KEY"),
        Environment: upcore.EnvProduction,
    })

    ctx := context.Background()
    employees, err := client.Employees.List(ctx, &upcore.EmployeeListParams{
        DepartmentID: upcore.String("dept_123"),
        Limit:        upcore.Int(50),
    })
    if err != nil {
        log.Fatal(err)
    }

    for _, emp := range employees.Data {
        log.Println(emp.Email)
    }
}
```

## Idiomatik tasarım

- Context-first API
- Functional options
- Typed errors (errors.Is)
- Zero allocations for hot paths

## Webhook

```go
import "github.com/upcore/upcore-go-sdk/webhook"

func handleWebhook(w http.ResponseWriter, r *http.Request) {
    event, err := webhook.ConstructEvent(r, secretKey)
    if err != nil {
        http.Error(w, "invalid signature", 401)
        return
    }
    switch event.Type {
    case "pulse.completed":
        // handle
    }
}
```

## Özellikler

- Fiber/Echo/chi uyumlu
- Context propagation
- Tracing (OpenTelemetry)
- Testify mock helpers (test-helpers paketi)
