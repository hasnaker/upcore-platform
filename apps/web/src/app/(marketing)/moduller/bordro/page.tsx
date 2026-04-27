import type { Metadata } from 'next';
import { FileText } from 'lucide-react';
import { ModulePage, type ModuleContent } from '@/components/marketing/ModulePage';

export const metadata: Metadata = {
  title: 'Bordro · 657 + 4857 + 4B + SGK e-Bildirge Otomasyonu · UpCore',
  description:
    'UpCore Bordro modülü: Memur + işçi + sözleşmeli personel tek motor · SGK e-Bildirge XML otomatik · muhtasar beyan · banka ödeme dosyası · yanlış kesinti cezaları biter.',
};

const content: ModuleContent = {
  category: 'bordro',
  title: 'Bordroda hata yapmak cezayla biter — önlüyoruz',
  tagline:
    'Bordroda yanlış bir kesinti, geç SGK bildirimi veya eksik prim ödeme — çalışan başı ₺500-5.000 ceza demek. 10 çalışanı olan kafe bu hatayla aylığının yarısını verebilir. UpCore Bordro motoru bu hataları doğuştan önler: 657 memur, 4857 işçi, 4/B sözleşmeli — hepsini tek motorda, SGK + muhtasar + banka dosyalarını tek tıkla.',
  icon: FileText,
  accent: '#10B981',
  heroStats: [
    { value: '4 saat', label: 'Aylık bordro kapatma (holding)' },
    { value: '0 ceza', label: 'SGK e-Bildirge otomasyonu sonrası' },
    { value: '%94', label: 'Bordro doğruluk oranı' },
    { value: '3 dk', label: 'KOBİ için aylık bordro süresi' },
  ],
  intro:
    "Bir şirkette bordro, çalışanların aldığı maaşın hesaplanmasından çok daha fazlası. Devletle olan ilişkinizin özeti: SGK'ya kaç gün prim ödediniz, gelirden ne kadar stopaj kestiniz, iş kazası fonuna ne verdiniz. Yanlış hesaplarsanız: çalışana eksik maaş ödeyerek mahkemeye verilirsiniz, SGK cezası kesilir, muhtasar beyanı düzeltmeniz gerekir, banka sistemi reddederse o ay tüm personel parasını alamaz. UpCore Bordro motoru bu riskleri bilerek tasarlandı: her kuraldaki istisna, her istisnanın ayrıksı durumu (örn: doğum izni sonrası analık bildirgesi), her kanun değişikliği sistemde. 2026 yılı asgari ücret değişikliği geldiğinde panik yapmazsınız — sistem 1 Ocak'ta kendi kendini günceller.",
  features: [
    {
      title: '3 personel tipi tek motor',
      desc: '657 memur (kadro + derece + kademe otomasyonu) + 4857 işçi (normal mesai + fazla mesai + tatil zammı) + 4/B sözleşmeli (özel hesaplama) — hepsi tek tenant. Belediyede aynı anda üçünü yönetin, bir yönetici paneli, bir rapor.',
    },
    {
      title: 'SGK e-Bildirge otomatik XML',
      desc: 'Ayın sonunda tek tıkla XML hazırlanır · SGK portalına yükleme + muhasebecinize mail + PDF arşivi. Meslek kodu + belge türü doğru otomatik seçilir — el yordamıyla yapılan en yaygın hata.',
    },
    {
      title: 'Asgari ücret + vergi dilimi otomatik',
      desc: 'Devlet yeni asgari ücret açıkladığında (Aralık sonu), UpCore 1 Ocak\'ta otomatik günceller · tüm bordrolarda yeni taban + vergi dilimleri aktif olur. Excel\'de manuel düzeltmek zorunda kalmazsınız.',
    },
    {
      title: 'Muhtasar beyan + banka ödeme',
      desc: 'Ay sonunda muhtasar beyan dosyası GİB formatında hazır · banka transferi için o bankanın istediği format (Garanti, İş Bankası, Ziraat, Yapı Kredi hepsi) tek tıkla indirilir.',
    },
    {
      title: 'Çalışan maaş bordrosu (PDF)',
      desc: 'Her ay her çalışana özel PDF bordro · QR kodlu imza · e-posta ile otomatik gönderim. Çalışan dilediği geçmiş ayın bordrosunu kendi portalından indirebilir.',
    },
    {
      title: 'Prim, ikramiye, yıllık izin hesapları',
      desc: 'Yılbaşı ikramiyesi, performans primi, yıllık izin bakiyesinin ücrete dönüştürülmesi (çıkışta) — hepsinin kanundaki hesaplama kuralı sistemde.',
    },
    {
      title: 'Borç/avans yönetimi',
      desc: 'Çalışan maaş avansı aldı · sistem sonraki aylara otomatik bölüştürür · net maaştan keser · bordroda açıkça gösterir.',
    },
    {
      title: 'Kesinti türleri',
      desc: 'SGK işçi payı + işsizlik payı + gelir vergisi + damga vergisi + AGI (asgari geçim indirimi) + sendika aidatı + icra kesintisi — hepsi ayrı kalemde, açıklamalı.',
    },
    {
      title: 'Doğum izni + askerlik + rapor',
      desc: 'Doğum izninde analık bildirgesi · raporlu günlerde rapor bildirgesi · askerlik haklarında özel hesap · hepsi iş akışında otomatik tetiklenir · hiçbirini unutma ihtimali yok.',
    },
    {
      title: 'Çıkış bordrosu + kıdem tazminatı',
      desc: 'Bir çalışan ayrılıyor · sistem otomatik hesaplar: çalışılan günler × son brüt × tavan (2026\'da ₺22.104/yıl). Kıdem tazminatı + ihbar tazminatı + kullanılmayan izin ücreti + son maaş hepsi tek PDF\'te.',
    },
  ],
  workflow: [
    {
      step: '01',
      title: 'Ay sonu veriler toplanır',
      desc: 'Çalışanların mesai, fazla mesai, izin, rapor, avans bilgileri otomatik bordroya akar · manuel Excel toplamaya gerek yok.',
    },
    {
      step: '02',
      title: 'Taslak hesaplama',
      desc: 'Sistem brüt → net hesabı yapar · tüm kesintiler + primler · manager ve İK taslağı onaylar.',
    },
    {
      step: '03',
      title: 'Onay ve kilitleme',
      desc: 'Onaylandı · bordro kilitlenir · değişiklik için yeniden onay gerekir · audit log\'a düşer.',
    },
    {
      step: '04',
      title: 'SGK e-Bildirge + muhtasar',
      desc: 'XML + GİB formatı otomatik üretilir · SGK portalına yükleme + muhasebeci mail.',
    },
    {
      step: '05',
      title: 'Banka ödeme dosyası',
      desc: 'Bankanın istediği formatta ödeme dosyası hazır · personel maaşları tek tıkla transfer.',
    },
    {
      step: '06',
      title: 'Çalışan bordroları + arşiv',
      desc: 'PDF bordrolar otomatik üretilir · çalışanın e-postasına + portala düşer · 7 yıl arşiv.',
    },
  ],
  outcomes: [
    { metric: 'Aylık bordro süresi', value: '4 saat', desc: 'Eskiden 3 hafta sürüyordu · holding vakası · 18 şirket konsolide' },
    { metric: 'SGK ceza', value: '3 → 0', desc: 'KOBİ kafe örneği · otomatik bildirge sonrası yıllık' },
    { metric: 'Yıllık tasarruf', value: '₺28.100', desc: 'Kafe örneği · muhasebeci ₺30K/yıl yerine UpCore ₺1.9K' },
  ],
  comparison: [
    {
      feature: '657 + 4857 + 4/B tek motor',
      upcore: 'Yerleşik · belediye için özel',
      others: 'Ayrı ayrı modül · SAP\'de ek lisans',
    },
    {
      feature: 'SGK e-Bildirge otomatik',
      upcore: 'XML + yükleme + mail',
      others: 'Excel + manuel portal',
    },
    {
      feature: 'Asgari ücret güncel tutma',
      upcore: '1 Ocak otomatik',
      others: 'Manuel Excel düzeltme',
    },
    {
      feature: 'Banka dosya formatları',
      upcore: 'Garanti · İş · Ziraat · Yapı Kredi (4)',
      others: 'Tek format · diğerleri manuel',
    },
    {
      feature: 'Türkçe kanun desteği',
      upcore: 'Ana dil · 3 personel tipi',
      others: 'Sadece 4857 · memur yok (SAP)',
    },
    {
      feature: 'Kurulum süresi',
      upcore: 'Micro: 5 dk · Professional: 1 hafta',
      others: 'BordroCep: 1 gün · SAP: 3-6 ay',
    },
  ],
  instruments: [
    'SGK 5510 kanunu · tam uyumlu',
    '657 memur + 4857 işçi + 4/B sözleşmeli kanunlar',
    'Gelir Vergisi Kanunu · yıllık dilim güncellemesi',
    'İş Kanunu · kıdem/ihbar tazminatı hesaplamaları',
  ],
  useCases: [
    {
      segment: 'Kafe sahibi (6 çalışan)',
      scenario:
        'Ayşe Hanım 6 çalışanlı kafesinde aylık ₺2.500 muhasebeciye ödüyordu · hatalarda 3 kez ceza kesildi. UpCore Micro ile ₺1.900/yıla geçti · ayda 30 dakikasını ayırıp kendi bordrosunu çıkarıyor · SGK e-Bildirge otomatik · yıllık ₺28.100 tasarruf.',
    },
    {
      segment: 'Belediye İK Müdürü (12.000 çalışan)',
      scenario:
        'Fatma Hanım belediyede 657 memur (8.500) + 4/B sözleşmeli (2.000) + 4857 işçi (1.500) · eskiden 3 farklı Excel\'de ayrı takip ediyordu. UpCore\'da tek tenant · aylık bordro süresi 2 haftadan 4 saate düştü · Sayıştay denetimine hazır rapor tek tıkla.',
    },
    {
      segment: 'Holding CFO (24.000 çalışan)',
      scenario:
        'Ahmet Bey 18 şirketli holdingde her ay 18 farklı bordro sistemi konsolide edilemiyordu. UpCore multi-entity yapısı ile: tüm şirketler tek motorda · konsolide rapor 4 saatte · her şirketin kendi vergi numarasıyla ayrı SGK bildirgesi · CFO\'nun board raporu artık veri ile.',
    },
  ],
  faq: [
    {
      q: 'Mevcut bordro sistemimizden (Logo / Paraşüt / Netsis) geçiş?',
      a: 'Ücretsiz veri taşıma hizmeti. Son 12 aylık bordro geçmişi + çalışan bilgileri + SGK bildirge geçmişi 2 hafta içinde taşınır. Micro tier için CSV upload 10 dakikada biter.',
    },
    {
      q: 'Asgari ücret değişirse ne olur?',
      a: 'Devlet Aralık sonunda açıklar · biz 1 Ocak sabahı sistemde aktifleriz. Tüm bordrolar yeni taban + vergi dilimlerine göre hesaplanır · siz hiçbir şey yapmazsınız. Emekli/sözleşmeli farklı kuralları da güncellenir.',
    },
    {
      q: 'Yanlış bordro yaptıysak nasıl düzeltiriz?',
      a: '"Retro bordro" özelliği: geçmiş aylardaki hatayı düzeltirsiniz · sistem aradaki farkı hesaplar · bu ayın bordrosuna + kesintisine otomatik yansıtır · SGK düzeltme bildirgesi üretilir. Manuel Excel\'le bu hesap günlerce sürerdi.',
    },
    {
      q: 'KDV + gider pusulası + yabancı para işlemleri?',
      a: 'Starter + plan: TL temel. Professional + plan: multi-currency (USD, EUR) + yabancı dil bordrosu (İngilizce için). Gider pusulası entegrasyonu Logo Tiger + Netsis + Paraşüt için hazır · dış taşeron ödemeleri otomatik oluşur.',
    },
    {
      q: 'Çalışan sayımız ay içinde değişirse?',
      a: 'Ay ortasında giren çalışan prorata (orantılı) hesaplanır · 15\'inde girdiyse ayın ikinci yarısı ödeme, SGK ilk yarı sıfır prim. Ay ortasında çıkan çalışan aynı mantık + kıdem/ihbar + kullanılmayan izin ücreti otomatik eklenir.',
    },
    {
      q: 'SAP Bordro\'dan farkı?',
      a: 'SAP Bordro Türkiye\'de çok yaygın ama: 657 memur kanunlarını tam desteklemez (belediyede ek yazılım gerekir), asgari ücret güncellemesi partnerdan ücretli alınır, SGK e-Bildirge için ayrı lisans, kurulum 3-6 ay. UpCore: 657 yerleşik, asgari ücret dahili, SGK e-Bildirge dahili, kurulum 1 hafta.',
    },
  ],
  relatedModules: [
    { slug: 'calisan-yonetimi', title: 'Çalışan Kayıtları', desc: 'Özlük dosyası + sözleşme + kadro · bordronun beslediği temel' },
    { slug: 'izin-mesai', title: 'İzin & Mesai', desc: 'Mesai saatleri + izin bakiyeleri bordroya otomatik akar' },
    { slug: 'kvkk-uyumu', title: 'KVKK Uyumu', desc: 'Bordro verisi en hassas PII · saklama + silme + audit' },
  ],
};

export default function BordroPage() {
  return <ModulePage content={content} />;
}
