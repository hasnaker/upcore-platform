import type { Metadata } from 'next';
import { Users } from 'lucide-react';
import { SolutionPage, type SolutionContent } from '@/components/marketing/SolutionPage';

export const metadata: Metadata = {
  title: '300K+ Başvuru Şirketi Çözümü — Volume ATS + Psikometrik Filtreleme',
  description:
    'Yılda 300.000+ başvuru alan kurumsal markalar için UpCore — Kariyer.net + LinkedIn feed, otomatik CV parsing, bulk psikometrik battery, JD-R fit skoru ile filtreleme.',
};

const content: SolutionContent = {
  segment: 'ats',
  title: 'Yılda 300.000 başvuruyu 10.000 mülakata indiren akıllı filtre',
  tagline:
    'Kariyer.net + LinkedIn\'den gelen dev hacmi %3\'e filtrelemek için psikometrik + JD-R fit skoru — hem İK ekibinizi rahatlatır hem de yanlış işe alım maliyetini %45 azaltır.',
  icon: Users,
  accent: '#5E5CE6',
  heroKpi: [
    { value: '300K+', label: 'Yıllık başvuru hacmi' },
    { value: '%3', label: 'Otomatik filtre sonrası mülakat' },
    { value: '8 aşama', label: 'ATS pipeline state machine' },
    { value: '%45', label: 'Yanlış işe alım maliyet azalışı' },
  ],
  painPoints: [
    {
      title: 'Dev başvuru hacmi',
      desc: 'Yıllık 300K+ başvuru manuel okunamaz. Mevcut ATS\'ler (Hurriyet, Kariyer.net kendi ATS\'i) yalnızca liste + etiket verir, filtreleme yok.',
    },
    {
      title: 'CV parsing eksikliği',
      desc: 'Her başvuru farklı format — PDF, DOCX, JPG. Manuel veri giriş süresi başvuru başına 3 dakika. 300K × 3 dk = 15.000 saat.',
    },
    {
      title: 'Psikometrik ayrı araç',
      desc: 'Mind Garden, CEB, SHL ayrı lisans. Aday deneyimi kötü: 3 farklı linke giriş, 2 saat test. Bırakma oranı %65.',
    },
    {
      title: 'Duplikasyon tespiti yok',
      desc: 'Aynı aday LinkedIn + Kariyer.net + website üzerinden 3 kez başvurur. Mevcut sistemlerde otomatik matching zayıf.',
    },
    {
      title: 'Bias riski',
      desc: 'Adverse impact (4/5ths rule) testi çoğu ATS\'de yok — hukuki risk, düzenleyici denetim hazırlığı eksik.',
    },
    {
      title: 'Erken ayrılma',
      desc: 'İşe alınan adayların %25\'i ilk 6 ayda ayrılır. Maliyet: pozisyon başına 3-6 aylık maaş. Geleneksel ATS bu riski tahmin etmez.',
    },
  ],
  upcoreFit: [
    {
      title: 'Çok kanallı feed',
      desc: 'Kariyer.net XML, LinkedIn Jobs API, kendi portalın, bulk CSV — hepsi tek havuz. E-posta + TCKN eşleşmesiyle %99.3 duplikasyon tespiti.',
    },
    {
      title: 'Türkçe CV parsing (NER)',
      desc: 'Türkçe-tuned Named Entity Recognition — ad, soyad, email, telefon, deneyim, beceriler %93+ doğruluk. Manuel giriş gerekmez.',
    },
    {
      title: 'Tek oturum psikometrik',
      desc: 'BAT-12-TR + IPIP-50-TR + bilişsel beceri → 25-30 dk tek link. Adaptif zorluk, anti-cheating. Completion rate %78.',
    },
    {
      title: 'JD-R fit otomatik sıralama',
      desc: 'Pozisyonun 6 talep + 6 kaynak profiline göre adayın uygun skoru. Top %10 otomatik kısa listesi, en zayıf gap\'ten Türkçe mülakat soruları.',
    },
    {
      title: 'Adverse impact audit',
      desc: 'Her işe alım döneminde 4/5ths rule otomatik kontrol. Cinsiyet/yaş ayrımı tespit edilirse uyarı + bias düzeltme önerileri.',
    },
    {
      title: 'Erken ayrılma tahmini',
      desc: 'XGBoost modeli — benzer profil geçmişine göre ilk 6 ay ayrılma olasılığı %60+ ise mülakatçı uyarılır. Yanlış işe alım maliyeti %45 düşer.',
    },
  ],
  relevantModules: [
    {
      title: 'Kazanım',
      href: '/moduller/kazanim',
      desc: 'ATS + CV parsing + psikometri tek yerde.',
    },
    {
      title: 'Koruma',
      href: '/moduller/koruma',
      desc: 'İşe alım sonrası onboarding + erken müdahale.',
    },
    {
      title: 'Yerleştirme',
      href: '/moduller/yerlestirme',
      desc: 'Dış + iç havuzu birleştir, mobilite artır.',
    },
  ],
  pricingNote:
    'Volume ATS segmenti için özel teklif — başvuru sayısına dayalı tiered pricing. 300K+ başvuru, bulk psikometrik battery, CV parsing, adverse impact audit dahil. Başlangıç aylık ₺80.000.',
};

export default function AtsSolutionPage() {
  return <SolutionPage content={content} />;
}
