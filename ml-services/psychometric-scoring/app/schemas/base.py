"""Base request/response models with shared tenant scoping."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TenantScopedRequest(BaseModel):
    """Any scoring request must declare its tenant/employee/assessment ids."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    tenant_id: UUID = Field(description="Upcore tenant UUID")
    employee_id: UUID = Field(description="Employee UUID")
    assessment_id: UUID = Field(description="Assessment UUID (idempotency key)")
    language: str = Field(default="tr-TR", pattern=r"^[a-z]{2}(-[A-Z]{2})?$")


class TenantScopedResponse(BaseModel):
    """Any scoring response echoes tenant/employee/assessment ids."""

    model_config = ConfigDict(extra="forbid")

    tenant_id: UUID
    employee_id: UUID
    assessment_id: UUID
