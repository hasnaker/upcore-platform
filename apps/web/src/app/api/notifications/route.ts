import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';

// Production'da NOTIFICATION_SERVICE_URL env'i web container'da set edilmediği
// için gateway üzerinden proxy yapıyoruz; gateway routes.prod.yaml'da
// /api/v1/notifications zaten notification servisine forward ediyor.
const notificationBase = (() => {
  const direct = process.env['NOTIFICATION_SERVICE_URL'];
  if (direct) return `${direct}/api/v1/notifications`;
  return `${SERVICES.gateway}/api/v1/notifications`;
})();

interface Notification {
  id: string;
  type: 'risk' | 'deadline' | 'feedback' | 'review' | 'application' | 'system';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  body: string;
  source: string;
  createdAt: string;
  read: boolean;
}

const priorityRank: Record<Notification['priority'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const mapPriority = (severity?: string): Notification['priority'] => {
  switch ((severity || '').toLowerCase()) {
    case 'error':
      return 'critical';
    case 'warning':
      return 'high';
    case 'success':
      return 'low';
    default:
      return 'medium';
  }
};

const mapType = (category?: string): Notification['type'] => {
  const normalized = (category || '').toLowerCase();
  if (normalized.includes('risk') || normalized.includes('burnout')) return 'risk';
  if (normalized.includes('deadline') || normalized.includes('due')) return 'deadline';
  if (normalized.includes('feedback')) return 'feedback';
  if (normalized.includes('review')) return 'review';
  if (normalized.includes('application')) return 'application';
  return 'system';
};

interface JsonRecord {
  items?: unknown;
  count?: unknown;
}

const readJson = async (response: Response): Promise<JsonRecord> => {
  try {
    const data = (await response.json()) as unknown;
    if (data && typeof data === 'object') {
      return data as JsonRecord;
    }
    return {};
  } catch {
    return {};
  }
};

type InAppNotification = {
  id: string;
  severity?: string;
  category?: string;
  title_tr?: string;
  body_tr?: string;
  created_at?: string;
  read_at?: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const ctx = await getRequestContext(request);
    const headers = buildServiceHeaders(ctx);

    const [inappRes, unreadRes] = await Promise.all([
      fetch(`${notificationBase}/inapp?limit=20`, { headers }),
      fetch(`${notificationBase}/inapp/unread-count`, { headers }),
    ]);

    const inappData = inappRes.ok ? await readJson(inappRes) : { items: [] };
    const unreadData = unreadRes.ok ? await readJson(unreadRes) : { count: 0 };

    const rawItems = (Array.isArray(inappData.items) ? inappData.items : []) as InAppNotification[];
    const notifications: Notification[] = rawItems.map((item) => {
      const priority = mapPriority(item.severity);
      return {
        id: item.id,
        type: mapType(item.category),
        priority,
        title: item.title_tr || 'Bildirim',
        body: item.body_tr || '',
        source: item.category || 'Notification',
        createdAt: item.created_at || new Date().toISOString(),
        read: Boolean(item.read_at),
      };
    });

    notifications.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);

    return NextResponse.json({
      notifications,
      unreadCount: Number(unreadData.count ?? notifications.filter((n) => !n.read).length),
      criticalCount: notifications.filter((n) => n.priority === 'critical').length,
    });
  } catch (error) {
    console.error('Notifications API error:', error);
    return NextResponse.json({ notifications: [], unreadCount: 0, criticalCount: 0 }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    const headers = buildServiceHeaders(ctx);
    const body = await req.json();
    const { action, notificationIds } = body as {
      action?: string;
      notificationIds?: string[];
    };

    if (action !== 'mark_read') {
      return NextResponse.json(
        { error: "Geçersiz aksiyon. Geçerli değer: 'mark_read'" },
        { status: 400 },
      );
    }

    const ids = Array.isArray(notificationIds) ? notificationIds.filter(Boolean) : [];

    if (ids.length === 0) {
      await fetch(`${notificationBase}/inapp/read-all`, {
        method: 'POST',
        headers,
      });
      return NextResponse.json({
        success: true,
        markedIds: [],
        message: 'Tüm bildirimler okundu olarak işaretlendi',
      });
    }

    await Promise.all(
      ids.map((id) =>
        fetch(`${notificationBase}/inapp/${id}/read`, {
          method: 'POST',
          headers,
        }),
      ),
    );

    return NextResponse.json({
      success: true,
      markedIds: ids,
      message: 'Bildirimler okundu olarak işaretlendi',
    });
  } catch (error) {
    console.error('Notifications PATCH error:', error);
    return NextResponse.json({ error: 'Bildirimler güncellenemedi' }, { status: 500 });
  }
}
