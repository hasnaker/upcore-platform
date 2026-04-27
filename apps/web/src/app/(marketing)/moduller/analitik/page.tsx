import type { Metadata } from 'next';
import { LineChart } from 'lucide-react';
import { ModulePage, type ModuleContent } from '@/components/marketing/ModulePage';

export const metadata: Metadata = {
  title: 'Yönetici Raporları · CEO/CHRO/CFO Dashboard · UpCore',
  description:
    'Yönetim kurulu toplantısında Excel slayt hazırlayıp stres yaşamayın. UpCore Analitik: gerçek zamanlı CHRO/CFO/CEO dashboard, turnover tahmini, departman benchmark, tek tık export. Board raporu 10 dakikada.',
};

const content: ModuleContent = {
  category: 'analitik',
  title: 'Yönetim kurulu raporunuz 10 dakikada hazır',
  tagline:
    'Her ay yönetim kurulu toplantısından önce İK + Finans ekipleri 3-5 gün Excel slayt hazırlar · son dakika düzeltmelerle uykusuz kalırlar. UpCore Analitik bu döngüyü bitirir: CHRO/CFO/CEO için canlı dashboard · tek tık PDF export · board toplantısına direkt link paylaşılır.',
  icon: LineChart,
  accent: '#0EA5E9',
  heroStats: [
    { value: '10 dk', label: 'Board raporu hazırlık süresi' },
    { value: 'Canlı', label: 'Gerçek zamanlı veri (Excel değil)' },
    { value: 'Rol bazlı', label: 'CEO/CHRO/CFO/Manager farklı görüntü' },
    { value: '%89', label: 'Üst yönetim günlük açıyor' },
  ],
  intro:
    "Geleneksel İK raporlaması Excel acısıdır: aylık rapor için İK'nın 3-5 çalışanı sırasıyla her departmanın verisini toplar, birleştirir, grafikleştirir, CFO'ya gönderir, CFO düzeltme ister, revize eder, CEO'ya sunar, son dakika slayt değişir. Süreç bittiğinde veri zaten 2 hafta eski. UpCore Analitik modülü buna alternatif sunar: rol-bazlı dashboardlar canlı veri gösterir, CHRO her Pazartesi sabah kendi paneline bakar (headcount + tükenmişlik + turnover + bordro maliyeti), CFO ayrı bir panelde bütçe konsolidasyonunu izler, CEO high-level strateji göstergelerini görür. Hiç kimse başkasının hazırladığı rapora bağımlı değil.",
  features: [
    {
      title: 'CHRO Executive Dashboard',
      desc: 'İK Direktörü için özel panel: headcount (toplam + departman + geçen aya göre değişim), turnover oranı (aylık + yıllık + sektör benchmark), BAT-TR tükenmişlik trendi, UWES bağlılık skoru, 9-kutu dağılımı, açık pozisyonlar. Tek ekranda. Her Pazartesi sabah açılır.',
    },
    {
      title: 'CFO Finans Paneli',
      desc: 'Finans Direktörü için: toplam işgücü maliyeti (konsolide 18 şirket), departman başına bordro, SGK prim ödemeleri trendi, fazla mesai maliyeti, turnover nedeniyle işe alım maliyeti (₺85K x kişi), maliyet merkezi bazlı raporlar.',
    },
    {
      title: 'CEO Strateji Görünümü',
      desc: 'Yönetim Kurulu Başkanı için: şirket sağlık skoru (agrega), stratejik pozisyonlar için yedek derinliği (succession), üst yönetim tükenmişlik trendi, ücret eşitsizliği oranı (cinsiyet + kıdem), anahtar performans göstergeleri.',
    },
    {
      title: 'Manager Panel',
      desc: 'Her yönetici kendi ekibi için: ekibin bağlılık skoru, kimin izinde olduğu, açık hedefler (OKR) ilerlemesi, yaklaşan performans değerlendirmeleri, eğitim tamamlama oranları.',
    },
    {
      title: 'Turnover tahmin modeli',
      desc: 'Makine öğrenmesi ile önümüzdeki 6 ayda kimin istifa etme riski yüksek tahmin eder · 47 sinyalden hangisinin etkili olduğu açık (SHAP) · departman bazlı + birey bazlı (sadece yetkili İK).',
    },
    {
      title: 'Departman benchmark',
      desc: 'Bir departmanın skorları diğerleriyle + geçen yılki versiyonuyla + sektör ortalamasıyla karşılaştırılır. "Mühendislik ekibinin bağlılığı %18 yüksek, satış ekibinin %12 düşük" gibi somut göstergeler.',
    },
    {
      title: 'Özel rapor oluşturucu',
      desc: 'Drag-drop rapor yapıcı · istediğiniz alanlardan kendi dashboard\'unuzu oluşturun · kaydedin · ekibe paylaşın. "Mali işler departmanında kadın çalışan oranı + ortalama kıdem" gibi custom metrikler.',
    },
    {
      title: 'Tek tık Excel/PDF export',
      desc: 'Her rapor + dashboard PDF veya Excel olarak dışa aktarılır · logolu + tarihli · yönetim kurulu sunumuna direkt eklenebilir. Ya da yönetim kurulu üyesine direkt UpCore linki paylaşılır (read-only view).',
    },
    {
      title: 'Sayıştay + bağımsız denetim raporları',
      desc: 'Belediye/kamu için Sayıştay formatında hazır raporlar · bağımsız mali denetim için konsolide veriler · yıl sonu kapanış için hızlı export. Denetim 2 haftada bitiyor eskisinin 2 ayın yerine.',
    },
    {
      title: 'Akıllı uyarılar',
      desc: 'Dashboard\'a bakma zorunluluğu yok · sistem size uyarır: "Satış ekibi tükenmişlik skoru son 3 haftada artıyor" / "Bordro maliyeti bu ay %8 arttı, sebep: 12 kişi fazla mesai". E-posta veya Slack\'e düşer.',
    },
  ],
  workflow: [
    { step: '01', title: 'Veriler otomatik toplanır', desc: 'Tüm modüllerden (bordro, tükenmişlik, izin, performans) veri canlı analitik ambarına akar.' },
    { step: '02', title: 'Rol-bazlı dashboard oluşur', desc: 'CHRO/CFO/CEO/Manager her biri kendi panelini görür · yetkisiz veriye erişim yok.' },
    { step: '03', title: 'Akıllı uyarılar tetiklenir', desc: 'Anormal trendler (turnover artışı, tükenmişlik yükselişi) otomatik bildirim.' },
    { step: '04', title: 'Ay sonunda otomatik rapor', desc: 'PDF board raporu otomatik oluşur · CEO/CHRO\'ya e-posta ile gönderilir · düzeltmeyle 10 dakikada hazır.' },
    { step: '05', title: 'Yıl sonu konsolide rapor', desc: 'Tüm yılın veri özeti · sektör benchmark · gelecek yıl planı için temel.' },
    { step: '06', title: 'Bağımsız denetim raporu', desc: 'Sayıştay veya external denetçi gelince · hazır rapor setleri · tek tık export.' },
  ],
  outcomes: [
    { metric: 'Board rapor süresi', value: '10 dakika', desc: 'Eskiden 3-5 gün · holding vakası' },
    { metric: 'CHRO dashboard kullanım', value: '%89', desc: 'Üst yönetim günlük açıyor · canlı veri · Excel yerine' },
    { metric: 'Bağımsız denetim süresi', value: '2 hafta', desc: 'Eskiden 2 ay · raporlar hazır · veriler tutarlı' },
  ],
  comparison: [
    { feature: 'CHRO Executive dashboard', upcore: 'Yerleşik · rol-bazlı', others: 'Oracle: ayrı Analytics Cloud lisans' },
    { feature: 'Turnover ML tahmini', upcore: '47 sinyal · SHAP açıklama', others: 'Yok veya kara kutu' },
    { feature: 'Departman benchmark', upcore: 'Sektör + kendi geçmişi', others: 'Sadece kendi geçmişi' },
    { feature: 'Özel rapor yapıcı', upcore: 'Drag-drop · herkes kullanır', others: 'BI uzmanı gerekir (Tableau)' },
    { feature: 'Sayıştay raporları (TR)', upcore: 'Yerleşik şablonlar', others: 'Custom geliştirme' },
  ],
  instruments: [
    'Bernard & Meier · HR Analytics Framework',
    'SHAP (SHapley Additive exPlanations) · ML açıklanabilirlik',
    'People Analytics · MIT Sloan · 2015+',
    'Sayıştay Denetim Standartları (TR)',
  ],
  useCases: [
    { segment: 'CHRO (24K holding)', scenario: 'Serdar Bey her Pazartesi sabah CHRO dashboard\'u açar · 18 şirketin headcount + turnover + tükenmişlik + bordro maliyeti tek ekranda · CEO\'ya aynı gün toplantıya hazır veriyle girer. Eskiden IK ekibinden 5 kişi 3 gün hazırlıyordu.' },
    { segment: 'CFO (belediye)', scenario: 'Funda Hanım belediye CFO · bordro maliyetinin aylık trend analizi + 657 memur ücret planlaması + SGK prim projeksiyonu · Sayıştay denetimi için her zaman hazır rapor · bütçe planlaması gerçek zamanlı.' },
    { segment: 'Manager (satış)', scenario: 'Ahmet Bey 12 kişilik satış ekibinin yöneticisi · kendi panelinden ekibin bağlılık skoru düştüğünü görür · UpCore "son 2 ayda iş yükü arttı" insightı verir · toplantı organize eder · 4 hafta sonra skor düzelir.' },
  ],
  faq: [
    { q: 'Bu veriler anlık mı yoksa gecikmeli mi?', a: 'Çoğu dashboard real-time (veya <5 dakika gecikme). Bordro gibi aylık veriler ay sonunda güncellenir. Turnover tahmin modeli haftalık yeniden eğitilir. Benchmark verileri çeyreklik güncellenir.' },
    { q: 'Çalışanların kişisel verisini CHRO görüyor mu?', a: 'Hayır, ilkemiz agrega. CHRO dashboard\'u "satış ekibinde 10 kişi kırmızı band" der, "Ayşe kırmızı band" demez (o bilgi sadece yetkilendirilmiş İK görür, sözleşme şartı). Herkesin yetki seviyesine göre veri kırılır · KVKK uyumlu.' },
    { q: 'Tableau veya Power BI ile entegre mi?', a: 'Evet. Enterprise tier\'da UpCore read-replica database erişimi sağlanır · Tableau/Power BI/Metabase/Looker kendi sorgularınızı çalıştırır. Veriler değiştirilemez (read-only). Özel BI\'nız varsa UpCore Analitik\'in yerine geçebilir.' },
    { q: 'Turnover tahmin modeli güvenilir mi? Ne kadar doğru?', a: '%89 precision · yani 100 yüksek-riskli dediği çalışandan 89\'u gerçekten istifa ediyor · %11 yanlış alarm. Model haftalık yeniden eğitiliyor · daha fazla veri = daha yüksek isabet. Sebepler her tahminde SHAP ile açık · kara kutu değil.' },
    { q: 'Sektör benchmark verisi nereden geliyor?', a: 'UpCore\'un tüm müşterilerinin anonim + agrega verilerinden. Örnek: "Tech sektörü ortalama turnover %18 · sizinki %24 · sektörün üzerindesiniz" gibi · kimliksiz veri · KVKK Kurulu ile birlikte model onayladı.' },
    { q: 'Oracle HCM Analytics ile farkı?', a: 'Oracle HCM Analytics zengin · ama: ayrı lisans (yıllık ₺250K+/100 kişi), BI uzmanı gerektirir, Türkçe benchmark yok, Sayıştay raporları custom. UpCore Analitik her planda dahili · drag-drop · Türkiye benchmark + Sayıştay şablonları. Holding için Oracle Analytics + UpCore Analitik paralel kullanılabilir.' },
  ],
  relatedModules: [
    { slug: 'surdurme', title: 'Tükenmişlik Ölçümü', desc: 'BAT-TR skorları CHRO dashboard\'una agregata akar' },
    { slug: 'performans', title: 'Performans', desc: '9-kutu dağılımı executive görünümde · ücret eşitsizliği analizleri' },
    { slug: 'kvkk-uyumu', title: 'KVKK Uyumu', desc: 'Raporlama KVKK anonim standartlarına göre yapılır' },
  ],
};

export default function AnalitikPage() {
  return <ModulePage content={content} />;
}
