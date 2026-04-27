import type { Metadata } from 'next';
import { Building2 } from 'lucide-react';
import { SolutionPage, type SolutionContent } from '@/components/marketing/SolutionPage';

export const metadata: Metadata = {
  title: 'Belediye & Kamu Çözümü — 657/4B/4857 + Zabıta/Temizlik Tükenmişlik',
  description:
    '2.000-50.000 çalışanlı belediye/kamu kurumları için UpCore — SGK bildirimi, kadro, hizmet puanı, sicil ve BAT-TR tabanlı tükenmişlik önleme.',
};

const content: SolutionContent = {
  segment: 'belediye',
  title: 'Kamu ve Belediye için bilim-temelli İK',
  tagline:
    '12.000 çalışanı tek Excel\'de yönetmek imkânsız. 657/4B/4857 personel tipleri, SGK bildirimi, kadro hareketleri ve yüksek riskli birimlerde tükenmişlik erken uyarısı — hepsi tek platform.',
  icon: Building2,
  accent: '#5E5CE6',
  heroKpi: [
    { value: '12.000+', label: 'Pilot belediyede çalışan' },
    { value: '4', label: 'Personel tipi (657/4B/4857/Geçici)' },
    { value: '%32', label: 'Zabıta/temizlik ort. BAT-TR' },
    { value: 'KVKK', label: 'Azure TR region, uyumlu' },
  ],
  painPoints: [
    {
      title: 'Personel tipi karmaşası',
      desc: 'Memur (657), Sözleşmeli (4/B), İşçi (4857), Geçici — her biri farklı özlük, izin, bordro kuralı. Normal İK yazılımları bu yapıyı bilmez.',
    },
    {
      title: 'Kadro + hizmet puanı takibi',
      desc: 'Kadro derece/kademe ilerlemesi, hizmet puanı hesaplama, devlet sınavı ilişkisi — manuel Excel\'de hata riski yüksek.',
    },
    {
      title: 'Yüksek riskli birim tükenmişliği',
      desc: 'Zabıta, temizlik, mezarlık birimi çalışanlarında tükenmişlik %30+ kırmızı band ama ölçüm yok. Turnover maliyeti %45\'e kadar çıkıyor.',
    },
    {
      title: 'SGK + ESHB entegrasyonu',
      desc: 'SGK bildirimleri manuel — gecikme, hata, ceza riski. Çalışan sayısı arttıkça süreç dayanılmaz.',
    },
    {
      title: 'Siyasi değişimde süreklilik',
      desc: 'Yönetim değişimi, veri kaybı, prosedür kopukluğu. Kurumsal hafıza yok.',
    },
    {
      title: 'Şeffaflık baskısı',
      desc: 'Sayıştay denetimi + kamuoyu bilgi talepleri — veri saklama, audit log, KVKK yükümlülükleri kritik.',
    },
  ],
  upcoreFit: [
    {
      title: 'Türkiye mevzuatına özel',
      desc: 'Personel tipi dropdown\'ları, kadro takibi, hizmet puanı, SGK alanları tasarım-seviyesinde yerleşik.',
    },
    {
      title: 'Zabıta/temizlik fokuslu BAT-TR',
      desc: 'Yüksek riskli birimler için haftalık pulse + iş yükü modifikasyonu müdahaleleri. 8 haftada %15 BAT düşüşü.',
    },
    {
      title: 'KVKK + ISO 27001 yol haritası',
      desc: 'Azure TR region, AES-256, immutable audit log, RLS tenant isolation. Kamu uyum standartlarına hazır.',
    },
    {
      title: 'Sayıştay raporlama',
      desc: 'Personel hareket raporu, izin-mesai dengeleri, kadro kullanım oranları — tek tıkla Excel/PDF export.',
    },
    {
      title: 'Bakanlık entegrasyon API\'ları',
      desc: 'e-Devlet, SGK, ESHB, MERNIS integration hook\'ları pilotta test ediliyor (Samsun Büyükşehir).',
    },
    {
      title: 'Yönetim değişimi güvencesi',
      desc: 'Veri ihracı 30 gün içinde, sözleşme sonu temiz migration, 5 yıl arşiv. Kurumsal süreklilik.',
    },
  ],
  relevantModules: [
    {
      title: 'Sürdürme',
      href: '/moduller/surdurme',
      desc: 'Zabıta/temizlik tükenmişlik heatmap + erken uyarı.',
    },
    {
      title: 'Kazanım',
      href: '/moduller/kazanim',
      desc: 'Devlet sınavı sonuçları + psikometrik fit.',
    },
    {
      title: 'Koruma',
      href: '/moduller/koruma',
      desc: 'Yüksek riskli birim için özel müdahale protokolleri.',
    },
  ],
  pricingNote:
    'Belediye segmenti için özel teklif — aylık ₺50.000-200.000 aralığında, çalışan sayısı ve modül seçimine göre. KVKK uyumluluk paketi ücretsiz dahil, 3 ay pilot garanti.',
  testimonial: {
    quote:
      'UpCore\'un bilim temeli bizim için sadece bir yazılım değil — memurumuzun ölçülmeyen yüküne ilk defa somut bir cevap.',
    who: 'Samsun Büyükşehir Belediyesi',
    role: 'İnsan Kaynakları Daire Başkanlığı (pilot görüşme)',
  },
};

export default function BelediyePage() {
  return <SolutionPage content={content} />;
}
