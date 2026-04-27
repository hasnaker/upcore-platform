import { Building2, Calendar, CheckCircle2, Clock, FileText, Mail } from 'lucide-react';
import { Suspense } from 'react';

type Props = { params: Promise<{ token: string }> };

// Aday portalı — magic link ile erişilir. Token JWT: candidate_id + tenant_id.
// Herhangi bir başarısız decode durumunda "bu bağlantı geçersiz" mesajı.
//
// Güvenlik: Public route, Clerk auth yok. Her request'te BFF'nin JWT'yi
// doğrulaması ve candidate scope'ına kilitlemesi gerekir. Aşağıdaki sayfa
// sadece UI'yi çatıda gösterir; backend doğrulama /api/candidate/[token]
// altında yapılır.

export default async function CandidatePortalPage({ params }: Props) {
  const { token } = await params;

  return (
    <main className="min-h-screen bg-bg-2 p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-ink">Aday Portalı</h1>
          <p className="mt-1 text-sm text-ink-60">
            Başvurunuzun durumu, mülakatlarınız ve teklif mektubunuz.
          </p>
        </header>

        <Suspense fallback={<Skeleton />}>
          {/* In real impl, this fetches /api/candidate/${token}/status */}
          <CandidateStatusCard token={token} />
        </Suspense>

        <section className="mt-4 rounded-xl border border-line bg-bg p-5">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
            <Calendar className="h-3.5 w-3.5" />
            Planlanmış Görüşmeler
          </h2>
          <div className="mt-3 rounded-lg border border-dashed border-line p-6 text-center text-sm text-ink-60">
            Henüz planlanmış görüşmeniz yok. Yeni görüşme planlandığında email alacaksınız.
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-line bg-bg p-5">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
            <FileText className="h-3.5 w-3.5" />
            Teklif Mektubu
          </h2>
          <div className="mt-3 flex items-start gap-3 rounded-lg border border-accent/30 bg-accent-soft p-3 text-[12px] text-accent">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Teklif size ulaştığında bu alanda görünecek.</p>
              <p className="mt-1 text-ink-80">
                PDF indirilebilir. Kabul / red işlemi buradan yapılır.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-line bg-bg p-5">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
            <Mail className="h-3.5 w-3.5" />
            İletişim
          </h2>
          <p className="mt-3 text-sm text-ink-60">
            Sorularınız için İK ekibimize ulaşın:{' '}
            <a href="mailto:ik@upcore.app" className="underline">ik@upcore.app</a>
          </p>
        </section>

        <footer className="mt-8 text-center text-[11px] text-ink-40">
          <p>
            Bu sayfa size özel bir magic-link ile erişilebilir. Link 14 gün geçerlidir.
            Paylaşmayınız.
          </p>
          <p className="mt-2">
            <Building2 className="inline h-3 w-3" /> UpCore Aday Portalı
          </p>
        </footer>
      </div>
    </main>
  );
}

function Skeleton() {
  return <div className="h-40 animate-pulse rounded-xl border border-line bg-bg" />;
}

function CandidateStatusCard({ token: _t }: { token: string }) {
  return (
    <section className="rounded-xl border border-line bg-bg p-5">
      <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
        <Clock className="h-3.5 w-3.5" />
        Başvuru Durumu
      </h2>
      <div className="mt-3 flex items-center justify-between rounded-lg bg-bg-2 p-4">
        <div>
          <p className="text-sm font-medium text-ink">Mülakat Aşaması</p>
          <p className="mt-1 text-[12px] text-ink-60">Son güncelleme: 2 gün önce</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-700">
          Aktif
        </span>
      </div>
    </section>
  );
}
