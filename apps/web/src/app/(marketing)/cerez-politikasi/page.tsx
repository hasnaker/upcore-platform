import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Çerez Politikası',
  description:
    "UpCore tarafından kullanılan çerez kategorileri, amaçları ve kullanıcı tercih yönetimi.",
  alternates: { canonical: 'https://upcore.io/cerez-politikasi' },
};

export default function CookiePolicyPage() {
  return (
    <main className="mx-auto w-full max-w-[860px] px-6 py-20 text-[#111827]">
      <header className="border-b border-[#E5E7EB] pb-6">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
          Yasal · Çerez Politikası
        </p>
        <h1 className="mt-2 font-mono text-[28px] font-bold leading-tight">
          UpCore Çerez Politikası
        </h1>
        <p className="mt-3 text-[13px] text-[#6B7280]">
          Son güncelleme: 24 Nisan 2026 · Sürüm 2026-04-24
        </p>
      </header>

      <section className="prose prose-neutral mt-8 max-w-none text-[14px] leading-relaxed">
        <h3>1. Çerez Nedir?</h3>
        <p>
          Çerez, ziyaret ettiğiniz web siteleri tarafından tarayıcınıza yerleştirilen
          küçük veri parçalarıdır. Çerezler oturum yönetimi, tercih hatırlama ve analitik
          için kullanılır.
        </p>

        <h3>2. UpCore Hangi Çerezleri Kullanır?</h3>

        <h4>2.1 Zorunlu Çerezler (Kapatılamaz)</h4>
        <table>
          <thead>
            <tr>
              <th>Ad</th>
              <th>Amaç</th>
              <th>Saklama Süresi</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>__clerk_session</td>
              <td>Oturum yönetimi (Clerk auth)</td>
              <td>Oturum sonu</td>
            </tr>
            <tr>
              <td>__clerk_csrf</td>
              <td>CSRF koruma</td>
              <td>Oturum sonu</td>
            </tr>
            <tr>
              <td>upcore.tenant</td>
              <td>Aktif tenant seçimi</td>
              <td>90 gün</td>
            </tr>
            <tr>
              <td>upcore.cookie-consent.v1</td>
              <td>Çerez tercih kaydı (kendisi)</td>
              <td>365 gün</td>
            </tr>
          </tbody>
        </table>

        <h4>2.2 Analitik Çerezler (Açık Rıza)</h4>
        <table>
          <thead>
            <tr>
              <th>Ad</th>
              <th>Sağlayıcı</th>
              <th>Amaç</th>
              <th>Saklama</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>_plausible</td>
              <td>Plausible Analytics (AB-hosted)</td>
              <td>Anonim sayfa görüntüleme (PII yok)</td>
              <td>1 gün</td>
            </tr>
          </tbody>
        </table>

        <p>
          Plausible çerezleri <strong>cookieless</strong> moddadır — kişisel tanımlayıcı
          içermez. Sadece anonim sayfa görüntüleme ve tıklama sayılır.
        </p>

        <h4>2.3 Pazarlama Çerezleri (Açık Rıza)</h4>
        <p>
          Şu anda pazarlama çerezi kullanılmamaktadır. Gelecekte eklenirse bu politika
          güncellenir ve yeniden onamınız istenir.
        </p>

        <h3>3. Tercihinizi Nasıl Yönetirsiniz?</h3>
        <ul>
          <li>Siteye ilk girişte alt banner üzerinden kategori bazında seçim yapabilirsiniz.</li>
          <li>"Detaylı Ayarlar" butonu ile kategori toggle'ları açabilirsiniz.</li>
          <li>Seçiminizi değiştirmek için tarayıcı localStorage'dan{' '}
            <code>upcore.cookie-consent.v1</code> anahtarını silin.</li>
          <li>Tarayıcı ayarlarından tüm çerezleri devre dışı bırakabilirsiniz; ancak
            zorunlu çerezler olmadan Hizmet çalışmaz.</li>
        </ul>

        <h3>4. Yasal Dayanak</h3>
        <p>
          KVKK Madde 5/2 (sözleşmenin ifası — zorunlu çerezler) ve Madde 5/1 (açık rıza
          — analitik ve pazarlama çerezleri). ePrivacy Directive 2002/58/EC Madde 5(3)
          uyumlu açık rıza akışı uygulanır.
        </p>

        <h3>5. Üçüncü Taraf Servisler</h3>
        <ul>
          <li>
            <strong>Clerk (kimlik doğrulama):</strong> us-east-1 — MSA + DPA imzalı.
            Clerk <a href="https://clerk.com/privacy" rel="noreferrer" target="_blank">gizlilik politikası</a>.
          </li>
          <li>
            <strong>Plausible Analytics:</strong> Almanya (AB) — cookieless mode, GDPR
            native compliant.
          </li>
          <li>
            <strong>Azure Application Insights:</strong> Microsoft westeurope — sunucu
            tarafı, tarayıcı çerezi yok.
          </li>
        </ul>

        <h3>6. İletişim</h3>
        <p>
          Soru veya itiraz için: <a href="mailto:kvkk@upcore.io">kvkk@upcore.io</a>. Bkz{' '}
          <a href="/gizlilik">KVKK Aydınlatma Metni</a>.
        </p>
      </section>
    </main>
  );
}
