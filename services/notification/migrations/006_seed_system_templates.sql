-- 006_seed_system_templates.sql
-- Seed system-wide notification templates in Turkish and English.
-- These are tenant-agnostic (tenant_id = NULL) and can be overridden per tenant.

INSERT INTO notification_templates (tenant_id, template_key, channel, locale, subject, body, variables, active) VALUES

-- Welcome email
(NULL, 'welcome', 'email', 'tr-TR',
 'UpCore''a Hosgeldiniz!',
 '<h2>Merhaba {{.first_name}},</h2><p>UpCore platformuna hosgeldiniz. Hesabiniz <strong>{{.email}}</strong> adresi ile olusturuldu.</p><p>Baslamak icin giris yapin.</p>',
 '["first_name", "email"]', true),

(NULL, 'welcome', 'email', 'en-US',
 'Welcome to UpCore!',
 '<h2>Hello {{.first_name}},</h2><p>Welcome to the UpCore platform. Your account has been created with <strong>{{.email}}</strong>.</p><p>Sign in to get started.</p>',
 '["first_name", "email"]', true),

-- Leave request submitted (to manager)
(NULL, 'leave_request_submitted', 'email', 'tr-TR',
 'Yeni Izin Talebi: {{.employee_name}}',
 '<p><strong>{{.employee_name}}</strong> yeni bir izin talebi olusturdu.</p><ul><li>Izin Turu: {{.leave_type}}</li><li>Baslangic: {{.start_date}}</li><li>Bitis: {{.end_date}}</li></ul><p>Onaylamak veya reddetmek icin sisteme giris yapin.</p>',
 '["employee_name", "leave_type", "start_date", "end_date"]', true),

(NULL, 'leave_request_submitted', 'email', 'en-US',
 'New Leave Request: {{.employee_name}}',
 '<p><strong>{{.employee_name}}</strong> submitted a new leave request.</p><ul><li>Type: {{.leave_type}}</li><li>Start: {{.start_date}}</li><li>End: {{.end_date}}</li></ul><p>Sign in to approve or reject.</p>',
 '["employee_name", "leave_type", "start_date", "end_date"]', true),

-- Leave request approved (to employee)
(NULL, 'leave_request_approved', 'email', 'tr-TR',
 'Izin Talebiniz Onaylandi',
 '<p>{{.leave_type}} izin talebiniz ({{.start_date}} - {{.end_date}}) <strong>{{.approved_by}}</strong> tarafindan onaylandi.</p>',
 '["leave_type", "start_date", "end_date", "approved_by"]', true),

(NULL, 'leave_request_approved', 'email', 'en-US',
 'Leave Request Approved',
 '<p>Your {{.leave_type}} leave request ({{.start_date}} - {{.end_date}}) has been approved by <strong>{{.approved_by}}</strong>.</p>',
 '["leave_type", "start_date", "end_date", "approved_by"]', true),

-- Leave request rejected (to employee)
(NULL, 'leave_request_rejected', 'email', 'tr-TR',
 'Izin Talebiniz Reddedildi',
 '<p>{{.leave_type}} izin talebiniz <strong>{{.rejected_by}}</strong> tarafindan reddedildi.</p><p>Sebep: {{.reason}}</p>',
 '["leave_type", "reason", "rejected_by"]', true),

(NULL, 'leave_request_rejected', 'email', 'en-US',
 'Leave Request Rejected',
 '<p>Your {{.leave_type}} leave request has been rejected by <strong>{{.rejected_by}}</strong>.</p><p>Reason: {{.reason}}</p>',
 '["leave_type", "reason", "rejected_by"]', true),

-- Assessment invitation
(NULL, 'assessment_invitation', 'email', 'tr-TR',
 'Degerlendirme Daveti: {{.assessment_name}}',
 '<p>{{.assessment_name}} degerlendirmesine davet edildiniz.</p><p>Son tarih: {{.due_date}}</p><p><a href="{{.link}}">Degerlendirmeye basla</a></p>',
 '["assessment_name", "due_date", "link"]', true),

