import type { Metadata } from 'next';
import { Network } from 'lucide-react';
import { SolutionPage, type SolutionContent } from '@/components/marketing/SolutionPage';

export const metadata: Metadata = {
  title: 'Holding & 4000+ Çalışan Çözümü — Multi-Entity CHRO Dashboard',
  description:
    '4000-50000 çalışanlı holding ve grup şirketleri için UpCore — multi-entity consolidation, SAP/Logo entegrasyon, CHRO executive dashboard.',
};

const content: SolutionContent = {
  segment: 'holding',
  title: '4.000+ çalışanlı holding için CHRO tek ekranı',
  tagline:
    'SAP SuccessFactors pahalı ve karmaşık, Kolay İK yetersiz. UpCore grup-level consolidation, her şirket için ayrı tenant, CHRO için agregat executive dashboard.',
  icon: Network,
  accent: '#5E5CE6',
  heroKpi: [
    { value: '4000+', label: 'Hedef çalışan sayısı' },
    { value: '6-12', label: 'Grup şirketi multi-entity' },
    { value: '%40', label: 'SAP SF\'e kıyasla lisans tasarrufu' },
    { value: '2 hafta', label: 'SAP/Logo entegrasyon ortalama süre' },
  ],
  painPoints: [
    {
      title: 'SAP SuccessFactors pahalılığı',
      desc: 'Lisans ücreti kişi başı yıllık $80-150. 5000 çalışanda yıllık $400K-$750K. Ekstra: implementation $500K+, yıllık bakım %20.',
    },
    {
      title: 'Grup şirketleri veri siloları',
      desc: '6 şirketin her biri ayrı İK yazılımı, CHRO board raporu için 3 hafta manuel agregat. "Gerçek zamanlı yönetim" imkansız.',
    },
    {
      title: 'Psikometrik eksikliği',
      desc: 'Ne SAP ne Oracle HCM psikometrik assessment içerir. Her sistem ayrı Mind Garden, BrightHR vs — entegrasyon karmaşası.',
    },
    {
      title: 'Board raporlama yetersizliği',
      desc: 'CHRO\'nun 3 ayda bir 45 slide hazırlaması için İK ekibi 80 saat harcıyor. Verinin "neden"i kayıp.',
    },
    {
      title: 'Türkçe uyum + KVKK',
      desc: 'Global araçlar Türkçe UI, Türk personel tipleri (4857/4B), KVKK retention yok ya da eksik.',
    },
    {
      title: 'Yavaş implementasyon',
      desc: 'SAP SF 9-18 ay go-live. Kolay İK 2 hafta ama hiç derinlik yok. Orta yol eksik.',
    },
  ],
  upcoreFit: [
    {
      title: 'Multi-entity consolidation',
      desc: 'Her grup şirketi kendi tenant\'ında, RLS ile veri izolasyonu. CHRO için agregat view — grup ortalamaları, karşılaştırmalı heatmap.',
    },
    {
      title: 'Executive dashboard',
      desc: 'Haftalık Pazartesi raporu: grup-level BAT ortalaması, kritik çalışan sayısı, işe alım pipeline, finansal özet — PDF export.',
    },
    {
      title: 'SAP/Logo entegrasyonu',
      desc: 'Çift yönlü sync: SAP\'den çalışan listesi çeker, UpCore skor + risk verilerini SAP\'e geri yazar. 2 haftada canlı.',
    },
    {
      title: 'Psikometrik + JD-R built-in',
      desc: 'BAT-12-TR, IPIP-50-TR, UpCap-TR, JCS hepsi yerleşik — ekstra lisans ücreti yok, telif riski yok.',
    },
    {
      title: '%40 daha ucuz',
      desc: 'SAP SF lisansının yarısından başlayan fiyatlar. 5000 çalışanda yıllık ~$240K vs SAP $600K+.',
    },
    {
      title: 'Hızlı go-live',
      desc: 'Standart implementasyon 6 hafta. Pilot 1 grup şirketinde 2 hafta içinde başlar.',
    },
  ],
  relevantModules: [
    {
      title: 'Sürdürme',
      href: '/moduller/surdurme',
      desc: 'Grup-level heatmap, trend, JD-R.',
    },
    {
      title: 'Kazanım',
      href: '/moduller/kazanim',
      desc: 'Executive level için özel assessment battery.',
    },
    {
      title: 'Yerleştirme',
      href: '/moduller/yerlestirme',
      desc: 'Grup içi rotasyon + succession critical 40 pozisyon.',
    },
  ],
  pricingNote:
    'Holding/4000+ çalışan segmenti için özel teklif — aylık ₺20.000-100.000 aralığında. Multi-entity consolidation, SAP/Logo API integration ve executive dashboard paketi dahil.',
};

export default function HoldingPage() {
  return <SolutionPage content={content} />;
}
