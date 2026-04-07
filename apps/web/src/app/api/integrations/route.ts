import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';

// GET /api/integrations — list webhooks, API keys, and integration logs
export async function GET() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    const [webhooksRes, apiKeysRes, logsRes] = await Promise.all([
      pool.query(`
        SELECT
          id, name, url, events, active, secret,
          last_triggered_at, failure_count, created_at
        FROM app.webhooks
        WHERE tenant_id = $1
        ORDER BY created_at DESC
      `, [TENANT_ID]),
      pool.query(`
        SELECT
          id, name, key_prefix, permissions, active,
          last_used_at, expires_at, created_at
        FROM app.api_keys
        WHERE tenant_id = $1
        ORDER BY created_at DESC
      `, [TENANT_ID]),
      pool.query(`
        SELECT
          id, integration_type, direction, status, request_url,
          response_status, payload_size, error_message,
          created_at
        FROM app.integration_logs
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT 100
      `, [TENANT_ID]),
    ]);

    const webhooks = webhooksRes.rows.map((w) => ({
      id: w.id,
      name: w.name,
      url: w.url,
      events: w.events,
      isActive: w.active,
      lastTriggeredAt: w.last_triggered_at,
      failureCount: w.failure_count,
      createdAt: w.created_at,
    }));

    const apiKeys = apiKeysRes.rows.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.key_prefix,
      permissions: k.permissions,
      isActive: k.active,
      lastUsedAt: k.last_used_at,
      expiresAt: k.expires_at,
      createdAt: k.created_at,
    }));

    const logs = logsRes.rows.map((l) => ({
      id: l.id,
      integrationType: l.integration_type,
      direction: l.direction,
      status: l.status,
      url: l.request_url,
      responseStatus: l.response_status,
      errorMessage: l.error_message,
      payloadSize: l.payload_size,
      createdAt: l.created_at,
    }));

    await pool.end();

    return NextResponse.json({ webhooks, apiKeys, logs });
  } catch (error) {
    console.error('Integrations GET error:', error);
    return NextResponse.json(
      { error: 'Entegrasyon verileri alinamadi', details: String(error) },
      { status: 500 },
    );
  }
}

// POST /api/integrations — create webhook or API key
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type } = body as { type: 'webhook' | 'api_key' };

    if (!type || !['webhook', 'api_key'].includes(type)) {
      return NextResponse.json(
        { error: "type zorunludur. Gecerli degerler: 'webhook', 'api_key'" },
        { status: 400 },
      );
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    if (type === 'webhook') {
      const { name, url, events } = body as {
        name: string;
        url: string;
        events: string[];
      };

      if (!name || !url || !events || events.length === 0) {
        await pool.end();
        return NextResponse.json(
          { error: 'name, url ve events zorunludur' },
          { status: 400 },
        );
      }

      // Generate a random secret for webhook signing
      const crypto = await import('crypto');
      const webhookSecret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

      const result = await pool.query(`
        INSERT INTO app.webhooks (tenant_id, name, url, events, secret, active, failure_count)
        VALUES ($1, $2, $3, $4, $5, true, 0)
        RETURNING id
      `, [TENANT_ID, name, url, JSON.stringify(events), webhookSecret]);

      await pool.end();

      return NextResponse.json({
        success: true,
        id: result.rows[0]?.id,
        secret: webhookSecret,
        message: 'Webhook olusturuldu. Secret\'i kaydedin, tekrar gosterilemez.',
      }, { status: 201 });
    }

    // API Key
    const { name, permissions, expiresInDays } = body as {
      name: string;
      permissions: string[];
      expiresInDays?: number;
    };

    if (!name || !permissions || permissions.length === 0) {
      await pool.end();
      return NextResponse.json(
        { error: 'name ve permissions zorunludur' },
        { status: 400 },
      );
    }

    const crypto = await import('crypto');
    const keyRaw = `upk_${crypto.randomBytes(32).toString('hex')}`;
    const keyPrefix = keyRaw.substring(0, 12) + '...';
    const keyHash = crypto.createHash('sha256').update(keyRaw).digest('hex');
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const result = await pool.query(`
      INSERT INTO app.api_keys (tenant_id, name, key_prefix, key_hash, permissions, active, expires_at)
      VALUES ($1, $2, $3, $4, $5, true, $6)
      RETURNING id
    `, [TENANT_ID, name, keyPrefix, keyHash, JSON.stringify(permissions), expiresAt]);

    await pool.end();

    return NextResponse.json({
      success: true,
      id: result.rows[0]?.id,
      key: keyRaw,
      message: 'API anahtari olusturuldu. Anahtari kaydedin, tekrar gosterilemez.',
    }, { status: 201 });
  } catch (error) {
    console.error('Integrations POST error:', error);
    return NextResponse.json(
      { error: 'Entegrasyon olusturulamadi', details: String(error) },
      { status: 500 },
    );
  }
}

// PATCH /api/integrations — toggle webhook or API key active status
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, id, isActive } = body as {
      type: 'webhook' | 'api_key';
      id: string;
      isActive: boolean;
    };

    if (!type || !id || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'type, id ve isActive zorunludur' },
        { status: 400 },
      );
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    const table = type === 'webhook' ? 'app.webhooks' : 'app.api_keys';

    await pool.query(`
      UPDATE ${table}
      SET active = $1
      WHERE id = $2 AND tenant_id = $3
    `, [isActive, id, TENANT_ID]);

    await pool.end();

    const label = type === 'webhook' ? 'Webhook' : 'API anahtari';
    const statusLabel = isActive ? 'aktif' : 'pasif';

    return NextResponse.json({
      success: true,
      message: `${label} ${statusLabel} yapildi`,
    });
  } catch (error) {
    console.error('Integrations PATCH error:', error);
    return NextResponse.json(
      { error: 'Entegrasyon durumu guncellenemedi', details: String(error) },
      { status: 500 },
    );
  }
}

// DELETE /api/integrations — remove webhook or API key
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, id } = body as { type: 'webhook' | 'api_key'; id: string };

    if (!type || !id) {
      return NextResponse.json(
        { error: 'type ve id zorunludur' },
        { status: 400 },
      );
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    const table = type === 'webhook' ? 'app.webhooks' : 'app.api_keys';

    await pool.query(`
      DELETE FROM ${table}
      WHERE id = $1 AND tenant_id = $2
    `, [id, TENANT_ID]);

    await pool.end();

    const label = type === 'webhook' ? 'Webhook' : 'API anahtari';

    return NextResponse.json({
      success: true,
      message: `${label} silindi`,
    });
  } catch (error) {
    console.error('Integrations DELETE error:', error);
    return NextResponse.json(
      { error: 'Entegrasyon silinemedi', details: String(error) },
      { status: 500 },
    );
  }
}
