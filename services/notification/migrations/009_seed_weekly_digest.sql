-- 009_seed_weekly_digest.sql
-- Haftalık IK yöneticisine Pazartesi sabahı özet email'i.

INSERT INTO notification_templates (tenant_id, template_key, channel, locale, subject, body, variables, active) VALUES

(NULL, 'weekly_digest', 'email', 'tr-TR',
 'Haftalık UpCore Özet · {{.week_label}}',
 '<div style="font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:0 auto;color:#111">
<h2>Haftalık UpCore Özeti</h2>
<p style="color:#666">Dönem: {{.week_label}}</p>
<hr/>
<h3>📊 Personel</h3>
<ul>
<li>Aktif çalışan: <strong>{{.active_headcount}}</strong></li>
<li>Bu hafta başlayan: <strong>{{.new_hires}}</strong></li>
<li>Bu hafta ayrılan: <strong>{{.departures}}</strong></li>
<li>Türnover (yıllık): <strong>{{.turnover_pct}}%</strong></li>
</ul>
<h3>💰 Bordro</h3>
<ul>
<li>Son bordro dönemi: <strong>{{.last_period}}</strong></li>
<li>Toplam ödenen net: <strong>{{.total_net_last_month}} TL</strong></li>
<li>Bekleyen onay: <strong>{{.pending_runs}}</strong></li>
</ul>
<h3>🚨 Risk Göstergeleri</h3>
<ul>
<li>BAT-TR kırmızı banddaki personel: <strong>{{.bat_red_count}}</strong></li>
<li>İstifa riski yüksek: <strong>{{.resignation_risk_count}}</strong></li>
<li>SLA aşan aksiyon: <strong>{{.overdue_actions}}</strong></li>
</ul>
<h3>📅 Bu Hafta</h3>
<ul>
<li>Başlayan onboarding: <strong>{{.onboarding_started}}</strong></li>
<li>Planlanmış mülakat: <strong>{{.interviews_scheduled}}</strong></li>
<li>Bekleyen izin talebi: <strong>{{.pending_leave_requests}}</strong></li>
</ul>
<hr/>
<p style="color:#999;font-size:12px">Bu özetin sıklığını değiştirmek için <a href="{{.prefs_url}}">Bildirim Tercihleri</a>''ni güncelleyebilirsiniz.</p>
</div>',
 '["week_label","active_headcount","new_hires","departures","turnover_pct","last_period","total_net_last_month","pending_runs","bat_red_count","resignation_risk_count","overdue_actions","onboarding_started","interviews_scheduled","pending_leave_requests","prefs_url"]', true)

ON CONFLICT (tenant_id, template_key, channel, locale) DO NOTHING;
