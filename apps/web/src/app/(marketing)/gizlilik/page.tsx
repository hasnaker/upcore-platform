import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gizlilik ve KVKK Aydınlatma Metni',
  description:
    "KVKK Madde 10 kapsamında UpCore'un kişisel veri işleme süreçleri, haklar ve başvuru yolu.",
  alternates: { canonical: 'https://upcore.io/gizlilik' },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-[860px] px-6 py-20 text-[#111827]">
      <header className="border-b border-[#E5E7EB] pb-6">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
          Yasal · KVKK Aydınlatma
        </p>
        <h1 className="mt-2 font-mono text-[28px] font-bold leading-tight">
          Gizlilik ve Kişisel Verilerin Korunması Aydınlatma Metni
        </h1>
        <p className="mt-3 text-[13px] text-[#6B7280]">
          Son güncelleme: 24 Nisan 2026 · Sürüm 2026-04-24 · Sorumlu: UpCore Teknoloji A.Ş.
        </p>
      </header>

      <section className="prose prose-neutral mt-8 max-w-none text-[14px] leading-relaxed">
        <h2>Türkçe</h2>

        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) kapsamında veri sorumlusu
          sıfatıyla UpCore Teknoloji A.Ş. (“UpCore”, “biz”) olarak, siz kullanıcılarımıza
          hizmet sunarken elde ettiğimiz kişisel verilerinizin güvenliğini en üst düzeyde
          tutmayı taahhüt ederiz.
        </p>

        <h3>1. Veri Sorumlusu</h3>
        <p>
          <strong>UpCore Teknoloji Anonim Şirketi</strong> — Maslak, Sarıyer / İstanbul.
          VKN: 8950000000 — Mersis: 0895-0000-0000-0000.
        </p>

        <h3>2. İşlenen Kişisel Veri Kategorileri</h3>
        <ul>
          <li>
            <strong>Kimlik verisi:</strong> Ad, soyad, T.C. Kimlik No (yalnızca bordro + SGK
            modülü aktifse, pgcrypto ile şifreli).
          </li>
          <li>
            <strong>İletişim verisi:</strong> E-posta, telefon, iş adresi.
          </li>
          <li>
            <strong>Mesleki deneyim:</strong> Unvan, departman, özgeçmiş.
          </li>
          <li>
            <strong>Performans ve bağlılık verileri:</strong> Pulse anket yanıtları
            (BAT-12-TR, COPSOQ-III-TR), 360° geri bildirim, OKR skorları.
          </li>
          <li>
            <strong>Türetilmiş analiz verileri:</strong> Tükenmişlik tahmin skoru,
            psikolojik sermaye (UpCap-TR) değerleri, job-person fit skoru.
          </li>
          <li>
            <strong>İşlem günlüğü:</strong> IP adresi, tarayıcı bilgisi, erişim logları
            (7 yıl WORM audit saklama).
          </li>
        </ul>

        <h3>3. Kişisel Veri İşleme Amaçları</h3>
        <ol>
          <li>Sözleşmenin kurulması ve ifası (hizmet sunumu).</li>
          <li>4857 sayılı İş Kanunu ve 5510 sayılı SGK Kanunu kapsamında yükümlülükler.</li>
          <li>Bilimsel temelli (JD-R, BAT-TR) analiz ve öngörü üretimi.</li>
          <li>Platform güvenliği, sahtekârlık tespiti ve audit trail.</li>
          <li>Açık rızaya dayalı ürün iyileştirme analitiği (anonim, k-anonymity k≥5).</li>
        </ol>

        <h3>4. İşleme Hukuki Sebebi (KVKK Madde 5)</h3>
        <ul>
          <li>
            <strong>Sözleşmenin ifası:</strong> Tenant sözleşmesi kapsamında kullanıcı ve
            çalışan verileri.
          </li>
          <li>
            <strong>Hukuki yükümlülük:</strong> SGK bildirimleri, bordro kayıtları.
          </li>
          <li>
            <strong>Meşru menfaat:</strong> Hizmet güvenliği ve dolandırıcılık önleme.
          </li>
          <li>
            <strong>Açık rıza:</strong> Pulse anket yanıtları, pazarlama iletişimi,
            yurt dışı veri transferi (westeurope).
          </li>
        </ul>

        <h3>5. Yurt Dışı Aktarım (KVKK Madde 9)</h3>
        <p>
          UpCore, verilerinizi Microsoft Azure westeurope (Amsterdam, Hollanda) veri
          merkezinde barındırır. Hollanda, KVKK Kurulu tarafından yeterli koruma sağlayan
          ülkeler arasında değerlendirilmektedir. Açık rızanız onboarding Adım 7'de
          tarafınızdan talep edilir. Detay için{' '}
          <a href="/cerez-politikasi">Çerez Politikası</a> ve{' '}
          <a href="/sartlar">Kullanım Şartları</a>.
        </p>

        <h3>6. Saklama Süreleri</h3>
        <ul>
          <li>Çalışan kimlik/özlük verileri: İş akdi sona erdikten sonra 10 yıl.</li>
          <li>Pulse anket yanıtları: 12 ay sonra anonimleştirilir (k≥5).</li>
          <li>Audit log (WORM): 7 yıl değiştirilemez saklama.</li>
          <li>Bordro & SGK verisi: 10 yıl (Vergi Usul Kanunu).</li>
          <li>Pazarlama onamı: Geri çekilene kadar.</li>
        </ul>

        <h3>7. Haklarınız (KVKK Madde 11)</h3>
        <ul>
          <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme.</li>
          <li>İşlenmişse bilgi talep etme.</li>
          <li>İşleme amacı ve amacına uygun kullanılıp kullanılmadığını öğrenme.</li>
          <li>Yurt içi/dışında aktarıldığı üçüncü kişileri bilme.</li>
          <li>Eksik/yanlış işlenmişse düzeltilmesini isteme.</li>
          <li>KVKK ve diğer kanunlardaki şartlar çerçevesinde silinmesini/yok edilmesini
            isteme.</li>
          <li>Otomatik sistemlerle analiz edilmesine itiraz etme (KVKK Madde 11/1-g).</li>
          <li>Zararınızın giderilmesini talep etme.</li>
        </ul>

        <p>
          Başvuru kanalı: <a href="mailto:kvkk@upcore.io">kvkk@upcore.io</a>{' '}
          — KVKK Kurul'un belirlediği formatta yazılı başvuru 30 gün içinde ücretsiz
          yanıtlanır. Self-servis portal:{' '}
          <a href="/panel/kvkk">panel.upcore.io/kvkk</a>.
        </p>

        <h3>8. Veri Güvenliği</h3>
        <ul>
          <li>TLS 1.3 in-transit, AES-256 at-rest şifreleme.</li>
          <li>TCKN, IBAN, sağlık verileri için pgcrypto column-level encryption.</li>
          <li>Row-level security (RLS) ile tenant izolasyonu.</li>
          <li>Azure Key Vault'ta anahtar rotasyonu (90 gün).</li>
          <li>ISO 27001 hazırlık; SOC 2 Type II 2026-Q4 hedefi.</li>
        </ul>

        <h3>9. İletişim</h3>
        <p>
          Veri Koruma Sorumlusu (DPO): <a href="mailto:kvkk@upcore.io">kvkk@upcore.io</a>
        </p>

        <hr />

        <h2 id="english">English</h2>

        <h3>1. Data Controller</h3>
        <p>
          <strong>UpCore Teknoloji A.Ş.</strong> — Maslak, Sarıyer / Istanbul, Türkiye.
          Registered with the Istanbul Trade Registry. Contact:{' '}
          <a href="mailto:kvkk@upcore.io">kvkk@upcore.io</a>.
        </p>

        <h3>2. Categories of Personal Data Processed</h3>
        <ul>
          <li>Identity data (name, national ID — encrypted at column level via pgcrypto).</li>
          <li>Contact data (email, phone, work address).</li>
          <li>Professional profile (title, department, CV).</li>
          <li>Engagement and well-being data (BAT-12-TR, COPSOQ-III-TR, 360° feedback).</li>
          <li>Derived analytics (burnout prediction score, psychological capital).</li>
          <li>System logs (IP, browser, audit trail — 7 years WORM).</li>
        </ul>

        <h3>3. Purposes</h3>
        <p>
          Contract execution; legal compliance (Labor Law 4857, SGK Law 5510);
          science-based analytics (JD-R, BAT-TR); security and fraud prevention;
          product improvement (consent-based, k-anonymized).
        </p>

        <h3>4. Legal Basis (KVKK Art. 5)</h3>
        <p>
          Contract necessity, legal obligation, legitimate interest, and explicit consent
          (for survey responses, marketing, cross-border transfer).
        </p>

        <h3>5. Cross-Border Transfer (KVKK Art. 9)</h3>
        <p>
          Data is stored in Microsoft Azure westeurope (Amsterdam, Netherlands). The
          Netherlands is recognized by the Turkish Data Protection Authority as a country
          providing adequate protection. Explicit consent is obtained during onboarding
          Step 7. Standard Contractual Clauses (SCC) are appended to the DPA.
        </p>

        <h3>6. Retention</h3>
        <ul>
          <li>Employee identity data: 10 years after employment termination.</li>
          <li>Pulse survey answers: anonymized (k≥5) after 12 months.</li>
          <li>Audit log (WORM): 7 years immutable retention.</li>
          <li>Payroll & SGK records: 10 years.</li>
          <li>Marketing consent: until withdrawn.</li>
        </ul>

        <h3>7. Your Rights (KVKK Art. 11)</h3>
        <p>
          Access, rectification, erasure, objection to automated decision-making,
          complaint to the Turkish DPA. Submit via{' '}
          <a href="mailto:kvkk@upcore.io">kvkk@upcore.io</a> — free response within 30 days.
        </p>

        <h3>8. Security</h3>
        <p>
          TLS 1.3 in-transit, AES-256 at-rest, pgcrypto column encryption, RLS tenant
          isolation, Azure Key Vault rotation (90 days), ISO 27001 in progress, SOC 2
          Type II targeted 2026-Q4.
        </p>
      </section>
    </main>
  );
}
