'use client';

import { useState, useEffect, useCallback } from 'react';

/* ─── Types ─── */
interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  failureCount: number;
  createdAt: string;
}

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface IntegrationLog {
  id: string;
  integrationType: string;
  direction: 'inbound' | 'outbound';
  status: 'success' | 'error' | 'timeout';
  url: string;
  requestMethod: string;
  responseStatus: number;
  errorMessage: string | null;
  durationMs: number;
  createdAt: string;
}

type TabKey = 'webhooks' | 'api_keys' | 'logs';

/* ─── Constants ─── */
const AVAILABLE_EVENTS = [
  'employee.created',
  'employee.updated',
  'employee.terminated',
  'leave.requested',
  'leave.approved',
  'leave.rejected',
  'survey.completed',
  'assessment.completed',
  'document.uploaded',
  'burnout.alert',
];

const AVAILABLE_PERMISSIONS = [
  'employees:read',
  'employees:write',
  'departments:read',
  'departments:write',
  'leaves:read',
  'leaves:write',
  'surveys:read',
  'documents:read',
  'documents:write',
  'analytics:read',
];

const STATUS_COLORS: { [k: string]: { bg: string; text: string; label: string } } = {
  success: { bg: '#D1FAE5', text: '#059669', label: 'Basarili' },
  error: { bg: '#FEE2E2', text: '#DC2626', label: 'Hata' },
  timeout: { bg: '#FEF3C7', text: '#D97706', label: 'Zaman Asimi' },
};

const DIRECTION_LABELS: { [k: string]: { label: string; bg: string; text: string } } = {
  inbound: { label: 'Gelen', bg: '#EEF0FD', text: '#5E5CE6' },
  outbound: { label: 'Giden', bg: '#F3F4F6', text: '#6B7280' },
};

/* ─── Fallback Data ─── */
const FALLBACK_WEBHOOKS: Webhook[] = [
  {
    id: 'wh-1',
    name: 'HR Bildirim Sistemi',
    url: 'https://hr-system.example.com/webhooks/upcore',
    events: ['employee.created', 'employee.updated', 'employee.terminated'],
    isActive: true,
    lastTriggeredAt: '2026-04-05T14:30:00Z',
    failureCount: 0,
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'wh-2',
    name: 'Slack Bildirimleri',
    url: 'https://hooks.slack.com/services/T00/B00/xxxx',
    events: ['burnout.alert', 'survey.completed'],
    isActive: true,
    lastTriggeredAt: '2026-04-04T09:15:00Z',
    failureCount: 2,
    createdAt: '2026-02-20T08:00:00Z',
  },
  {
    id: 'wh-3',
    name: 'Muhasebe Entegrasyonu',
    url: 'https://accounting.example.com/api/hooks',
    events: ['leave.approved', 'employee.terminated'],
    isActive: false,
    lastTriggeredAt: '2026-03-10T16:00:00Z',
    failureCount: 8,
    createdAt: '2026-01-05T12:00:00Z',
  },
];

const FALLBACK_API_KEYS: ApiKey[] = [
  {
    id: 'ak-1',
    name: 'Mobil Uygulama',
    keyPrefix: 'upk_a3f8b2c1...',
    permissions: ['employees:read', 'leaves:read', 'leaves:write'],
    isActive: true,
    lastUsedAt: '2026-04-06T08:00:00Z',
    expiresAt: '2026-12-31T23:59:59Z',
    createdAt: '2026-01-01T10:00:00Z',
  },
  {
    id: 'ak-2',
    name: 'BI Dashboard',
    keyPrefix: 'upk_7e2d4f9a...',
    permissions: ['employees:read', 'departments:read', 'analytics:read', 'surveys:read'],
    isActive: true,
    lastUsedAt: '2026-04-05T22:00:00Z',
    expiresAt: null,
    createdAt: '2026-02-15T14:00:00Z',
  },
  {
    id: 'ak-3',
    name: 'Eski Sistem (Migrasyon)',
    keyPrefix: 'upk_1b5c8d3e...',
    permissions: ['employees:read', 'employees:write', 'documents:read'],
    isActive: false,
    lastUsedAt: '2026-03-01T10:00:00Z',
    expiresAt: '2026-03-31T23:59:59Z',
    createdAt: '2025-12-01T09:00:00Z',
  },
];

