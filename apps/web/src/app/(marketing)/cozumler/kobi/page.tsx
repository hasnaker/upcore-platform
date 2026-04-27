import type { Metadata } from 'next';
import { Zap } from 'lucide-react';
import { SolutionPage, type SolutionContent } from '@/components/marketing/SolutionPage';

export const metadata: Metadata = {
  title: 'KOBİ & Mikro İşletme Çözümü — ₺1.900/yıl sabit · 1-10 çalışan',
  description:
    '1-10 çalışanlı mikro işletmeler için UpCore KOBİ paketi. Özlük, izin, bordro, SGK e-Bildirge — yıllık sabit ücret, 5 dakikada başla.',
};

const content: SolutionContent = {
  segment: 'kobi',
  title: '1-10 çalışanlı KOBİ için hazır paket',
  tagline:
    'Muhasebecinize Excel göndermek yerine, SGK e-Bildirge oluşturun. Yıllık ₺1.900 sabit ücret, 5 dakikada kurulum, Türkçe destek. 14 gün ücretsiz deneyin.',
  icon: Zap,
  accent: '#F59E0B',
  heroKpi: [
    { value: '₺1.900', label: 'Yıllık sabit ücret (KDV hariç)' },
    { value: '5 dk', label: 'Ortalama kurulum süresi' },
    { value: '10', label: 'Maksimum çalışan sayısı' },
    { value: '14 gün', label: 'Ücretsiz deneme' },
  ],
  painPoints: [
    {
      title: 'Excel + muhasebeci zinciri',
      desc: 'Her ay özlük + mesai + izin bakiyesi için 3-4 farklı Excel. Muhasebeciye mail, geri düzeltme, SGK hatası. Saatler kaybı.',
    },
    {
      title: 'SGK e-Bildirge bilgi eksikliği',
      desc: 'SGK portali karmaşık, meslek kodu + belge türü + hesaplama hataları. Muhasebeci ücretini ayrıca ödüyorsunuz.',
    },
    {
      title: 'İzin takibi el yordamı',
      desc: 'Yıllık izin bakiyesi Excel\'de, çalışan "kaç günüm var?" deyince saatlerce arşiv arıyorsunuz.',
    },
    {
      title: 'Tek patron, 10 çalışan',
      desc: 'Kurumsal İK yazılımları sizin için fazla — çalışan başı ₺29 x 10 = ₺3.480/ay, yılda ₺42.000 ödemek saçma.',
    },
    {
      title: 'Bordro hataları ceza getiriyor',
      desc: 'Yanlış kesinti, eksik prim, SGK bildirim gecikmesi — cezalar çalışan başına ₺500-5.000 arası.',
    },
    {
      title: 'KVKK uyumu bilinmiyor',
      desc: 'VERBIS kaydı, aydınlatma metni, veri envanteri — "ben küçüğüm, bana gerek yok" yanılgısı. Cezalar ₺50.000+.',
    },
  ],
  upcoreFit: [
    {
      title: 'Yıllık sabit ücret — sürpriz yok',
      desc: '₺1.900/yıl = ₺158/ay. Çalışan başına değil, toplam. 10 kişi de olsa 3 kişi de olsa aynı.',
    },
    {
      title: 'Kurulum 5 dakika',
      desc: 'Şirket adı + vergi no + çalışan listesi (CSV veya manuel). Onboarding videosuyla kendi başınıza açarsınız.',
    },
    {
      title: 'SGK e-Bildirge otomatik',
      desc: 'Aylık bildirge tek tıkla hazırlanır, XML çıktısı alırsınız. Muhasebecinize gönderin veya direkt yükleyin.',
    },
    {
      title: 'Türkçe destek + eğitim',
      desc: 'WhatsApp destek hattı (mesai içi), video kütüphanesi, haftalık canlı soru-cevap webinar\'ı.',
    },
    {
      title: 'KVKK "starter kit" dahil',
      desc: 'Aydınlatma metni şablonu, VERBIS rehberi, veri envanteri otomatik oluşturma — avukat ücreti ödemeyin.',
    },
    {
      title: '11+ çalışana geçince Starter\'a yükseltin',
      desc: 'Büyüdüğünüzde Starter tier\'a migration bir tık — verileriniz, ayarlarınız, geçmişiniz korunur.',
    },
  ],
  relevantModules: [
    {
      title: 'Özlük & Sözleşme',
      href: '/moduller',
      desc: 'Dijital özlük, 4857 sözleşme şablonları, e-imza (opsiyonel).',
    },
    {
      title: 'İzin & Mesai',
      href: '/moduller',
      desc: 'Yıllık/hastalık/mazeret izni, fazla mesai, vardiya takibi.',
    },
    {
      title: 'Bordro + SGK',
      href: '/moduller',
      desc: 'Maaş hesaplama, SGK e-Bildirge, muhtasar, banka transfer.',
    },
  ],
  pricingNote:
    'KOBİ Micro paketi: yıllık ₺1.900 sabit ücret (KDV hariç). 1-10 çalışan için tam platform. 14 gün ücretsiz deneme, kredi kartı bilgisi istenmez. İptal isterseniz kalan sürenin ücreti iade edilir.',
  testimonial: {
    quote:
      '6 çalışanım var, muhasebeciye ayda ₺2.500 ödüyordum. UpCore\'a geçtim, yıllık ₺1.900\'e tüm bordroyu kendim çıkarıyorum.',
    who: 'Kafe işletmecisi',
    role: 'Ankara · 6 çalışan (pilot kullanıcı)',
  },
};

export default function KobiPage() {
  return <SolutionPage content={content} />;
}
