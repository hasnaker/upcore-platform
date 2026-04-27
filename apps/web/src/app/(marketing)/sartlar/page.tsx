import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kullanım Şartları',
  description:
    "UpCore SaaS platformu kullanım şartları — abonelik, sorumluluk, fesih, ihtilaf çözümü.",
  alternates: { canonical: 'https://upcore.io/sartlar' },
};

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto w-full max-w-[860px] px-6 py-20 text-[#111827]">
      <header className="border-b border-[#E5E7EB] pb-6">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
          Yasal · Kullanım Şartları
        </p>
        <h1 className="mt-2 font-mono text-[28px] font-bold leading-tight">
          UpCore Kullanım Şartları (Terms of Service)
        </h1>
        <p className="mt-3 text-[13px] text-[#6B7280]">
          Son güncelleme: 24 Nisan 2026 · Sürüm v1.0 · UpCore Teknoloji A.Ş.
        </p>
      </header>

      <section className="prose prose-neutral mt-8 max-w-none text-[14px] leading-relaxed">
        <h2>Türkçe</h2>

        <h3>1. Taraflar ve Kabul</h3>
        <p>
          UpCore SaaS platformunu (“Hizmet”) kullanarak, UpCore Teknoloji Anonim Şirketi
          (“UpCore”, “biz”) ile aşağıdaki şartları kabul etmiş sayılırsınız. Şartları
          kabul etmediğiniz takdirde Hizmeti kullanmayı durdurun.
        </p>

        <h3>2. Hizmet Tanımı</h3>
        <p>
          UpCore, çalışan bağlılığı, tükenmişlik ölçümü (BAT-12-TR), iç mobilite ve
          performans yönetimi işlevleri sunan bulut tabanlı İK yazılım hizmetidir.
        </p>

        <h3>3. Hesap ve Güvenlik</h3>
        <ul>
          <li>Hesap bilgilerinin gizliliğinden siz sorumlusunuz (2FA önerilir).</li>
          <li>Yetkisiz erişim tespiti durumunda derhal <a href="mailto:guvenlik@upcore.io">guvenlik@upcore.io</a> bildirin.</li>
          <li>UpCore, şüpheli aktiviteyi bildirmeksizin engellemeye yetkilidir.</li>
        </ul>

        <h3>4. Abonelik, Ücretlendirme, Yenileme</h3>
        <ul>
          <li>Plan seçenekleri: Free, Starter, Growth, Platform, Enterprise.</li>
          <li>Ücretlendirme aylık/yıllık; TRY veya USD (Enterprise için görüşmeli).</li>
          <li>Otomatik yenileme varsayılan açık; hesap ayarından kapatılabilir.</li>
          <li>İptal period-end itibariyle etkili (refund yok, kullanılmamış süre iade edilmez).</li>
          <li>Iyzico (TR) ve Stripe (global) üzerinden güvenli ödeme.</li>
        </ul>

        <h3>5. Kullanım Kuralları</h3>
        <ul>
          <li>Yasadışı, taciz edici, ırkçı veya telif hakkını ihlal eden içerik yasak.</li>
          <li>Üçüncü taraf servislerin API rate limit'lerine uymak zorundasınız.</li>
          <li>Çalışan pulse anketi yanıtlarını başka amaçlarla kullanmak KVKK ihlali sayılır.</li>
        </ul>

        <h3>6. Fikri Mülkiyet</h3>
        <p>
          Platform kodu, tasarım, ölçek item'ları (BAT-12-TR, UpCap-TR) UpCore'un veya
          lisans verenlerin mülkiyetidir. Kullanıcı içerikleri (çalışan verisi) müşteri
          tenant'a aittir — UpCore yalnızca işleyici (data processor) sıfatıyla erişir.
        </p>

        <h3>7. Sorumluluk Sınırlaması</h3>
        <p>
          Hizmet "olduğu gibi" sunulur. UpCore, zincirleme, dolaylı veya kar kaybı
          zararlarından sorumlu değildir. Toplam sorumluluk, son 12 ayda ödenen abonelik
          ücretini aşamaz. SLA ihlalleri için `legal/templates/sla-*.md` eki uygulanır.
        </p>

        <h3>8. Feshin Gerekçeleri</h3>
        <ul>
          <li>Abonelik sözleşmesinin 30 gün içinde ödenmemesi.</li>
          <li>KVKK veya kullanım şartları açık ihlali.</li>
          <li>Adli makamdan gelen yasal talep.</li>
          <li>Karşılıklı anlaşma ile fesih.</li>
        </ul>

        <h3>9. Hizmet Kesintisi ve SLA</h3>
        <p>
          KOBİ/Growth planları: %99.5 uptime garantisi (bkz{' '}
          <code>legal/templates/sla-99.5.md</code>). Enterprise planı: %99.9 uptime
          (bkz <code>legal/templates/sla-99.9.md</code>). Planlı bakım 72 saat önceden
          <a href="https://status.upcore.io"> status.upcore.io</a>'da duyurulur.
        </p>

        <h3>10. Değişiklikler</h3>
        <p>
          UpCore, şartları değiştirme hakkını saklı tutar. Önemli değişiklikler 30 gün
          önceden e-posta ile bildirilir.
        </p>

        <h3>11. Uygulanacak Hukuk ve Yetkili Mahkeme</h3>
        <p>
          Bu sözleşme Türkiye Cumhuriyeti kanunlarına tabidir. İhtilaflar İstanbul
          Merkez (Çağlayan) Mahkemeleri ve İcra Daireleri'nde çözülür.
        </p>

        <h3>12. İletişim</h3>
        <p>
          <a href="mailto:hukuk@upcore.io">hukuk@upcore.io</a> ·{' '}
          <a href="mailto:satis@upcore.io">satis@upcore.io</a>
        </p>

        <hr />

        <h2 id="english">English</h2>

        <h3>1. Acceptance</h3>
        <p>
          By using the UpCore SaaS platform (“Service”), you agree to these Terms of
          Service entered into between you and UpCore Teknoloji A.Ş. (“UpCore”, “we”).
        </p>

        <h3>2. Subscription & Billing</h3>
        <p>
          Plans: Free, Starter, Growth, Platform, Enterprise. Billing is monthly or
          annual in TRY or USD. Auto-renewal is enabled by default; cancellation
          effective at period end (no pro-rata refund).
        </p>

        <h3>3. Acceptable Use</h3>
        <p>
          No illegal, harassing, or infringing content. You must comply with rate limits
          of third-party integrations. Using employee survey responses outside their
          intended purpose constitutes a KVKK violation.
        </p>

        <h3>4. Intellectual Property</h3>
        <p>
          Platform code, design, and psychometric scale items (BAT-12-TR, UpCap-TR) are
          owned by UpCore or its licensors. Customer-uploaded data remains the property
          of the customer tenant; UpCore acts as data processor.
        </p>

        <h3>5. Limitation of Liability</h3>
        <p>
          The Service is provided “as is.” UpCore is not liable for indirect or
          consequential damages. Aggregate liability is capped at the subscription fees
          paid in the last 12 months. SLA breaches are governed by the applicable SLA
          annex (99.5% or 99.9%).
        </p>

        <h3>6. Termination</h3>
        <p>
          We may suspend or terminate accounts for non-payment beyond 30 days, material
          breach of terms, or upon court order. Mutual termination allowed by written
          notice.
        </p>

        <h3>7. Governing Law</h3>
        <p>
          These Terms are governed by the laws of the Republic of Turkey. Exclusive
          jurisdiction lies with the Istanbul Central (Çağlayan) Courts.
        </p>

        <h3>8. Contact</h3>
        <p>
          <a href="mailto:hukuk@upcore.io">hukuk@upcore.io</a>
        </p>
      </section>
    </main>
  );
}