const FALLBACK_LOGS: IntegrationLog[] = [
  { id: 'log-1', integrationType: 'webhook', direction: 'outbound', status: 'success', url: 'https://hr-system.example.com/webhooks/upcore', requestMethod: 'POST', responseStatus: 200, errorMessage: null, durationMs: 245, createdAt: '2026-04-06T09:30:00Z' },
  { id: 'log-2', integrationType: 'api_key', direction: 'inbound', status: 'success', url: '/api/v1/employees', requestMethod: 'GET', responseStatus: 200, errorMessage: null, durationMs: 89, createdAt: '2026-04-06T09:28:00Z' },
  { id: 'log-3', integrationType: 'webhook', direction: 'outbound', status: 'error', url: 'https://accounting.example.com/api/hooks', requestMethod: 'POST', responseStatus: 503, errorMessage: 'Service Unavailable', durationMs: 5002, createdAt: '2026-04-06T09:15:00Z' },
  { id: 'log-4', integrationType: 'api_key', direction: 'inbound', status: 'success', url: '/api/v1/analytics/burnout', requestMethod: 'GET', responseStatus: 200, errorMessage: null, durationMs: 312, createdAt: '2026-04-06T08:45:00Z' },
  { id: 'log-5', integrationType: 'webhook', direction: 'outbound', status: 'success', url: 'https://hooks.slack.com/services/T00/B00/xxxx', requestMethod: 'POST', responseStatus: 200, errorMessage: null, durationMs: 180, createdAt: '2026-04-06T08:30:00Z' },
  { id: 'log-6', integrationType: 'webhook', direction: 'outbound', status: 'timeout', url: 'https://accounting.example.com/api/hooks', requestMethod: 'POST', responseStatus: 0, errorMessage: 'Connection timed out after 5000ms', durationMs: 5000, createdAt: '2026-04-05T16:00:00Z' },
  { id: 'log-7', integrationType: 'api_key', direction: 'inbound', status: 'success', url: '/api/v1/leaves/requests', requestMethod: 'POST', responseStatus: 201, errorMessage: null, durationMs: 156, createdAt: '2026-04-05T14:20:00Z' },
  { id: 'log-8', integrationType: 'api_key', direction: 'inbound', status: 'error', url: '/api/v1/employees/invalid-id', requestMethod: 'GET', responseStatus: 404, errorMessage: 'Employee not found', durationMs: 12, createdAt: '2026-04-05T13:10:00Z' },
];

