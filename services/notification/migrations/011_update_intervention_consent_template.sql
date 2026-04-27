-- 010_update_intervention_consent_template.sql
-- Koruma P1 — bilimsel dayanaklı, HTML-formatted consent isteği şablonu.
-- Enrichment payload: intervention_type, description, evidence_tier,
-- expected_effect_size, duration_weeks, time_to_effect_weeks, consent_link,
-- reminder (boş / "true").

UPDATE notification_templates
SET
    subject = 'Size oezel bilim-temelli mudahale onerisi: {{.intervention_type}}',
    body = '<!DOCTYPE html>
<html lang="tr">
<body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color:#111; max-width: 640px; margin: 0 auto; padding: 24px;">
  <div style="background:#5E5CE6; color:#fff; padding: 20px; border-radius: 10px 10px 0 0;">
    <h1 style="margin:0; font-size: 20px;">Sana oezel mudahale onerisi</h1>
  </div>
  <div style="background:#fff; padding: 24px; border: 1px solid #f0f0f0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 15px; line-height: 1.6;">
      Ik ekibin, tukenmislik risk verilerine dayanarak senin icin bir
      bilimsel-dayanakli muedahale onerdi: <strong>{{.intervention_type}}</strong>.
    </p>

    <div style="background:#f5f5ff; padding:16px; border-radius:8px; margin: 16px 0;">
      <p style="margin:0 0 8px 0;"><strong>Ne yapacaksin:</strong></p>
      <p style="margin:0 0 12px 0; font-size: 14px; color:#333;">{{.description}}</p>

      <table style="width:100%; font-size:13px; color:#444;">
        <tr>
          <td style="padding:4px 0;"><strong>Bilimsel kanit sinifi:</strong></td>
          <td>Tier {{.evidence_tier}} ({{if eq .evidence_tier "A"}}Meta-analiz destekli{{else if eq .evidence_tier "B"}}Cok calisma destekli{{else}}Teorik / tek calisma{{end}})</td>
        </tr>
        <tr>
          <td style="padding:4px 0;"><strong>Beklenen etki (Cohen d):</strong></td>
          <td>{{.expected_effect_size}}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;"><strong>Sure:</strong></td>
          <td>{{.duration_weeks}} hafta</td>
        </tr>
        <tr>
          <td style="padding:4px 0;"><strong>Etki gorunurlugu:</strong></td>
          <td>{{.time_to_effect_weeks}} haftada</td>
        </tr>
      </table>
    </div>

    <p style="font-size:14px; line-height:1.6;">
      Bu, senin onayina baglidir. Kabul etmen zorunlu degil, KVKK kapsaminda
      acik riza ister. Detayli aciklama ve bilimsel referanslari bagli sayfada
      bulabilirsin.
    </p>

    <p style="text-align:center; margin: 28px 0;">
      <a href="{{.consent_link}}"
         style="display:inline-block; background:#5E5CE6; color:#fff;
                padding:12px 24px; border-radius:8px; text-decoration:none;
                font-weight:600; font-size:14px;">
        Detaylari gor ve karar ver
      </a>
    </p>

    <p style="font-size:12px; color:#888; margin-top: 20px;">
      Bu, UpCore tukenmislik koruma modulunun parcasidir. Yanitlarin Ik ile
      paylasilir; ancak bilimsel dayanak icin anonim aggregate toplanir. KVKK
      haklarin icin <a href="{{.consent_link}}">buraya</a> tiklayarak detay
      gorebilirsin.
    </p>
  </div>
</body>
</html>',
    variables = '["intervention_type","description","evidence_tier","expected_effect_size","duration_weeks","time_to_effect_weeks","consent_link","reminder"]',
    updated_at = now()
WHERE tenant_id IS NULL
  AND template_key = 'intervention_consent_request'
  AND locale = 'tr-TR';