(NULL, 'assessment_invitation', 'email', 'en-US',
 'Assessment Invitation: {{.assessment_name}}',
 '<p>You have been invited to complete the <strong>{{.assessment_name}}</strong> assessment.</p><p>Due by: {{.due_date}}</p><p><a href="{{.link}}">Start assessment</a></p>',
 '["assessment_name", "due_date", "link"]', true),

-- Survey invitation
(NULL, 'survey_invitation', 'email', 'tr-TR',
 'Anket Daveti: {{.survey_name}}',
 '<p>{{.survey_name}} anketine katilmaniz bekleniyor.</p><p>Son tarih: {{.due_date}}</p><p><a href="{{.link}}">Anketi doldur</a></p>',
 '["survey_name", "due_date", "link"]', true),

(NULL, 'survey_invitation', 'email', 'en-US',
 'Survey Invitation: {{.survey_name}}',
 '<p>You are invited to participate in the <strong>{{.survey_name}}</strong> survey.</p><p>Due by: {{.due_date}}</p><p><a href="{{.link}}">Take survey</a></p>',
 '["survey_name", "due_date", "link"]', true),

-- Burnout alert
(NULL, 'burnout_alert', 'email', 'tr-TR',
 'Tukenmislik Uyarisi',
 '<p>Sistem analizlerine gore tukenmislik riski altinda olabilirsiniz.</p><p>Risk seviyesi: <strong>{{.risk_level}}</strong></p><p>Destek almak icin IK departmani ile iletisime geciniz.</p>',
 '["risk_level"]', true),

(NULL, 'burnout_alert', 'email', 'en-US',
 'Burnout Alert',
 '<p>Based on system analytics, you may be at risk of burnout.</p><p>Risk level: <strong>{{.risk_level}}</strong></p><p>Please reach out to HR for support.</p>',
 '["risk_level"]', true),

-- Intervention consent request
(NULL, 'intervention_consent_request', 'email', 'tr-TR',
 'Muedahale Onay Talebi',
 '<p>{{.intervention_type}} mudahalesi icin onayin gereklidir.</p><p>Aciklama: {{.description}}</p><p><a href="{{.consent_link}}">Onay ver</a></p>',
 '["intervention_type", "description", "consent_link"]', true),

(NULL, 'intervention_consent_request', 'email', 'en-US',
 'Intervention Consent Request',
 '<p>Your consent is required for a <strong>{{.intervention_type}}</strong> intervention.</p><p>Description: {{.description}}</p><p><a href="{{.consent_link}}">Give consent</a></p>',
 '["intervention_type", "description", "consent_link"]', true),

-- Document expiring
(NULL, 'document_expiring', 'email', 'tr-TR',
 'Belge Suresi Doluyor: {{.document_name}}',
 '<p><strong>{{.document_name}}</strong> belgesinin suresi {{.expiry_date}} tarihinde dolacak.</p><p>Kalan gun: {{.days_left}}</p>',
 '["document_name", "expiry_date", "days_left"]', true),

(NULL, 'document_expiring', 'email', 'en-US',
 'Document Expiring: {{.document_name}}',
 '<p>The document <strong>{{.document_name}}</strong> is expiring on {{.expiry_date}}.</p><p>Days remaining: {{.days_left}}</p>',
 '["document_name", "expiry_date", "days_left"]', true),

-- Invoice failed
(NULL, 'invoice_failed', 'email', 'tr-TR',
 'Fatura Odemesi Basarisiz',
 '<p>{{.invoice_number}} numarali fatura odemesi basarisiz oldu.</p><p>Tutar: {{.amount}}</p><p>Sebep: {{.reason}}</p>',
 '["invoice_number", "amount", "reason"]', true),

(NULL, 'invoice_failed', 'email', 'en-US',
 'Invoice Payment Failed',
 '<p>Payment for invoice <strong>{{.invoice_number}}</strong> has failed.</p><p>Amount: {{.amount}}</p><p>Reason: {{.reason}}</p>',
 '["invoice_number", "amount", "reason"]', true)

ON CONFLICT DO NOTHING;