/* ─── Helpers ─── */
const maskUrl = (url: string) => {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}/***`;
  } catch {
    return url.substring(0, 30) + '***';
  }
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
};

const timeAgo = (dateStr: string | null) => {
  if (!dateStr) return 'Hic';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} dk once`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat once`;
  const days = Math.floor(hours / 24);
  return `${days} gun once`;
};

/* ─── Component ─── */
export default function EntegrasyonlarPage() {
  const [tab, setTab] = useState<TabKey>('webhooks');
  const [webhooks, setWebhooks] = useState<Webhook[]>(FALLBACK_WEBHOOKS);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(FALLBACK_API_KEYS);
  const [logs, setLogs] = useState<IntegrationLog[]>(FALLBACK_LOGS);

  // Webhook modal
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [whName, setWhName] = useState('');
  const [whUrl, setWhUrl] = useState('');
  const [whEvents, setWhEvents] = useState<string[]>([]);

  // API Key modal
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [akName, setAkName] = useState('');
  const [akPermissions, setAkPermissions] = useState<string[]>([]);
  const [akExpiryDays, setAkExpiryDays] = useState<number>(365);

  // Created key/secret display
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(() => {
    fetch('/api/integrations')
      .then((r) => r.json())
      .then((data) => {
        if (data.webhooks && data.webhooks.length > 0) setWebhooks(data.webhooks);
        if (data.apiKeys && data.apiKeys.length > 0) setApiKeys(data.apiKeys);
        if (data.logs && data.logs.length > 0) setLogs(data.logs);
      })
      .catch(() => {
        // API failed — keep fallback data
      });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggle = (type: 'webhook' | 'api_key', id: string, currentActive: boolean) => {
    const newActive = !currentActive;

    if (type === 'webhook') {
      setWebhooks((prev) => prev.map((w) => (w.id === id ? { ...w, isActive: newActive } : w)));
    } else {
      setApiKeys((prev) => prev.map((k) => (k.id === id ? { ...k, isActive: newActive } : k)));
    }

    fetch('/api/integrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, isActive: newActive }),
    }).catch(() => {
      // Revert on error
      if (type === 'webhook') {
        setWebhooks((prev) => prev.map((w) => (w.id === id ? { ...w, isActive: currentActive } : w)));
      } else {
        setApiKeys((prev) => prev.map((k) => (k.id === id ? { ...k, isActive: currentActive } : k)));
      }
    });
  };

  const handleDelete = (type: 'webhook' | 'api_key', id: string) => {
    if (type === 'webhook') {
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } else {
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
    }

    fetch('/api/integrations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id }),
    }).catch(() => {
      // Refetch on error
      fetchData();
    });
  };

  const handleCreateWebhook = () => {
    if (!whName || !whUrl || whEvents.length === 0) return;
    setSubmitting(true);

    fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'webhook', name: whName, url: whUrl, events: whEvents }),
    })
      .then((r) => r.json())
      .then((data) => {
        const newWebhook: Webhook = {
          id: data.id || `wh-${Date.now()}`,
          name: whName,
          url: whUrl,
          events: whEvents,
          isActive: true,
          lastTriggeredAt: null,
          failureCount: 0,
          createdAt: new Date().toISOString(),
        };
        setWebhooks((prev) => [newWebhook, ...prev]);
        if (data.secret) {
          setCreatedSecret(data.secret);
        }
        setWebhookModalOpen(false);
        setWhName('');
        setWhUrl('');
        setWhEvents([]);
      })
      .catch(() => {
        // Fallback local add
        const newWebhook: Webhook = {
          id: `wh-${Date.now()}`,
          name: whName,
          url: whUrl,
          events: whEvents,
          isActive: true,
          lastTriggeredAt: null,
          failureCount: 0,
          createdAt: new Date().toISOString(),
        };
        setWebhooks((prev) => [newWebhook, ...prev]);
        setWebhookModalOpen(false);
        setWhName('');
        setWhUrl('');
        setWhEvents([]);
      })
      .finally(() => setSubmitting(false));
  };

  const handleCreateApiKey = () => {
    if (!akName || akPermissions.length === 0) return;
    setSubmitting(true);

    fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'api_key', name: akName, permissions: akPermissions, expiresInDays: akExpiryDays }),
    })
      .then((r) => r.json())
      .then((data) => {
        const newKey: ApiKey = {
          id: data.id || `ak-${Date.now()}`,
          name: akName,
          keyPrefix: data.key ? data.key.substring(0, 12) + '...' : 'upk_xxxx...',
          permissions: akPermissions,
          isActive: true,
          lastUsedAt: null,
          expiresAt: akExpiryDays ? new Date(Date.now() + akExpiryDays * 86400000).toISOString() : null,
          createdAt: new Date().toISOString(),
        };
        setApiKeys((prev) => [newKey, ...prev]);
        if (data.key) {
          setCreatedKey(data.key);
        }
        setApiKeyModalOpen(false);
        setAkName('');
        setAkPermissions([]);
        setAkExpiryDays(365);
      })
      .catch(() => {
        // Fallback local add
        const newKey: ApiKey = {
          id: `ak-${Date.now()}`,
          name: akName,
          keyPrefix: 'upk_xxxx...',
          permissions: akPermissions,
          isActive: true,
          lastUsedAt: null,
          expiresAt: akExpiryDays ? new Date(Date.now() + akExpiryDays * 86400000).toISOString() : null,
          createdAt: new Date().toISOString(),
        };
        setApiKeys((prev) => [newKey, ...prev]);
        setApiKeyModalOpen(false);
        setAkName('');
        setAkPermissions([]);
        setAkExpiryDays(365);
      })
      .finally(() => setSubmitting(false));
  };

  const toggleEvent = (event: string) => {
    setWhEvents((prev) => (prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]));
  };

  const togglePermission = (perm: string) => {
    setAkPermissions((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111' }}>Entegrasyonlar</h1>
        <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>
          Webhook, API anahtari ve dis sistem entegrasyonlarini yonetin.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #f0f0f0' }}>
        {([
          { key: 'webhooks' as const, label: "Webhook'lar", count: webhooks.length },
          { key: 'api_keys' as const, label: 'API Anahtarlari', count: apiKeys.length },
          { key: 'logs' as const, label: 'Baglanti Loglari', count: logs.length },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? '#5E5CE6' : '#888',
              borderBottom: tab === t.key ? '2px solid #5E5CE6' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {t.label}
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 10,
                background: tab === t.key ? '#EEF0FD' : '#f5f5f5',
                color: tab === t.key ? '#5E5CE6' : '#aaa',
              }}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ─── Webhooks Tab ─── */}
      {tab === 'webhooks' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <button
              onClick={() => setWebhookModalOpen(true)}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'white',
                background: '#111',
                border: 'none',
                borderRadius: 10,
                padding: '10px 20px',
                cursor: 'pointer',
              }}
            >
              + Yeni Webhook
            </button>
          </div>

          {webhooks.map((wh) => (
            <div
              key={wh.id}
              style={{
                background: 'white',
                border: '1px solid #f0f0f0',
                borderRadius: 12,
                padding: '20px 24px',
                opacity: wh.isActive ? 1 : 0.6,
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{wh.name}</span>
                    {wh.failureCount > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#FEE2E2', color: '#DC2626' }}>
                        {wh.failureCount} hata
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: '#888', fontFamily: 'monospace' }}>{maskUrl(wh.url)}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                    {(typeof wh.events === 'string' ? JSON.parse(wh.events) : wh.events).map((evt: string) => (
                      <span
                        key={evt}
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 8,
                          background: '#EEF0FD',
                          color: '#5E5CE6',
                        }}
                      >
                        {evt}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>
                    Son tetikleme: {timeAgo(wh.lastTriggeredAt)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {/* Active toggle */}
                  <button
                    onClick={() => handleToggle('webhook', wh.id, wh.isActive)}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      border: 'none',
                      background: wh.isActive ? '#059669' : '#D4D4D4',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: 'white',
                        position: 'absolute',
                        top: 3,
                        left: wh.isActive ? 23 : 3,
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </button>
                  <button
                    onClick={() => handleDelete('webhook', wh.id)}
                    style={{
                      fontSize: 12,
                      color: '#DC2626',
                      background: 'none',
                      border: '1px solid #FEE2E2',
                      borderRadius: 8,
                      padding: '6px 10px',
                      cursor: 'pointer',
                    }}
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}

          {webhooks.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: '#aaa', fontSize: 14 }}>
              Henuz webhook bulunmuyor.
            </div>
          )}
        </div>
      )}

      {/* ─── API Keys Tab ─── */}
      {tab === 'api_keys' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <button
              onClick={() => setApiKeyModalOpen(true)}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'white',
                background: '#111',
                border: 'none',
                borderRadius: 10,
                padding: '10px 20px',
                cursor: 'pointer',
              }}
            >
              + Yeni API Anahtari
            </button>
          </div>

          {apiKeys.map((ak) => {
            const isExpired = ak.expiresAt && new Date(ak.expiresAt) < new Date();
            return (
              <div
                key={ak.id}
                style={{
                  background: 'white',
                  border: '1px solid #f0f0f0',
                  borderRadius: 12,
                  padding: '20px 24px',
                  opacity: ak.isActive ? 1 : 0.6,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{ak.name}</span>
                      {isExpired && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#FEE2E2', color: '#DC2626' }}>
                          Suresi Doldu
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: '#888', fontFamily: 'monospace', background: '#FAFAFA', display: 'inline-block', padding: '2px 8px', borderRadius: 6 }}>
                      {ak.keyPrefix}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                      {(typeof ak.permissions === 'string' ? JSON.parse(ak.permissions) : ak.permissions).map((perm: string) => (
                        <span
                          key={perm}
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 8,
                            background: '#F3F4F6',
                            color: '#6B7280',
                          }}
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: '#aaa', marginTop: 8, display: 'flex', gap: 16 }}>
                      <span>Son kullanim: {timeAgo(ak.lastUsedAt)}</span>
                      {ak.expiresAt && <span>Bitis: {formatDate(ak.expiresAt)}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      onClick={() => handleToggle('api_key', ak.id, ak.isActive)}
                      style={{
                        width: 44,
                        height: 24,
                        borderRadius: 12,
                        border: 'none',
                        background: ak.isActive ? '#059669' : '#D4D4D4',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'background 0.2s',
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: 'white',
                          position: 'absolute',
                          top: 3,
                          left: ak.isActive ? 23 : 3,
                          transition: 'left 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }}
                      />
                    </button>
                    <button
                      onClick={() => handleDelete('api_key', ak.id)}
                      style={{
                        fontSize: 12,
                        color: '#DC2626',
                        background: 'none',
                        border: '1px solid #FEE2E2',
                        borderRadius: 8,
                        padding: '6px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {apiKeys.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: '#aaa', fontSize: 14 }}>
              Henuz API anahtari bulunmuyor.
            </div>
          )}
        </div>
      )}

      {/* ─── Logs Tab ─── */}
      {tab === 'logs' && (
        <div>
          <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden' }}>
            {/* Table Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '100px 80px 80px 1fr 80px 140px',
                gap: 12,
                padding: '12px 24px',
                background: '#FAFAFA',
                borderBottom: '1px solid #f0f0f0',
                fontSize: 11,
                fontWeight: 700,
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              <span>Tip</span>
              <span>Yon</span>
              <span>Durum</span>
              <span>URL</span>
              <span>Sure</span>
              <span>Tarih</span>
            </div>

            {/* Table Rows */}
            {logs.map((log, i) => {
              const statusStyle = STATUS_COLORS[log.status] ?? STATUS_COLORS['success']!;
              const dirStyle = DIRECTION_LABELS[log.direction] ?? DIRECTION_LABELS['inbound']!;
              return (
                <div
                  key={log.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 80px 80px 1fr 80px 140px',
                    gap: 12,
                    padding: '14px 24px',
                    borderBottom: i < logs.length - 1 ? '1px solid #f0f0f0' : 'none',
                    alignItems: 'center',
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#525252' }}>
                    {log.integrationType === 'webhook' ? 'Webhook' : 'API Key'}
                  </span>
                  <span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: dirStyle.bg, color: dirStyle.text }}>
                      {dirStyle.label}
                    </span>
                  </span>
                  <span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: statusStyle.bg, color: statusStyle.text }}>
                      {statusStyle.label}
                    </span>
                  </span>
                  <span style={{ color: '#525252', fontFamily: 'monospace', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.requestMethod} {log.url}
                  </span>
                  <span style={{ color: '#888', fontSize: 12 }}>{log.durationMs}ms</span>
                  <span style={{ color: '#aaa', fontSize: 12 }}>{timeAgo(log.createdAt)}</span>
                </div>
              );
            })}

            {logs.length === 0 && (
              <div style={{ textAlign: 'center', padding: 48, color: '#aaa', fontSize: 14 }}>
                Henuz baglanti logu bulunmuyor.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Webhook Create Modal ─── */}
      {webhookModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setWebhookModalOpen(false)}
        >
          <div
            style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 4 }}>Yeni Webhook</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Dis sisteme olay bildirimi gondermek icin webhook olusturun.</div>

            <div className="flex flex-col gap-4">
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#525252', display: 'block', marginBottom: 6 }}>Webhook Adi</label>
                <input
                  type="text"
                  value={whName}
                  onChange={(e) => setWhName(e.target.value)}
                  placeholder="ornek: Slack Bildirimleri"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e5e5', borderRadius: 10, fontSize: 14, color: '#111' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#525252', display: 'block', marginBottom: 6 }}>URL</label>
                <input
                  type="url"
                  value={whUrl}
                  onChange={(e) => setWhUrl(e.target.value)}
                  placeholder="https://example.com/webhook"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e5e5', borderRadius: 10, fontSize: 14, color: '#111' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#525252', display: 'block', marginBottom: 6 }}>Olaylar</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {AVAILABLE_EVENTS.map((evt) => {
                    const selected = whEvents.includes(evt);
                    return (
                      <button
                        key={evt}
                        onClick={() => toggleEvent(evt)}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: 8,
                          border: `1px solid ${selected ? '#5E5CE6' : '#e5e5e5'}`,
                          background: selected ? '#EEF0FD' : 'white',
                          color: selected ? '#5E5CE6' : '#888',
                          cursor: 'pointer',
                        }}
                      >
                        {evt}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3" style={{ marginTop: 24 }}>
              <button
                onClick={() => setWebhookModalOpen(false)}
                style={{ fontSize: 13, fontWeight: 600, color: '#888', background: 'none', border: '1px solid #e5e5e5', borderRadius: 10, padding: '10px 20px', cursor: 'pointer' }}
              >
                Iptal
              </button>
              <button
                onClick={handleCreateWebhook}
                disabled={!whName || !whUrl || whEvents.length === 0 || submitting}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'white',
                  background: !whName || !whUrl || whEvents.length === 0 ? '#ccc' : '#111',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 20px',
                  cursor: !whName || !whUrl || whEvents.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Olusturuluyor...' : 'Webhook Olustur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── API Key Create Modal ─── */}
      {apiKeyModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setApiKeyModalOpen(false)}
        >
          <div
            style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 4 }}>Yeni API Anahtari</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Dis uygulamalarin Upcore API'sine erisimi icin anahtar olusturun.</div>

            <div className="flex flex-col gap-4">
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#525252', display: 'block', marginBottom: 6 }}>Anahtar Adi</label>
                <input
                  type="text"
                  value={akName}
                  onChange={(e) => setAkName(e.target.value)}
                  placeholder="ornek: Mobil Uygulama"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e5e5', borderRadius: 10, fontSize: 14, color: '#111' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#525252', display: 'block', marginBottom: 6 }}>Izinler</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {AVAILABLE_PERMISSIONS.map((perm) => {
                    const selected = akPermissions.includes(perm);
                    return (
                      <button
                        key={perm}
                        onClick={() => togglePermission(perm)}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: 8,
                          border: `1px solid ${selected ? '#5E5CE6' : '#e5e5e5'}`,
                          background: selected ? '#EEF0FD' : 'white',
                          color: selected ? '#5E5CE6' : '#888',
                          cursor: 'pointer',
                        }}
                      >
                        {perm}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#525252', display: 'block', marginBottom: 6 }}>Gecerlilik Suresi (gun)</label>
                <input
                  type="number"
                  value={akExpiryDays}
                  onChange={(e) => setAkExpiryDays(parseInt(e.target.value) || 0)}
                  min={0}
                  placeholder="0 = suresiz"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e5e5', borderRadius: 10, fontSize: 14, color: '#111' }}
                />
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>0 girerek suresiz anahtar olusturabilirsiniz.</div>
              </div>
            </div>

            <div className="flex justify-end gap-3" style={{ marginTop: 24 }}>
              <button
                onClick={() => setApiKeyModalOpen(false)}
                style={{ fontSize: 13, fontWeight: 600, color: '#888', background: 'none', border: '1px solid #e5e5e5', borderRadius: 10, padding: '10px 20px', cursor: 'pointer' }}
              >
                Iptal
              </button>
              <button
                onClick={handleCreateApiKey}
                disabled={!akName || akPermissions.length === 0 || submitting}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'white',
                  background: !akName || akPermissions.length === 0 ? '#ccc' : '#111',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 20px',
                  cursor: !akName || akPermissions.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Olusturuluyor...' : 'Anahtar Olustur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Created Secret/Key Display ─── */}
      {createdSecret && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}
          onClick={() => setCreatedSecret(null)}
        >
          <div
            style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: '#059669', marginBottom: 8 }}>Webhook Olusturuldu</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
              Asagidaki webhook secret degerini simdi kopyalayin. Bu deger tekrar gosterilemez.
            </div>
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: 14, fontFamily: 'monospace', fontSize: 13, color: '#111', wordBreak: 'break-all' }}>
              {createdSecret}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(createdSecret);
                setCreatedSecret(null);
              }}
              style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: 'white', background: '#111', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', width: '100%' }}
            >
              Kopyala ve Kapat
            </button>
          </div>
        </div>
      )}

      {createdKey && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}
          onClick={() => setCreatedKey(null)}
        >
          <div
            style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: '#059669', marginBottom: 8 }}>API Anahtari Olusturuldu</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
              Asagidaki API anahtarini simdi kopyalayin. Bu anahtar tekrar gosterilemez.
            </div>
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: 14, fontFamily: 'monospace', fontSize: 13, color: '#111', wordBreak: 'break-all' }}>
              {createdKey}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(createdKey);
                setCreatedKey(null);
              }}
              style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: 'white', background: '#111', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', width: '100%' }}
            >
              Kopyala ve Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
