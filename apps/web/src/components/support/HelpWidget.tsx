'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Book, HelpCircle, Loader2, MessageCircle, Search, Send, Sparkles, Video, X } from 'lucide-react';

// In-app help widget — sağ alt köşede sabit buton, açıldığında 3 sekme:
//   - Bilgi bankası (arama + kategori)
//   - Video eğitimler
//   - Canlı destek (email / chat / ticket)
//
// Chatbot entegrasyonu için Intercom/Crisp stub yapılmıştır; gerçek provider
// wiring production'da tenant self-service veya global config üzerinden.

type Tab = 'ai' | 'search' | 'videos' | 'contact';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const VIDEO_TUTORIALS = [
  { id: 'v1', title: 'Çalışan eklemek + CSV import', duration: '4:12', url: 'https://docs.upcore.app/videos/employee-import' },
  { id: 'v2', title: 'İlk bordronuzu hesaplayın', duration: '6:08', url: 'https://docs.upcore.app/videos/first-payroll' },
  { id: 'v3', title: 'Performans cycle + OKR', duration: '5:30', url: 'https://docs.upcore.app/videos/performance' },
  { id: 'v4', title: 'İşe alım: pozisyon → teklif', duration: '7:22', url: 'https://docs.upcore.app/videos/ats-full' },
  { id: 'v5', title: 'BAT-TR tükenmişlik ölçümü', duration: '3:45', url: 'https://docs.upcore.app/videos/bat-tr' },
  { id: 'v6', title: 'SAML SSO kurulumu', duration: '8:15', url: 'https://docs.upcore.app/videos/saml-sso' },
];

const KB_CATEGORIES = [
  { label: 'Başlarken', href: 'https://docs.upcore.app/basla' },
  { label: 'Bordro & SGK', href: 'https://docs.upcore.app/bordro' },
  { label: 'İşe alım', href: 'https://docs.upcore.app/ats' },
  { label: 'Performans', href: 'https://docs.upcore.app/performance' },
  { label: 'Entegrasyonlar', href: 'https://docs.upcore.app/integrations' },
  { label: 'KVKK & Güvenlik', href: 'https://docs.upcore.app/kvkk' },
];

