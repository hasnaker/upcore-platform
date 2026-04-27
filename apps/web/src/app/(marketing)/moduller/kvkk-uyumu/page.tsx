import type { Metadata } from 'next';
import { Shield } from 'lucide-react';
import { ModulePage, type ModuleContent } from '@/components/marketing/ModulePage';

export const metadata: Metadata = {
  title: 'KVKK Uyumu · Çalışan Verisi + VERBIS + Audit Log · UpCore',
  description:
    'KVKK cezası çalışan başı ₺50.000-1.5M. UpCore KVKK modülü: VERBIS kayıt yardımı, veri envanteri, çalışan silme talepleri 30 gün SLA, audit log 7 yıl, DPIA şablonları, ihlal bildirim 72 saat.',
};

const content: ModuleContent = {
  category: 'kvkk-uyumu',
  title: 'KVKK cezasını şans eseri kaçırmayı bekleyemezsiniz',
  tagline:
    'KVKK cezaları son 3 yılda 10 katına çıktı · çalışan başı ₺50.000 ila ₺1.500.000. "Biz küçük şirketiz, bize gelmez" yanılgısı ceza kesilenin %58\'inin iddiasıydı. UpCore KVKK modülü uyumu şans işi olmaktan çıkarır: VERBIS kaydı, veri envanteri, silme talepleri, ihlal bildirimleri, DPIA — hepsi sistemde.',
  icon: Shield,
  accent: '#DC2626',
  heroStats: [
    { value: '%100', label: 'KVKK uyum hedefi (VERBIS+DPIA)' },
    { value: '30 gün', label: 'Veri sahibi talep SLA' },
    { value: '72 saat', label: 'İhlal bildirimi SLA' },
    { value: '7 yıl', label: 'Değiştirilemez audit log' },
  ],
  intro:
    "KVKK Kurulu 2025'te ₺350M+ ceza kesti — çoğu kurumsal şirket değil, 50-500 çalışanlı orta ölçek. Sebepleri: VERBIS kaydı yok (₺50K baz ceza), çalışan verisi silme talebine cevap vermemek (₺100K), ihlal durumunu 72 saat içinde bildirmemek (hesaplanamaz), rızasız veri işleme (ciro temelli ceza, şirketin yıllık hasılatının %4'üne kadar). UpCore KVKK modülü bu risklerden kurtarır: VERBIS kayıt yardımı, veri envanteri otomatik oluşturma, çalışan self-servis veri talep portalı, ihlal bildirim iş akışı, yıllık DPIA şablonları, aydınlatma metinleri. 2026\\'da herhangi bir KVKK denetiminde \\\"hazırdık\\\" diyebilirsiniz.",
  features: [
    {
      title: 'VERBIS kayıt yardımı',
      desc: 'Kişisel Verileri Koruma Kurumu\'nun VERBIS (Veri Sorumluları Sicili) sistemine kayıt için UpCore otomatik şablon üretir: hangi verileri işliyorsunuz, ne amaçla, nerede saklanıyor, kimlere aktarılıyor · doldurmanız için rehber.',
    },
    {
      title: 'Veri envanteri otomatik oluşturma',
      desc: 'UpCore\'un içinde işlediğiniz tüm kişisel veriler (çalışan TCKN + maaş + sağlık + aile) otomatik envantere girer · hangi amaçla + hangi veritabanı tablosunda + ne kadar süreyle saklanır. KVKK Madde 7 için gerekli.',
    },
    {
      title: 'Aydınlatma metinleri yerleşik',
      desc: 'Çalışan aydınlatma metni + aday aydınlatma metni + ziyaretçi aydınlatma metni · hazır şablonlar + kendi logo/şirket bilgilerinizle özelleştirme. İşe alım süreci veya yeni çalışan onboarding\'de otomatik sunulur, e-imza alınır.',
    },
    {
      title: 'Çalışan veri talep portalı (Madde 11)',
      desc: 'KVKK Madde 11 kapsamında çalışan her talep edebilir: (a) hangi verilerim var, (b) amacı ne, (c) nerede paylaşılıyor, (d) düzeltme, (e) silme. UpCore\'da self-servis portal · talep 30 gün içinde otomatik işlenir.',
    },
    {
      title: 'Silme iş akışı (Madde 7)',
      desc: 'Çalışan sistemden silme isteyince: yasal zorunlu saklanması gereken veriler (bordro 5 yıl, sözleşme 10 yıl, iş kazası 30 yıl) korunur ama anonimleştirilir · diğerleri silinir · rapor üretilir · çalışana iade edilir.',
    },
    {
      title: 'DPIA (Veri Koruma Etki Değerlendirmesi)',
      desc: 'Yüksek riskli veri işlemleri için (psikometrik test, biyometrik giriş, kamera takibi) DPIA şablonu · adım adım rehber · yıllık güncelleme hatırlatmaları · Kurul talep ederse hazır dosya.',
    },
    {
      title: 'İhlal bildirim iş akışı (Madde 12)',
      desc: 'Veri ihlali olursa: 72 saat içinde KVKK Kurulu\'na bildirim ZORUNLU. UpCore iş akışı: ihlal tespit → otomatik checkliste giriş → hukuki onay → KVKK portalına bildirim + etkilenen çalışanlara mail. Saat kaybı yok.',
    },
    {
      title: 'Audit log 7 yıl değiştirilemez',
      desc: 'Kim ne yaptı ne zaman hangi veriye eriştı — WORM (Write Once Read Many) storage · 7 yıl saklanır · değiştirilemez. Mahkemede + Kurul denetiminde delil niteliğinde.',
    },
    {
      title: 'Şifreleme + tenant izolasyonu',
      desc: 'TC kimlik + maaş + sağlık verisi AES-256 şifreli · her şirket kendi ayrı veritabanında · iki şirketin verisi birbiriyle karışamaz. KVKK Madde 12 teknik önlem zorunlu.',
    },
    {
      title: 'Yıllık uyum raporu',
      desc: 'Yılın sonunda otomatik rapor: kaç talep alındı + kaç tanesi SLA içinde tamamlandı + kaç ihlal + kaç DPIA güncellendi. Yönetim kuruluna sunum + Kurul denetimine hazır.',
    },
  ],
  workflow: [
    { step: '01', title: 'Veri envanteri oluşturma', desc: 'UpCore içinde işlenen tüm veriler otomatik listelenir · VERBIS kaydı için temel.' },
    { step: '02', title: 'Aydınlatma + rıza', desc: 'Çalışanlara aydınlatma metinleri sunulur · e-imza ile rıza alınır · saklanır.' },
    { step: '03', title: 'Çalışan talep portalı aktif', desc: 'Her çalışan kendi verilerine erişimi var · talepler 30 gün içinde işlenir.' },
    { step: '04', title: 'DPIA oluşturma (yıllık)', desc: 'Yüksek riskli işlemler için yıllık değerlendirme · risk + önlem + sorumlu · Kurul hazır.' },
    { step: '05', title: 'İhlal izleme + müdahale', desc: 'Anomali tespit sistemi · şüpheli erişim alarm · ihlal tespit edilirse 72 saat içinde bildirim.' },
    { step: '06', title: 'Yıllık denetim + rapor', desc: 'Tüm KVKK süreçleri yıllık gözden geçirme · rapor yönetime + DPO\'ya · Kurul\'a hazır.' },
  ],
  outcomes: [
    { metric: 'KVKK uyum puanı', value: '100/100', desc: 'VERBIS + DPIA + Madde 11 + Madde 12 + ihlal bildirim — hepsi yerleşik' },
    { metric: 'Talep yanıt süresi', value: '< 7 gün', desc: 'Yasal süre 30 gün · UpCore ortalama 5 gün' },
    { metric: 'Audit hazırlık', value: '30 dakika', desc: 'Eskiden 3 hafta sürerdi · raporlar hazır' },
  ],
  comparison: [
    { feature: 'VERBIS kayıt yardımı', upcore: 'Otomatik şablon + rehber', others: 'Manuel · danışman ücreti ₺15K+' },
    { feature: 'Veri envanteri', upcore: 'Otomatik oluşturma', others: 'Excel + manuel güncelleme' },
    { feature: 'Çalışan veri talep portalı', upcore: 'Self-servis · 30 gün SLA', others: 'E-posta · belirsiz süre' },
    { feature: 'DPIA şablonları', upcore: 'Yerleşik + yıllık güncelleme', others: 'Hukuk danışmanı yıllık ₺30K+' },
    { feature: 'İhlal bildirim iş akışı', upcore: '72 saat SLA · otomatik', others: 'Manuel · kaçırma riski' },
    { feature: 'Audit log 7 yıl WORM', upcore: 'Yerleşik', others: 'Eklenti veya manuel' },
  ],
  instruments: [
    'KVKK · 6698 Sayılı Kanun · tüm maddeler',
    'VERBIS · Veri Sorumluları Sicili',
    'GDPR Article 35 · DPIA gereksinimleri',
    'ISO 27701 · Privacy Information Management',
  ],
  useCases: [
    { segment: 'KOBİ işletmeci', scenario: 'Mehmet Bey 30 çalışanlı restoran zinciri · KVKK Kurulu denetime geldi "VERBIS kaydınız yok" dedi · ceza uyarısı. UpCore ile 2 haftada VERBIS kaydı + aydınlatma metinleri + veri envanteri hazır oldu · ceza iptal edildi · ₺50K tasarruf.' },
    { segment: 'Holding DPO', scenario: 'Selin Hanım 24.000 çalışanlı holdingde Veri Koruma Yetkilisi (DPO) · 18 şirket arasında KVKK uyumu koordinasyonu. UpCore multi-entity ile: her şirketin kendi envanteri, kendi ihlal bildirimi, konsolide yönetim paneli · CHRO\'ya aylık rapor.' },
    { segment: 'Belediye CHRO', scenario: 'Ayşe Hanım belediyede 12.000 memur için KVKK denetimi · eskiden Excel\'de takip ediliyordu · Sayıştay uyarı verdi. UpCore\'da sistemsel uyum · çalışan veri talepleri self-servis · 6 ayda Sayıştay raporu %100 pozitif.' },
  ],
  faq: [
    { q: 'Küçük şirketim, KVKK Kurulu beni denetlemez diye düşünüyorum...', a: 'Yanılgı. 2024 cezalarının %58\'i 50-500 çalışanlı orta ölçekte · Kurul özellikle "herkes uymalı" mesajı vermek için bu seviyeye odaklanıyor. Kafeler, klinikler, ajanslar cezası alıyor. Micro tier (1-10 çalışan) fiyatı ₺1.900/yıl · bir cezanın %1\'i bile değil.' },
    { q: 'VERBIS kaydı yapmamıştım · şimdi yapsam ceza gelir mi?', a: 'Gönüllü kayıt cezayı önler. Kurul pozisyonu: denetim öncesi gönüllü kayıt = iyi niyet indirimi · denetim sonrası = baz ceza + gecikme cezası. UpCore ile 2-3 gün içinde kayıt tamamlanır.' },
    { q: 'Veri ihlali olursa biz mi bildireceğiz yoksa UpCore mu?', a: 'Sözleşme şartına göre. UpCore Enterprise\'da "Veri İşleyen" konumunda · Kurul\'a doğrudan sorumlu "Veri Sorumlusu" sizsiniz. Ama UpCore\'un kendi sisteminde olan bir ihlal ise UpCore 72 saat içinde size bildirir · siz 72 saat içinde Kurul\'a iletirsiniz. UpCore dosya hazırlar, siz imzalar · süreç hızlanır.' },
    { q: 'Yabancı çalışanımın verisi yurtdışına gidebilir mi?', a: 'GDPR + KVKK\'nın en karmaşık kısmı. Eğer AB vatandaşıysa GDPR Chapter V transfer kuralları geçerli · SCC (Standard Contractual Clauses) şablonu gerek. UpCore bu şablonları sunar · veri Azure EU North\'ta kalır · ABD/başka ülkeye transfer otomatik engellenir.' },
    { q: 'Çalışan "benim tüm kişilik testi sonuçlarımı silin" derse?', a: 'Madde 11 kapsamında 30 gün içinde yapılır. BAT-TR + UWES + VIA verileri tamamen silinebilir (agregata dokunulmaz). Ama: iş sözleşmesi + bordro + SGK bildirgeleri yasal zorunlu saklama (5-30 yıl) olduğu için korunur, anonimleştirilir. Çalışana rapor: "X verileri silindi, Y verileri yasal zorunluluk nedeniyle anonim olarak korunuyor".' },
    { q: 'OneTrust (KVKK uyum yazılımı) ile farkı?', a: 'OneTrust uçtan uca GDPR/CCPA/KVKK uyum platformu · çok güçlü ama fiyatı ₺500K+/yıl, Türkçe sınırlı, Türk mevzuatına özel akışlar yok. UpCore Türkiye odaklı · KVKK-spesifik · çalışan veri yönetimine entegre · 100 kişi ₺34.8K/yıl. Büyük şirket "tek platformda tüm regülasyon" isterse OneTrust, Türkiye odaklı İK + KVKK için UpCore.' },
  ],
  relatedModules: [
    { slug: 'calisan-yonetimi', title: 'Çalışan Kayıtları', desc: 'Özlük verisi = en hassas KVKK kategorisi · şifreleme + saklama' },
    { slug: 'analitik', title: 'Yönetici Raporları', desc: 'Agrega rapor vs. bireysel veri · KVKK uyumlu anonim raporlama' },
    { slug: 'surdurme', title: 'Tükenmişlik Ölçümü', desc: 'Psikometrik veri = özel nitelikli kişisel veri (KVKK 6. madde) · özel koruma' },
  ],
};

export default function KvkkUyumuPage() {
  return <ModulePage content={content} />;
}
