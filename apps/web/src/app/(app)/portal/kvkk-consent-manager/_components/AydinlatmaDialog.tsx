'use client';

/**
 * KVKK aydınlatma metni + açık rıza beyanı modal'ı.
 *
 * Sayfa shell'i kullanıcının daha önce kabul edip etmediğini
 * `usePrivacyAcceptance` hook'u ile takip eder. Kabul edilmeden toggle
 * butonları disabled kalır (KVKK Madde 10 — bilgilendirme zorunluluğu).
 */
import { Check, Shield } from 'lucide-react';

interface AydinlatmaDialogProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function AydinlatmaDialog({ onAccept, onDecline }: AydinlatmaDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kvkk-privacy-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]"
    >
      <div className="w-full max-w-2xl rounded-xl border border-line bg-bg p-6 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 id="kvkk-privacy-title" className="text-lg font-semibold text-ink">
              KVKK Aydınlatma Metni ve Açık Rıza Beyanı
            </h2>
            <p className="mt-1 text-[12px] text-ink-60">
              6698 sayılı Kişisel Verilerin Korunması Kanunu · Madde 10 & Madde 5
            </p>
          </div>
        </div>

        <div className="mt-4 max-h-[320px] overflow-y-auto rounded-md border border-line bg-bg-2 p-4 text-[13px] leading-relaxed text-ink-80">
          <p className="font-semibold text-ink">Veri Sorumlusu</p>
          <p className="mt-1">
            UpCore platformu (&quot;Şirket&quot;), 6698 sayılı KVKK kapsamında{' '}
            <strong>veri sorumlusu</strong> sıfatıyla; ad-soyad, TCKN, iletişim bilgileri, özlük,
            performans, tükenmişlik (BAT-TR), bağlılık (UWES-9), psikolojik sermaye (UpCap-TR)
            verilerinizi aşağıda belirtilen amaçlarla işler.
          </p>

          <p className="mt-4 font-semibold text-ink">İşleme Amaçları</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>İş sözleşmesinin kurulması ve ifası (bordro, izin, özlük)</li>
            <li>Performans değerlendirme ve kariyer gelişimi süreçlerinin yürütülmesi</li>
            <li>Bilimsel temelli tükenmişlik ve iş-yaşam dengesi pulse izlemesi</li>
            <li>Anonimleştirilmiş agregat analitik ile süreç iyileştirme</li>
            <li>
              Opsiyonel AI tabanlı öneri ve tahminlerin (tükenmişlik riski, kariyer yolu, rotasyon
              önerisi) üretilmesi
            </li>
          </ul>

          <p className="mt-4 font-semibold text-ink">Haklarınız (Madde 11)</p>
          <p className="mt-1">
            Verilerinize erişme, düzeltme, silme, anonimleştirme ve AI otomatik kararlarına itiraz
            (Madde 22) haklarınız saklıdır. Bu hakları Portal &gt; KVKK Başvuru sayfasından
            kullanabilirsiniz. Rıza kararlarınızı dilediğiniz zaman aynı sayfa üzerinden geri
            çekebilirsiniz.
          </p>

          <p className="mt-4 font-semibold text-ink">Saklama Süresi</p>
          <p className="mt-1">
            Veri kategorilerine göre 2–10 yıl. KVKK Madde 28 kapsamında anonimleştirme sonrası
            süresiz tutulabilir.
          </p>

          <p className="mt-4 font-semibold text-ink">Açık Rıza Beyanı</p>
          <p className="mt-1">
            Yukarıda yer alan amaçlarla kişisel verilerimin işlenmesine bilgilendirilmiş ve
            aydınlatılmış şekilde; her bir rıza tipine ayrı ayrı karar verme hakkımı saklı tutarak
            açık rıza verdiğimi beyan ederim.
          </p>
        </div>

        <div className="mt-5 flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onDecline}
            className="inline-flex items-center justify-center rounded-md border border-line bg-bg px-4 py-2 text-[13px] font-medium text-ink-80 transition-colors hover:bg-bg-2"
          >
            Şimdilik reddet
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="inline-flex items-center justify-center gap-1 rounded-md bg-ink px-4 py-2 text-[13px] font-medium text-bg transition-colors hover:bg-ink/90"
          >
            <Check className="h-4 w-4" />
            Okudum, kabul ediyorum
          </button>
        </div>
      </div>
    </div>
  );
}
