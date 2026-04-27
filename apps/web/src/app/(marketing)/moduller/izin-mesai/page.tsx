import type { Metadata } from 'next';
import { Clock } from 'lucide-react';
import { ModulePage, type ModuleContent } from '@/components/marketing/ModulePage';

export const metadata: Metadata = {
  title: 'İzin & Mesai · Vardiya + Fazla Mesai Otomasyonu · UpCore',
  description:
    'İzin bakiyesi takibi + vardiya planlaması + fazla mesai hesabı + mazeret izinleri. Çalışan cepten izin ister, yönetici 30 saniyede onaylar, sistem SGK + bordroya otomatik aktarır.',
};

const content: ModuleContent = {
  category: 'izin-mesai',
  title: 'İzin + Mesai cebinizde, kafanız rahat',
  tagline:
    'Çalışan "kaç günüm var?" diye sorduğunda İK ekibinin saatlerce Excel karıştırmasına son. Çalışan kendi telefonundan izin bakiyesini görür, izin talebi gönderir, yönetici 30 saniyede onaylar · UpCore sistemi SGK bildirgesine ve bordroya otomatik yansıtır.',
  icon: Clock,
  accent: '#F59E0B',
  heroStats: [
    { value: '30 sn', label: 'Çalışan izin talebi süresi' },
    { value: '30 sn', label: 'Yönetici onay süresi' },
    { value: '4 saat', label: 'İK aylık izin raporu süresi' },
    { value: '%0', label: 'Hesaplama hatası · otomatik' },
  ],
  intro:
    "Türk İş Kanunu'nda izin hesabı karmaşıktır. 5 yıl altındaysanız 14 gün yıllık izin hakkınız var, 5-15 yıl arası 20 gün, 15 yıl üstü 26 gün. Hastalık izni, mazeret izni, evlilik izni (3 gün), doğum izni (analık 16 hafta), ölüm izni (3 gün), askerlik izni — hepsinin kendi kuralı var. Üstüne vardiyalı çalışma, fazla mesai, hafta tatili, resmi tatil zammı — her biri ayrı bir hesap. İK departmanları bu yüzden her ayın sonunda haftalarca Excel'de kaybolur, sonunda yine hatalar olur. UpCore İzin & Mesai modülü bu kuralların tümünü içinde barındırır. Çalışan kendi cebinden izin ister, yönetici notification alır, onaylar — arka tarafta kanuni hesaplar, bordroya yansıtma, SGK raporu hepsi otomatik.",
  features: [
    {
      title: 'Mobil izin talebi (30 saniye)',
      desc: 'Çalışan telefondan UpCore uygulamasını açar · "Yıllık izin" butonu · tarih seçer · sebep yazar · gönder. Yönetici Slack/Teams/mobilden anında bildirim alır · tek tıkla onaylar.',
    },
    {
      title: 'İzin bakiyesi anlık',
      desc: 'Çalışan kendi panelinden görür: "Yıllık iznim 14 gün, kullandığım 3 gün, kalan 11 gün. Ayrıca 2 mazeret + 5 hastalık hakkım var". Eskiden İK arşiv aramaya giriyordu · şimdi şeffaf.',
    },
    {
      title: 'Vardiya planlaması (drag-drop)',
      desc: 'Hafta/ay bazında vardiya takvimi · sürükle-bırak arayüz · personel müsaitliği otomatik kontrol · çift vardiya, fazla mesai limiti (İş Kanunu 270 saat/yıl) otomatik izlenir.',
    },
    {
      title: 'Fazla mesai otomatik hesap',
      desc: 'Günlük 7.5 saat üstü +%50 zamlı · Pazar günü +%100 zamlı · resmi tatilde +%100 zamlı · gece mesaisi +%25 zamlı — hepsi kanundaki zam oranlarına göre otomatik. Bordroya otomatik akar.',
    },
    {
      title: 'İzin türleri (13 farklı)',
      desc: 'Yıllık · hastalık · mazeret · evlilik · doğum · ölüm · askerlik · ücretsiz izin · babalık (5 gün) · emzirme · eğitim · şehit-gazi yakını · özel. Her biri ayrı kurallarla · kullanım izlenir.',
    },
    {
      title: 'Rapor iş akışı',
      desc: 'Çalışan hastalandı → doktor raporu fotoğrafını uploadlar → sistem SGK bildirgesine hazırlanan raporu ekler → bordroda rapor günleri otomatik düşer. Eski yöntem: kağıt rapor, İK dosyalama, bordroda unutma.',
    },
    {
      title: 'Vardiya çakışma tespiti',
      desc: 'Aynı kişiye çift vardiya atanırsa uyarı · 24 saat dinlenme hakkı kontrolü · haftalık en az 1 tam gün tatil kuralı (İş Kanunu 46. madde) otomatik denetlenir.',
    },
    {
      title: 'Resmi tatil takvimi',
      desc: 'Türkiye resmi tatilleri (23 Nisan, 19 Mayıs, 30 Ağustos, Cumhuriyet, bayramlar) + arifeler + dini tatiller (Ramazan + Kurban) her yıl otomatik güncel · hem izin hesabında hem mesai zamlarında dikkate alınır.',
    },
    {
      title: 'Manager dashboard',
      desc: 'Yönetici ekibi için tek ekran: kim izinde, kim rapor aldı, kim fazla mesai yapıyor, kim yetersiz izin kullanıyor (burnout erken göstergesi). Departman kapasite planlaması için gerçek zamanlı veri.',
    },
    {
      title: 'Yıllık izin devir',
      desc: 'Yıl sonunda kullanılmayan izinler bir sonraki yıla devrediyor (İş Kanunu 53. madde). Ama 1 yılın sonunda hâlâ kullanılmadıysa uyarı · 2 yıl devralınabilir · 2 yıl üstü zorunlu kullanım.',
    },
  ],
  workflow: [
    {
      step: '01',
      title: 'Çalışan izin talep eder',
      desc: 'Telefondan 30 saniyede · tarih + izin türü + sebep. Sistem bakiyeyi kontrol eder, yetersizse uyarır.',
    },
    {
      step: '02',
      title: 'Yöneticiye anlık bildirim',
      desc: 'Slack/Teams/mobil push · onay/ret seçeneği · ekibin diğer izinleriyle çakışma varsa bilgi.',
    },
    {
      step: '03',
      title: 'Onay + takvim güncellenir',
      desc: 'Onaylandığında izin takvimine düşer · çalışanın bakiyesi düşer · ekibin diğer üyeleri görür.',
    },
    {
      step: '04',
      title: 'Vardiya planı otomatik',
      desc: 'İzin sırasında vardiya boş kalıyorsa sistem yedek personel önerir · çift vardiya limitleri kontrol edilir.',
    },
    {
      step: '05',
      title: 'Bordroya yansıtma',
      desc: 'Ay sonunda: kullanılan izinler ücretli/ücretsiz ayrımı · SGK bildirgesine rapor günleri · fazla mesai zamlı ödeme hepsi otomatik.',
    },
    {
      step: '06',
      title: 'Yıl sonu izin devir',
      desc: 'Yıl sonunda kullanılmayan izinler yeni yıla devredilir · eski hak kaybı uyarısı · İK için toplu rapor.',
    },
  ],
  outcomes: [
    { metric: 'İK izin yönetimi süresi', value: '−%80', desc: 'Aylık 40 saat → 8 saat · 200 kişilik şirket' },
    { metric: 'İzin hesaplama hatası', value: '0', desc: 'Excel döneminde ayda 5-10 hata oluyordu · otomatik sonrası sıfır' },
    { metric: 'Çalışan memnuniyeti', value: '+%48', desc: 'Mobil izin talebi sonrası · 1 yıllık anket' },
  ],
  comparison: [
    {
      feature: 'Mobil izin talebi',
      upcore: 'Yerleşik · 30 sn süre',
      others: 'E-posta / Excel · dakikalar alır',
    },
    {
      feature: 'Fazla mesai otomatik zam hesabı',
      upcore: 'İş Kanunu zam oranlarına göre',
      others: 'Manuel Excel',
    },
    {
      feature: 'Vardiya çakışma tespiti',
      upcore: 'Otomatik uyarı',
      others: 'Manuel kontrol · hatalar olur',
    },
    {
      feature: 'Türk resmi tatil takvimi',
      upcore: 'Yerleşik · her yıl otomatik',
      others: 'Manuel ekleme',
    },
    {
      feature: 'Rapor upload + SGK entegrasyon',
      upcore: 'Fotoğraf upload + otomatik SGK',
      others: 'Kağıt arşiv · manuel bordro düşümü',
    },
  ],
  instruments: [
    'İş Kanunu · 4857 sayılı · yıllık izin (53. madde)',
    'Hafta tatili + fazla mesai (41-46. madde)',
    '657 sayılı Devlet Memurları Kanunu · yıllık/mazeret/rapor izinleri',
    'SGK 5510 kanunu · prim gün sayısı hesaplaması',
  ],
  useCases: [
    {
      segment: 'Çalışan',
      scenario:
        'Zeynep Hanım perşembe günü yılbaşı tatiline 4 gün izin almak istiyor · UpCore uygulamasından 30 saniyede talep oluşturur · bakiyeyi görür (21 gün kalan) · göndertir · yöneticisi Slack\'ten 2 dakikada onaylar. Eskiden İK\'ya mail atıp 2 gün bekliyordu.',
    },
    {
      segment: 'Yönetici',
      scenario:
        'Ahmet Bey 15 kişilik ekibin yöneticisi · her hafta Pazartesi sabah UpCore\'a girip kimin izinde olduğunu, kimin rapor aldığını, o hafta ekibin kapasitesi ne kadar düşük olacağını görüyor. İş planını buna göre yapıyor · eskiden sürpriz oluyordu.',
    },
    {
      segment: 'Belediye/Hastane İK',
      scenario:
        '24 saat mesai gerektiren itfaiye/güvenlik/temizlik birimlerinde vardiya planlaması UpCore\'da. Çift vardiya koruması + haftalık dinlenme hakkı otomatik denetleniyor · çalışan hakkı çiğnenmiyor · müfettiş raporu 10 dakikada hazır.',
    },
  ],
  faq: [
    {
      q: 'Çalışanlarımın büyük kısmı telefon kullanmıyor (mavi yaka) — onlar nasıl izin talep edecek?',
      a: 'Ofis panelinden İK kullanıcısı çalışan adına talep girebilir · ya da kağıt form geleneksel · ya da SMS/QR kodla giriş (şehir dışı işçi için). UpCore 3 yol da destekler · çalışanın dijital ihtiyacı yok.',
    },
    {
      q: 'Yıllık izin bakiyesi eski sistemimizden nasıl aktarılır?',
      a: 'Her çalışan için "devreden izin + kullanılan + kalan" 3 kolonluk CSV yüklersiniz · 5 dakikada aktarılır. Sistem eskiden 2 yıl önce devralınanları "zorunlu kullanım" bayrağı ile işaretler.',
    },
    {
      q: 'Bir çalışan izne çıkıp dönmezse ne olur?',
      a: 'Devamsızlık iş akışı devreye girer. İK bildirim alır · çalışana e-posta/SMS · 3 gün habersiz gelmeme "ihtarname" durumu · İş Kanunu 25. madde gereği haklı fesih sebebi. Tüm süreç sistemde otomatik ilerler.',
    },
    {
      q: 'Ramazan\'da mesai saatleri değişiyor (1 saat erken çıkış) · destekliyor mu?',
      a: 'Evet. "Özel mesai dönemi" tanımlarsınız (Ramazan, bayram öncesi, kış saati vb.) · o dönem için mesai kuralları otomatik değişir. Belediye ve bankalarda yaygın uygulama, desteklenir.',
    },
    {
      q: 'Fazla mesai yapan çalışan zaman değil para istiyor · bordro ile nasıl entegre?',
      a: 'İki seçenek: (1) Zaman olarak kredi · çalışan sonra izne dönüştürür · "serbest zaman" hakkı. (2) Para olarak · bordroya zamlı tutar yansır. Çalışan tercih yapar · yönetici onaylar · sistem kanundaki zam oranlarına göre hesaplar.',
    },
    {
      q: 'Oracle Time & Labor ile farkı?',
      a: 'Oracle Time & Labor global bir sistem · Türkiye\'deki resmi tatil, Ramazan mesai, kanuni fazla mesai oranları, SGK bildirgesi bağlantısı eksik. Kurulum 3-6 ay · Türkçe destek sınırlı · yıllık lisans ₺500K+. UpCore yerli · Türkçe kanunlar yerleşik · kurulum 1 hafta · ₺50K civarı.',
    },
  ],
  relatedModules: [
    { slug: 'bordro', title: 'Bordro', desc: 'İzinler + fazla mesai bordroya otomatik akar' },
    { slug: 'calisan-yonetimi', title: 'Çalışan Kayıtları', desc: 'İzin hakları özlük dosyasından türetilir' },
    { slug: 'analitik', title: 'Yönetici Raporları', desc: 'Izin/mesai trendleri · burnout erken göstergesi' },
  ],
};

export default function IzinMesaiPage() {
  return <ModulePage content={content} />;
}