export function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('ai');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Merhaba! UpCore AI asistanıyım. BAT-TR, bordro, işe alım, performans veya ayarlar hakkında bir sorunuz varsa yardımcı olmaya çalışırım.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatPending, setChatPending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const sendChat = async (text: string) => {
    if (!text.trim() || chatPending) return;
    const next: ChatMessage[] = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setChatInput('');
    setChatPending(true);
    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const body = await r.json().catch(() => ({}));
      const reply = body?.message?.content ?? 'Yanıt alınamadı. Lütfen daha sonra tekrar deneyin.';
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([
        ...next,
        { role: 'assistant', content: 'Şu an bağlantı kurulamıyor. İnternet bağlantınızı kontrol edin.' },
      ]);
    } finally {
      setChatPending(false);
      setTimeout(() => chatScrollRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 50);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Yardım"
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#0A0A0A] text-white shadow-lg hover:bg-[#333]"
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed bottom-24 right-6 z-50 flex h-[520px] w-[380px] flex-col overflow-hidden rounded-xl border border-line bg-bg shadow-2xl">
          <div className="flex items-center justify-between border-b border-line bg-bg-2 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">Yardım Merkezi</p>
              <p className="text-[11px] text-ink-60">Sorunuz varsa buradayız</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-ink-40 hover:bg-bg hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex border-b border-line text-[12px]">
            <TabButton active={tab === 'ai'} onClick={() => setTab('ai')} icon={<Sparkles className="h-3 w-3" />} label="AI" />
            <TabButton active={tab === 'search'} onClick={() => setTab('search')} icon={<Book className="h-3 w-3" />} label="KB" />
            <TabButton active={tab === 'videos'} onClick={() => setTab('videos')} icon={<Video className="h-3 w-3" />} label="Video" />
            <TabButton active={tab === 'contact'} onClick={() => setTab('contact')} icon={<MessageCircle className="h-3 w-3" />} label="İletişim" />
          </div>

          <div className={`flex-1 overflow-y-auto ${tab === 'ai' ? 'flex flex-col p-0' : 'p-4'}`} ref={chatScrollRef}>
            {tab === 'ai' ? (
              <div className="flex h-full flex-col">
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="flex flex-col gap-2">
                    {messages.map((m, i) => (
                      <div
                        key={i}
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-[12px] leading-relaxed ${
                          m.role === 'user'
                            ? 'ml-auto bg-accent text-white'
                            : 'mr-auto bg-bg-2 text-ink'
                        }`}
                      >
                        {m.content}
                      </div>
                    ))}
                    {chatPending && (
                      <div className="mr-auto flex items-center gap-1.5 rounded-2xl bg-bg-2 px-3 py-2 text-[11px] text-ink-60">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Yazıyor…
                      </div>
                    )}
                  </div>
                </div>
                <div className="border-t border-line p-2">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendChat(chatInput);
                    }}
                    className="flex gap-1"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Sorunuzu yazın…"
                      disabled={chatPending}
                      className="flex-1 rounded-md border border-line bg-bg px-2.5 py-1.5 text-[12px] focus:border-accent focus:outline-none disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={chatPending || !chatInput.trim()}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#0A0A0A] text-white hover:bg-[#333] disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </form>
                  <p className="mt-1 text-[9px] text-ink-40">
                    AI cevapları bilgilendirme amaçlıdır. KVKK/bordro/yasal konularda ekibe danışın.
                  </p>
                </div>
              </div>
            ) : tab === 'search' ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 rounded-md border border-line bg-bg-2 px-2 py-1.5">
                  <Search className="h-3.5 w-3.5 text-ink-40" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Nasıl yapılır?"
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  {KB_CATEGORIES.filter((c) =>
                    !query || c.label.toLowerCase().includes(query.toLowerCase()),
                  ).map((c) => (
                    <a
                      key={c.href}
                      href={c.href}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md px-3 py-2 text-[13px] text-ink-60 hover:bg-bg-2 hover:text-ink"
                    >
                      {c.label}
                    </a>
                  ))}
                </div>
              </div>
            ) : tab === 'videos' ? (
              <div className="flex flex-col gap-2">
                {VIDEO_TUTORIALS.map((v) => (
                  <a
                    key={v.id}
                    href={v.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-2 rounded-md border border-line bg-bg p-2.5 hover:border-accent/50"
                  >
                    <Video className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <div className="flex-1">
                      <p className="text-[13px] font-medium text-ink">{v.title}</p>
                      <p className="text-[11px] text-ink-40">{v.duration}</p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-[13px] text-ink">Canlı destek kanallarımız:</p>
                <a
                  href="mailto:destek@upcore.app"
                  className="flex items-center gap-2 rounded-md border border-line bg-bg p-3 hover:border-accent/50"
                >
                  <MessageCircle className="h-4 w-4 text-accent" />
                  <div>
                    <p className="text-[13px] font-medium text-ink">destek@upcore.app</p>
                    <p className="text-[11px] text-ink-40">24 saat içinde dönüş</p>
                  </div>
                </a>
                <Link
                  href="/ayarlar/sso"
                  className="flex items-center gap-2 rounded-md border border-line bg-bg p-3 hover:border-accent/50"
                >
                  <HelpCircle className="h-4 w-4 text-accent" />
                  <div>
                    <p className="text-[13px] font-medium text-ink">Teknik Entegrasyon</p>
                    <p className="text-[11px] text-ink-40">SSO, API, webhook kurulumu</p>
                  </div>
                </Link>
                <a
                  href="https://status.upcore.app"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-md border border-line bg-bg p-3 hover:border-accent/50"
                >
                  <div className="flex h-2 w-2 rounded-full bg-green" />
                  <div>
                    <p className="text-[13px] font-medium text-ink">Sistem Durumu</p>
                    <p className="text-[11px] text-ink-40">Tüm servisler çalışıyor</p>
                  </div>
                </a>
              </div>
            )}
          </div>

          <div className="border-t border-line bg-bg-2 px-4 py-2 text-[10px] text-ink-40">
            UpCore Yardım Widget'ı · Türkçe destek
          </div>
        </div>
      ) : null}
    </>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1 border-b-2 px-2 py-2.5 ${
        active
          ? 'border-accent text-accent'
          : 'border-transparent text-ink-60 hover:text-ink'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
