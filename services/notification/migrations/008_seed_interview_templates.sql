-- 008_seed_interview_templates.sql
-- Mülakat davet, hatırlatma, iptal email template'leri + onboarding saga
-- sonrası teklif kabul / reddetme template'leri.

INSERT INTO notification_templates (tenant_id, template_key, channel, locale, subject, body, variables, active) VALUES

-- 1) Mülakat davet email — adaya
(NULL, 'interview_invitation', 'email', 'tr-TR',
 '{{.company_name}} - Mülakat Daveti · {{.position_title}}',
 '<p>Sayın {{.candidate_name}},</p>
<p><strong>{{.company_name}}</strong> olarak, <strong>{{.position_title}}</strong> pozisyonu için sizinle görüşmek istiyoruz.</p>
<ul>
  <li><strong>Tarih:</strong> {{.interview_date}}</li>
  <li><strong>Saat:</strong> {{.interview_time}}</li>
  <li><strong>Format:</strong> {{.format}} ({{.location}})</li>
  <li><strong>Tahmini süre:</strong> {{.duration}} dakika</li>
</ul>
<p><strong>Görüşecekleriniz:</strong> {{.interviewers}}</p>
<p>Mülakata katılım sağlayamayacaksanız en geç 24 saat öncesinden bu emaile yanıt verin.</p>
<p>Kolay gelsin,<br/>{{.company_name}} İnsan Kaynakları</p>',
 '["candidate_name","company_name","position_title","interview_date","interview_time","format","location","duration","interviewers"]', true),

(NULL, 'interview_invitation', 'email', 'en-US',
 '{{.company_name}} - Interview Invitation · {{.position_title}}',
 '<p>Dear {{.candidate_name}},</p>
<p><strong>{{.company_name}}</strong> would like to meet with you regarding the <strong>{{.position_title}}</strong> role.</p>
<ul>
  <li><strong>Date:</strong> {{.interview_date}}</li>
  <li><strong>Time:</strong> {{.interview_time}}</li>
  <li><strong>Format:</strong> {{.format}} ({{.location}})</li>
  <li><strong>Duration:</strong> {{.duration}} minutes</li>
</ul>
<p><strong>Interviewers:</strong> {{.interviewers}}</p>
<p>If you cannot attend, please reply to this email at least 24 hours in advance.</p>
<p>Best regards,<br/>{{.company_name}} HR Team</p>',
 '["candidate_name","company_name","position_title","interview_date","interview_time","format","location","duration","interviewers"]', true),

-- 2) Mülakat hatırlatma — bir gün önce
(NULL, 'interview_reminder', 'email', 'tr-TR',
 'Yarınki Mülakat Hatırlatması: {{.position_title}}',
 '<p>Sayın {{.candidate_name}},</p>
<p>Yarın <strong>{{.interview_time}}</strong> saatinde <strong>{{.position_title}}</strong> pozisyonu için mülakatınız bulunmaktadır.</p>
<p><strong>Nerede:</strong> {{.location}}<br/>
<strong>Kimlerle:</strong> {{.interviewers}}</p>
<p>Başarılar dileriz.</p>',
 '["candidate_name","position_title","interview_time","location","interviewers"]', true),

-- 3) Mülakat iptali
(NULL, 'interview_cancelled', 'email', 'tr-TR',
 'Mülakat İptal: {{.position_title}}',
 '<p>Sayın {{.candidate_name}},</p>
<p>{{.interview_date}} tarihinde planlanan {{.position_title}} pozisyonu mülakatı iptal edilmiştir. Yeni tarih tarafınıza ayrıca bildirilecektir.</p>
<p>Anlayışınız için teşekkür ederiz.</p>',
 '["candidate_name","position_title","interview_date"]', true),

-- 4) Teklif gönderildi (adaya)
(NULL, 'offer_sent', 'email', 'tr-TR',
 'Teklif Mektubunuz: {{.position_title}}',
 '<p>Sayın {{.candidate_name}},</p>
<p>Sizinle birlikte çalışmaktan mutluluk duyacağımız için <strong>{{.position_title}}</strong> pozisyonu için resmi teklifimizi gönderiyoruz.</p>
<p>Detaylı teklif mektubunu görmek ve yanıtlamak için aşağıdaki bağlantıyı kullanın (14 gün geçerli):</p>
<p><a href="{{.accept_url}}">Teklifi Görüntüle ve Yanıtla</a></p>
<p>Sorularınız için bize her zaman ulaşabilirsiniz.</p>',
 '["candidate_name","position_title","accept_url"]', true),

-- 5) Onboarding welcome (işe başlayan yeni personele)
(NULL, 'onboarding_welcome', 'email', 'tr-TR',
 'Aramıza Hoş Geldiniz, {{.first_name}}!',
 '<p>Merhaba {{.first_name}},</p>
<p><strong>{{.company_name}}</strong> ailesine hoş geldiniz. İlk günleriniz için onboarding programınız başladı.</p>
<ul>
  <li>İşe başlama: {{.start_date}}</li>
  <li>Yöneticiniz: {{.manager_name}}</li>
  <li>İlk gün checklist: {{.checklist_url}}</li>
</ul>
<p>Sorularınız olursa İK ekibi her zaman yanınızda.</p>',
 '["first_name","company_name","start_date","manager_name","checklist_url"]', true),

-- 6) DLQ alarm (IK admin için — mevcut DLQ watcher ile uyumlu)
(NULL, 'dlq_alert', 'email', 'tr-TR',
 'UpCore DLQ Uyarısı: {{.service_name}}/{{.event_type}}',
 '<p>Dikkat: <strong>{{.service_name}}</strong> servisi <code>{{.event_type}}</code> event''ini {{.attempts}} denemeden sonra teslim edemedi.</p>
<p><strong>Son hata:</strong> <code>{{.last_error}}</code></p>
<p><a href="{{.dlq_url}}">DLQ Paneli</a></p>',
 '["service_name","event_type","attempts","last_error","dlq_url"]', true)

ON CONFLICT (tenant_id, template_key, channel, locale) DO NOTHING;
