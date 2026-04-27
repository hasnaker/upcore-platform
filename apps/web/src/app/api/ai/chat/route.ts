import { NextRequest, NextResponse } from 'next/server';

// Edge-friendly runtime; we hit Azure OpenAI REST directly so no SDK bloat.
export const runtime = 'nodejs';

const AZURE_ENDPOINT   = process.env['AZURE_OPENAI_ENDPOINT'] || '';
const AZURE_KEY        = process.env['AZURE_OPENAI_API_KEY']  || '';
const AZURE_DEPLOYMENT = process.env['AZURE_OPENAI_DEPLOYMENT'] || 'gpt-4o';
const AZURE_API_VER    = process.env['AZURE_OPENAI_API_VERSION'] || '2024-08-01-preview';

const SYSTEM_PROMPT = `Sen UpCore'un yardım asistanısın. UpCore, Türkiye'nin ilk bilim-temelli
İK yazılımı — JD-R modeli, BAT-TR tükenmişlik ölçümü, UpCap-TR ve COPSOQ anketlerini kullanır.

Kurallar:
- Kısa, net, Türkçe cevap ver. 4 cümleyi nadiren geç.
- Kullanıcı İK yöneticisi, müdür veya çalışan olabilir. Cümlelerini tarafa göre seç.
- Bilmediğin bir şeyi uydurma. Platform dışı sorularda "Bu konuda uzman değilim, İK ekibine danışın" de.
- KVKK uyumu kritik: isim, TCKN, maaş veya sağlık bilgisi örneği ÜRETME.
- BAT-TR kırmızı bandı = 3.5+ çekinme puanı. JD-R = Job Demands Resources.
- Kullanıcıya ilgili UpCore sayfasına bağlantı öner (ör: "/tukenmislik", "/kariyer/canli").`;

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const messages = (body.messages as ChatMessage[] | undefined) ?? [];

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages array required' }, { status: 400 });
  }
  if (!AZURE_ENDPOINT || !AZURE_KEY) {
    // Graceful no-op in dev when Azure isn't configured.
    return NextResponse.json({
      message: {
        role: 'assistant',
        content:
          'AI asistan şu an dev modunda (Azure OpenAI env tanımlı değil). Prod ortamda gerçek cevap alırsınız.',
      },
      warning: 'azure_openai_not_configured',
    });
  }

  const url = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VER}`;
  const payload = {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-10), // cap history to the last 10 turns to control token spend
    ],
    temperature: 0.3,
    max_tokens: 400,
    user: req.headers.get('x-user-id') || 'anonymous',
  };

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_KEY,
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      return NextResponse.json(
        { error: 'azure_openai_error', detail: errText.slice(0, 500) },
        { status: 502 },
      );
    }
    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content ?? '';
    return NextResponse.json({
      message: { role: 'assistant', content },
      usage: data?.usage,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'upstream_unreachable', detail: String(err) },
      { status: 502 },
    );
  }
}
