/**
 * Audit logging utility for the UpCore platform.
 *
 * Writes structured audit entries to the app.audit_log table.
 * Designed to be fire-and-forget — callers should NOT await the returned
 * promise so that request latency is unaffected.
 *
 * -----------------------------------------------------------------------
 * SQL to create the audit_log table:
 * -----------------------------------------------------------------------
 *
 * CREATE TABLE IF NOT EXISTS app.audit_log (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   tenant_id uuid NOT NULL REFERENCES app.tenants(id),
 *   actor_id text NOT NULL,
 *   actor_role text NOT NULL,
 *   action text NOT NULL,
 *   resource_type text NOT NULL,
 *   resource_id text,
 *   changes jsonb DEFAULT '{}',
 *   metadata jsonb DEFAULT '{}',
 *   ip_address text,
 *   created_at timestamptz NOT NULL DEFAULT now()
 * );
 * CREATE INDEX idx_audit_log_tenant ON app.audit_log(tenant_id, created_at DESC);
 * CREATE INDEX idx_audit_log_actor ON app.audit_log(actor_id, created_at DESC);
 * CREATE INDEX idx_audit_log_resource ON app.audit_log(resource_type, resource_id);
 */

import { DB_URL, TENANT_ID } from '@/lib/service-urls';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type AuditAction = 'create' | 'update' | 'delete' | 'view' | 'export' | 'login';

export interface AuditEntry {
  actorId: string;
  actorRole: string;
  action: AuditAction;
  resourceType: string; // 'employee', 'okr', 'performance_review', 'strength_assessment', etc.
  resourceId?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Core logger                                                        */
/* ------------------------------------------------------------------ */

/**
 * Insert a single audit entry into app.audit_log.
 *
 * This function dynamically imports `pg` so it can be used in both server
 * components and API routes without bundling issues.
 *
 * **Usage:** call without `await` for fire-and-forget semantics.
 *
 * ```ts
 * void logAudit({ actorId: '...', actorRole: 'manager', action: 'view', resourceType: 'employee' });
 * ```
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const { Pool } = await import('pg');

    const pool = new Pool({ connectionString: DB_URL });

    try {
      await pool.query(
        `INSERT INTO app.audit_log (
          tenant_id,
          actor_id,
          actor_role,
          action,
          resource_type,
          resource_id,
          changes,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          TENANT_ID,
          entry.actorId,
          entry.actorRole,
          entry.action,
          entry.resourceType,
          entry.resourceId ?? null,
          JSON.stringify(entry.changes ?? {}),
          JSON.stringify(entry.metadata ?? {}),
        ],
      );
    } finally {
      await pool.end();
    }
  } catch (error: unknown) {
    // Never throw — audit failures must not break the primary request.
    console.error('[audit-logger] Failed to write audit entry:', error);
  }
}

/* ------------------------------------------------------------------ */
/*  Convenience wrapper                                                */
/* ------------------------------------------------------------------ */

export interface AuditLogger {
  log: (
    action: AuditAction,
    resourceType: string,
    resourceId?: string,
    changes?: Record<string, { old: unknown; new: unknown }>,
    metadata?: Record<string, unknown>,
  ) => Promise<void>;
}

/**
 * Create a scoped audit logger pre-bound to a specific actor.
 *
 * ```ts
 * const audit = createAuditLogger(ctx.userId, ctx.role);
 * void audit.log('view', 'employee', employeeId);
 * ```
 */
export function createAuditLogger(actorId: string, actorRole: string): AuditLogger {
  return {
    log: (
      action: AuditAction,
      resourceType: string,
      resourceId?: string,
      changes?: Record<string, { old: unknown; new: unknown }>,
      metadata?: Record<string, unknown>,
    ): Promise<void> =>
      logAudit({
        actorId,
        actorRole,
        action,
        resourceType,
        resourceId,
        changes,
        metadata,
      }),
  };
}
