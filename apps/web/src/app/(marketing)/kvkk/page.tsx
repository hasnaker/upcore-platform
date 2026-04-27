import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni',
  description:
    'UpCore kişisel veri işleme aydınlatma metni — 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında çalışan ve aday verilerinin işlenme amacı, saklama süresi, KVKK 11. madde hakları.',
};

export default function KvkkPage() {
  return (
    <div className="mx-auto max-w-[900px] px-6 py-16 sm:py-24">
      <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-lg bg-[#EEF0FD]">
        <Shield className="h-6 w-6 text-[#5E5CE6]" />
      </div>

      <h1 className="text-4xl font-semibold tracking-tight text-[#0A0A0A]">
        KVKK Aydınlatma Metni
      </h1>
      <p className="mt-3 text-[14px] text-[#525252]">
        6698 sayılı Kişisel Verilerin Korunması Kanunu (&ldquo;KVKK&rdquo;) kapsamında veri
        sorumlusu UpCore Teknoloji A.Ş. tarafından hazırlanmıştır. Son güncelleme:{' '}
        <time dateTime="2026-04-17">17 Nisan 2026</time>.
      </p>

      <div className="prose prose-sm mt-10 max-w-none text-[#262626]">
        <Section title="1. Veri Sorumlusu">
          <p>
            UpCore Teknoloji A.Ş. (&ldquo;UpCore&rdquo;), İstanbul — Veri sorumlusu olarak
            çalışan ve aday kişisel verilerinizi aşağıda açıklanan kapsamda işlemektedir.
          </p>
        </Section>

        <Section title="2. Kişisel Verilerin İşlenme Amaçları">
          <ul>
            <li>İnsan kaynakları süreçlerinin (işe alım, değerlendirme, bordro, özlük) yürütülmesi</li>
            <li>İş sözleşmesi ve mevzuattan doğan yükümlülüklerin ifası (SGK, İş Kanunu 4857)</li>
            <li>Psikometrik değerlendirme (BAT-12-TR, IPIP-50-TR) ile kariyer geliştirme</li>
            <li>Anonim istatistiksel analiz ile kurumsal çalışan bağlılığı ölçümü (min N=5 kuralı)</li>
            <li>Kanuni yükümlülükler ve mevzuattan kaynaklanan denetim talepleri</li>
          </ul>
        </Section>

        <Section title="3. İşlenen Kişisel Veri Kategorileri">
          <ul>
            <li>
              <strong>Kimlik:</strong> Ad, soyad, TCKN (field-level encrypted/pgcrypto), doğum
              tarihi, cinsiyet
            </li>
            <li>
              <strong>İletişim:</strong> E-posta, telefon, adres
            </li>
            <li>
              <strong>Özlük:</strong> Sicil no, iş başlama tarihi, pozisyon, departman, sözleşme tipi
            </li>
            <li>
              <strong>Değerlendirme:</strong> BAT-TR skoru (anonim agregat), JD-R profili, UpCap
              skoru, VIA karakter güçleri
            </li>
            <li>
              <strong>Belge:</strong> Sözleşme, diploma, sağlık raporu, sertifikalar (şifreli Azure
              Blob)
            </li>
            <li>
              <strong>Bordro:</strong> Maaş bilgisi, banka IBAN, SGK primleri (gizli sınıfta)
            </li>
          </ul>
        </Section>

        <Section title="4. Verilerin Aktarımı">
          <p>
            Verileriniz yalnızca aşağıdaki taraflarla paylaşılır:
          </p>
          <ul>
            <li>
              <strong>Kanuni zorunluluk:</strong> SGK, GİB, İŞKUR, Sayıştay (kamu kurumları için)
            </li>
            <li>
              <strong>Veri işleyenler:</strong> Microsoft Azure (TR region), Clerk Inc. (ABD — SCC
              sözleşmesi), Iyzico/Stripe (ödeme)
            </li>
            <li>
              <strong>İşveren (müşteriniz):</strong> Pilot/production modda HR yetkili personeli —
              anonim agregat raporlar min N=5 altında bireysel gösterilmez
            </li>
          </ul>
          <p>
            <strong>Yurt dışı aktarım:</strong> Clerk (ABD) için Kişisel Verileri Koruma Kurulu
            onaylı Standart Sözleşme Hükümleri (SCC) uygulanır.
          </p>
        </Section>

        <Section title="5. Saklama Süreleri">
          <ul>
            <li>Aktif çalışan: İş ilişkisi süresi + 10 yıl (İş Kanunu 4857/75)</li>
            <li>Ayrılmış çalışan: Ayrılma tarihinden itibaren 10 yıl</li>
            <li>Aday (işe alınmamış): 6 ay (KVKK 4. madde, açık rıza süresi)</li>
            <li>Audit log (erişim kayıtları): 7 yıl immutable</li>
            <li>Anket yanıtları (anonim): Süresiz — kişi kimliğiyle ilişkilendirilemez</li>
          </ul>
        </Section>

        <Section title="6. Güvenlik Önlemleri">
          <ul>
            <li>AES-256 at-rest, TLS 1.3 in-transit şifreleme</li>
            <li>TCKN field-level encryption (PostgreSQL pgcrypto)</li>
            <li>Row-Level Security (RLS) — tenant izolasyonu tam</li>
            <li>Azure Monitor + Sentry anomali tespiti</li>
            <li>Yıllık penetration test</li>
            <li>ISO 27001 yol haritası (2026 Q4 sertifika hedefi)</li>
          </ul>
        </Section>

        <Section title="7. KVKK 11. Madde Hakları">
          <p>
            Her veri sahibi aşağıdaki haklara sahiptir:
          </p>
          <ul>
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
            <li>Amacına uygun kullanılıp kullanılmadığını öğrenme</li>
            <li>Yurtiçi/yurtdışı aktarılan üçüncü kişileri bilme</li>
            <li>Eksik/yanlış işlenen verilerin düzeltilmesini isteme</li>
            <li>Silinmesini veya yok edilmesini isteme (KVKK 7)</li>
            <li>Düzeltme/silme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
            <li>
              Münhasıran otomatik sistemler ile analiz edilmesi suretiyle aleyhinize bir sonuç
              çıktığına itiraz etme
            </li>
            <li>Zarar halinde tazminat talep etme</li>
          </ul>
        </Section>

        <Section title="8. Başvuru">
          <p>
            Haklarınızı kullanmak için{' '}
            <a
              href="mailto:kvkk@upcore.app"
              className="font-medium text-[#5E5CE6] underline"
            >
              kvkk@upcore.app
            </a>{' '}
            adresine e-posta gönderin. Başvurular <strong>30 gün içinde</strong> yanıtlanır (KVKK
            13/2).
          </p>
        </Section>
      </div>

      <div className="mt-10 rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A3A3A3]">
          İlgili belgeler
        </p>
        <ul className="mt-3 flex flex-col gap-2 text-[13px]">
          <li>
            <Link href="/kullanim-sartlari" className="text-[#5E5CE6] hover:underline">
              → Kullanım Şartları
            </Link>
          </li>
          <li>
            <a
              href="mailto:kvkk@upcore.app"
              className="inline-flex items-center gap-1 text-[#5E5CE6] hover:underline"
            >
              <Mail className="h-3 w-3" />
              Veri sahibi başvuru: kvkk@upcore.app
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-lg font-semibold text-[#0A0A0A]">{title}</h2>
    <div className="mt-3 text-[14px] leading-relaxed">{children}</div>
  </section>
);
