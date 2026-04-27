import { NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// UpCore newsletter double opt-in akışı.
// 1. Kullanıcı form gönderir → 202 döner, Postmark/Brevo üzerinden
//    onay e-postası tetiklenir.
// 2. Onay linkine tıklayınca `verify` endpoint aboneliği aktifleştirir
//    (bu dosyada tanımlı değil — ayrı route'ta, ama buradaki token
//    oluşturma mantığı ileride kullanılabilir).
//
// Environment:
//   NEWSLETTER_PROVIDER      = 'postmark' | 'brevo' | 'none' (varsayılan 'none')
//   POSTMARK_SERVER_TOKEN    = (provider 'postmark' ise)
//   POSTMARK_FROM_EMAIL      = hello@upcore.app gibi doğrulanmış gönderici
//   BREVO_API_KEY            = (provider 'brevo' ise)
//   BREVO_LIST_ID            = int (opsiyonel)
//   BREVO_TEMPLATE_ID        = int (double opt-in şablonu)
//   BREVO_REDIRECT_URL       = https://upcore.app/blog?subscribed=ok
//
// Sağlayıcı 'none' iken formun işlediğini teyit etmek için 202 döner
// ve log'a basar — dev / staging ortamlarında gerçek e-posta gitmez.

const bodySchema = z.object({
  email: z
    .string()
    .email({ message: 'Geçerli bir e-posta adresi giriniz.' })
    .max(200),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'KVKK rızası zorunludur.' }),
  }),
  source: z.string().max(64).optional(),
});

async function subscribeWithPostmark(email: string): Promise<void> {
  const token = process.env['POSTMARK_SERVER_TOKEN'];
  const from = process.env['POSTMARK_FROM_EMAIL'];
  if (!token || !from) {
    throw new Error('Postmark konfigürasyonu eksik.');
  }
  const verifyBase =
    process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://upcore.app';
  const confirmUrl = `${verifyBase}/api/newsletter/confirm?email=${encodeURIComponent(
    email
  )}&t=${Date.now().toString(36)}`;
  const response = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Postmark-Server-Token': token,
    },
    body: JSON.stringify({
      From: from,
      To: email,
      Subject: 'UpCore Bülten — Aboneliğinizi onaylayın',
      TextBody: `Merhaba,\n\nUpCore Bülten'ine abone olmak için aşağıdaki linke tıklayın:\n${confirmUrl}\n\n10 dakika içinde onaylamazsanız kaydınız otomatik iptal olur. Bu e-postayı yanlışlıkla aldıysanız dikkate almayın.\n\nUpCore Ekibi · KVKK Md. 11 hakkınız saklıdır.`,
      MessageStream: 'outbound',
    }),
  });
  if (!response.ok) {
    throw new Error(`Postmark hata: ${response.status}`);
  }
}

async function subscribeWithBrevo(email: string): Promise<void> {
  const key = process.env['BREVO_API_KEY'];
  const templateId = Number(process.env['BREVO_TEMPLATE_ID'] ?? '0');
  const redirectionUrl =
    process.env['BREVO_REDIRECT_URL'] ??
    'https://upcore.app/blog?subscribed=ok';
  const listIdRaw = process.env['BREVO_LIST_ID'];
  if (!key || !templateId) {
    throw new Error('Brevo konfigürasyonu eksik.');
  }
  const response = await fetch(
    'https://api.brevo.com/v3/contacts/doubleOptinConfirmation',
    {
      method: 'POST',
      headers: {
        'api-key': key,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        includeListIds: listIdRaw ? [Number(listIdRaw)] : [],
        templateId,
        redirectionUrl,
      }),
    }
  );
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Brevo hata: ${response.status} ${text}`);
  }
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Geçersiz istek gövdesi.' },
      { status: 400 }
    );
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, message: first?.message ?? 'Doğrulama başarısız.' },
      { status: 422 }
    );
  }

  const provider = (process.env['NEWSLETTER_PROVIDER'] ?? 'none').toLowerCase();
  try {
    if (provider === 'postmark') await subscribeWithPostmark(parsed.data.email);
    else if (provider === 'brevo') await subscribeWithBrevo(parsed.data.email);
    else {
      // Dev/staging fallback: log'a yazılır, sağlayıcı çağrılmaz.
      console.info('[newsletter] double-opt-in request', {
        email: parsed.data.email,
        source: parsed.data.source,
        provider: 'none',
      });
    }
  } catch (err) {
    console.error('[newsletter] provider error', err);
    return NextResponse.json(
      {
        ok: false,
        message:
          'Bülten servisine ulaşılamadı. Lütfen birkaç dakika sonra tekrar deneyin.',
      },
      { status: 502 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      message:
        'Aboneliğinizi tamamlamak için e-postanıza gönderdiğimiz onay linkine tıklayın.',
    },
    { status: 202 }
  );
}
