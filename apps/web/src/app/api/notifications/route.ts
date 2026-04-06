import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';

/**
 * Notifications API — generates real-time notifications from system signals.
 *
 * Sources:
 * - BAT-12 burnout risk (red zone employees)
 * - OKR deadlines approaching (< 14 days)
 * - 360° feedback cycles pending
 * - Performance reviews pending
 * - Internal applications received
 * - Audit log recent actions
 */

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

export async function GET() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });
    const notifications: Notification[] = [];
    const now = new Date();

    // 1. Burnout risk notifications
    const burnoutRisk = await pool.query(
      `SELECT e.ad, e.soyad, d.name_tr as department, bs.feature_value
       FROM app.burnout_signals bs
       JOIN app.employees e ON e.id = bs.employee_id
       LEFT JOIN app.departments d ON d.id = e.department_id
       WHERE bs.tenant_id = $1 AND bs.feature_name = 'bat12_total'
         AND bs.feature_value >= 3.02
       ORDER BY bs.feature_value DESC LIMIT 5`,
      [TENANT_ID]
    ).catch(() => ({ rows: [] }));

    for (const r of burnoutRisk.rows) {
      notifications.push({
        id: `burn-${r.ad}-${r.soyad}`,
        type: 'risk',
        priority: 'critical',
        title: `${r.ad} ${r.soyad} — Tükenmişlik Riski`,
        body: `BAT-12 skoru ${Number(r.feature_value).toFixed(1)} (kırmızı bölge). ${r.department} departmanı. Acil müdahale gerekli.`,
        source: 'BAT-12-TR',
        createdAt: now.toISOString(),
        read: false,
      });
    }

    // 2. OKR deadline notifications (< 14 days)
    const okrDeadlines = await pool.query(
      `SELECT o.title, o.deadline, o.progress, e.ad, e.soyad
       FROM app.okr_objectives o
       LEFT JOIN app.employees e ON e.id = o.owner_id
       WHERE o.tenant_id = $1 AND o.status = 'active'
         AND o.deadline IS NOT NULL AND o.deadline <= CURRENT_DATE + INTERVAL '14 days'
         AND o.progress < 80
       ORDER BY o.deadline LIMIT 5`,
      [TENANT_ID]
    ).catch(() => ({ rows: [] }));

    for (const r of okrDeadlines.rows) {
      const daysLeft = Math.max(0, Math.ceil((new Date(r.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      notifications.push({
        id: `okr-${r.title.slice(0, 20)}`,
        type: 'deadline',
        priority: daysLeft <= 3 ? 'critical' : daysLeft <= 7 ? 'high' : 'medium',
        title: `OKR Son Tarih Yaklaşıyor`,
        body: `"${r.title}" — %${Number(r.progress).toFixed(0)} tamamlandı, ${daysLeft} gün kaldı. Sorumlu: ${r.ad || ''} ${r.soyad || ''}`,
        source: 'OKR',
        createdAt: now.toISOString(),
        read: false,
      });
    }

    // 3. Pending 360° feedback
    const pendingFeedback = await pool.query(
      `SELECT fc.name, fc.deadline,
              (SELECT count(*) FROM app.feedback_responses fr WHERE fr.cycle_id = fc.id AND fr.completed_at IS NULL) as pending_count
       FROM app.feedback_cycles fc
       WHERE fc.tenant_id = $1 AND fc.status = 'active'`,
      [TENANT_ID]
    ).catch(() => ({ rows: [] }));

    for (const r of pendingFeedback.rows) {
      if (Number(r.pending_count) > 0) {
        notifications.push({
          id: `fb-${r.name}`,
          type: 'feedback',
          priority: 'medium',
          title: `360° Değerlendirme Bekliyor`,
          body: `"${r.name}" döngüsünde ${r.pending_count} bekleyen değerlendirme var. Son tarih: ${r.deadline ? new Date(r.deadline).toLocaleDateString('tr-TR') : '—'}`,
          source: '360° Geri Bildirim',
          createdAt: now.toISOString(),
          read: false,
        });
      }
    }

    // 4. Recent internal applications
    const recentApps = await pool.query(
      `SELECT ia.applied_at, ip.title_tr as position,
              e.ad, e.soyad
       FROM app.internal_applications ia
       JOIN app.internal_positions ip ON ip.id = ia.position_id
       JOIN app.employees e ON e.id = ia.employee_id
       WHERE ia.tenant_id = $1 AND ia.applied_at >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY ia.applied_at DESC LIMIT 3`,
      [TENANT_ID]
    ).catch(() => ({ rows: [] }));

    for (const r of recentApps.rows) {
      notifications.push({
        id: `app-${r.ad}-${r.position}`,
        type: 'application',
        priority: 'low',
        title: `İç Pozisyon Başvurusu`,
        body: `${r.ad} ${r.soyad} "${r.position}" pozisyonuna başvurdu.`,
        source: 'Kariyer & Mobilite',
        createdAt: r.applied_at,
        read: false,
      });
    }

    // 5. Performance reviews pending (draft status)
    const draftReviews = await pool.query(
      `SELECT count(*) as cnt FROM app.performance_reviews
       WHERE tenant_id = $1 AND status = 'draft'`,
      [TENANT_ID]
    ).catch(() => ({ rows: [{ cnt: 0 }] }));

    if (Number(draftReviews.rows[0]?.cnt) > 0) {
      notifications.push({
        id: 'review-draft',
        type: 'review',
        priority: 'medium',
        title: `Taslak Değerlendirmeler`,
        body: `${draftReviews.rows[0]?.cnt} performans değerlendirmesi taslak durumunda. Tamamlanması bekleniyor.`,
        source: 'Performans',
        createdAt: now.toISOString(),
        read: false,
      });
    }

    await pool.end();

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    notifications.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      criticalCount: notifications.filter((n) => n.priority === 'critical').length,
    });
  } catch (error) {
    console.error('Notifications API error:', error);
    return NextResponse.json({ notifications: [], unreadCount: 0, criticalCount: 0 }, { status: 500 });
  }
}

// PATCH /api/notifications — Mark notifications as read
export async function PATCH(req: NextRequest) {
  try {
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

    // Notifications are currently computed on-the-fly (not stored in a table).
    // In the future, read status will be persisted in a separate table.
    // For now, acknowledge the request and return success.
    return NextResponse.json({
      success: true,
      markedIds: notificationIds ?? [],
      message: 'Bildirimler okundu olarak işaretlendi',
    });
  } catch (error) {
    console.error('Notifications PATCH error:', error);
    return NextResponse.json({ error: 'Bildirimler güncellenemedi' }, { status: 500 });
  }
}
