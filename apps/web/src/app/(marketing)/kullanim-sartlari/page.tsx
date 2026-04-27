import type { Metadata } from 'next';
import { Scale } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Kullanım Şartları',
  description:
    'UpCore hizmet kullanım şartları — üyelik, abonelik, veri sorumluluğu, hizmet seviyesi (SLA), sözleşme fesih koşulları.',
};

export default function KullanimSartlariPage() {
  return (
    <div className="mx-auto max-w-[900px] px-6 py-16 sm:py-24">
      <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-lg bg-[#EEF0FD]">
        <Scale className="h-6 w-6 text-[#5E5CE6]" />
      </div>

      <h1 className="text-4xl font-semibold tracking-tight text-[#0A0A0A]">Kullanım Şartları</h1>
      <p className="mt-3 text-[14px] text-[#525252]">
        UpCore Teknoloji A.Ş. tarafından sunulan SaaS hizmetine erişiminiz bu şartlara tabidir.
        Son güncelleme: <time dateTime="2026-04-17">17 Nisan 2026</time>.
      </p>

      <div className="prose prose-sm mt-10 max-w-none text-[#262626]">
        <Section title="1. Taraflar ve Tanımlar">
          <p>
            Hizmet: UpCore SaaS İK platformu. Müşteri: UpCore ile abonelik sözleşmesi imzalayan
            tüzel kişi. Kullanıcı: Müşteri adına platforma erişen kişi.
          </p>
        </Section>

        <Section title="2. Üyelik ve Hesap">
          <p>
            Hesaplar Clerk üzerinden yönetilir. Şifre güvenliği kullanıcının sorumluluğundadır.
            2FA etkinleştirilmesi önerilir, hr_director ve üstü rollerde zorunludur.
          </p>
        </Section>

        <Section title="3. Abonelik ve Ödeme">
          <p>
            Abonelikler aylık veya yıllık ödenir (Iyzico/Stripe). Fatura düzenleme VKN bilgisiyle
            ay sonunda otomatik yapılır. Plan yükseltme/düşürme 30 gün ihbarla geçerlidir.
          </p>
        </Section>

        <Section title="4. Hizmet Seviyesi (SLA)">
          <ul>
            <li>Uptime: %99.5 aylık taahhüt (Azure Container Apps)</li>
            <li>Response time: p95 &lt; 500ms</li>
            <li>Planlı bakım: Pazar 03:00-05:00 TR, 7 gün önceden duyuru</li>
            <li>Kritik bug (P0) düzeltme: 4 saat içinde müdahale, 24 saat içinde fix</li>
          </ul>
        </Section>

        <Section title="5. Veri Sorumlulukları">
          <p>
            Müşteri veri sorumlusu, UpCore veri işleyendir (KVKK 8/2-b). Detay için{' '}
            <a href="/kvkk" className="font-medium text-[#5E5CE6] underline">
              KVKK Aydınlatma Metni
            </a>
            &apos;ni inceleyin.
          </p>
        </Section>

        <Section title="6. Fikri Mülkiyet">
          <p>
            UpCore platformu, markası, logoları, kaynak kodu UpCore Teknoloji A.Ş.&apos;ye aittir.
            Müşteri tarafından girilen veriler müşterinin mülkiyetindedir — UpCore, bu veriyi
            yalnızca hizmet sunumu amacıyla işler.
          </p>
        </Section>

        <Section title="7. Sözleşme Süresi ve Fesih">
          <ul>
            <li>Minimum süre: 12 ay (aylık ödemelerde)</li>
            <li>Fesih ihbarı: 30 gün önce yazılı</li>
            <li>
              Sözleşme sonunda: müşteri verileri 90 gün boyunca read-only erişilebilir, sonra
              kalıcı silme (ispat belgesi verilir)
            </li>
          </ul>
        </Section>

        <Section title="8. Sorumluluk Sınırı">
          <p>
            UpCore&apos;un toplam sorumluluğu, sözleşme kapsamında son 12 ayda ödenen ücretlerle
            sınırlıdır. Dolaylı zararlardan (veri kaybı, kar kaybı) sorumlu değildir.
          </p>
        </Section>

        <Section title="9. Uygulanacak Hukuk">
          <p>
            Türkiye Cumhuriyeti kanunları. Uyuşmazlıklarda İstanbul Merkez Mahkemeleri ve İcra
            Daireleri yetkilidir.
          </p>
        </Section>
      </div>
    </div>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-6">
    <h2 className="text-lg font-semibold text-[#0A0A0A]">{title}</h2>
    <div className="mt-2 text-[14px] leading-relaxed">{children}</div>
  </section>
);
