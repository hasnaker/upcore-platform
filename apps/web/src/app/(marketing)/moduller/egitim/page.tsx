import type { Metadata } from 'next';
import { GraduationCap } from 'lucide-react';
import { ModulePage, type ModuleContent } from '@/components/marketing/ModulePage';

export const metadata: Metadata = {
  title: 'Eğitim · LMS + Sertifika + Yetkinlik Matrisi · UpCore',
  description:
    'Zorunlu eğitimleri unutulmaz yaparız. KVKK + iş güvenliği + sektör sertifikaları · Cornerstone/Udemy entegre · tamamlama takibi · yetkinlik matrisi. İK eğitim yöneticisi artık Excel tutmuyor.',
};

const content: ModuleContent = {
  category: 'egitim',
  title: 'Eğitim ve sertifikaları tek yerden yönetin',
  tagline:
    'KVKK eğitimi, iş güvenliği sertifikası, departman yetkinlik eğitimleri — hepsinin kime atandığı, kimin tamamladığı, kimin süresi dolduğu Excel\'de izleniyorsa kaotik. UpCore Eğitim modülü kurs kataloğunu, atama iş akışını, sertifika takibini, yetkinlik matrisini birleştirir.',
  icon: GraduationCap,
  accent: '#8B5CF6',
  heroStats: [
    { value: '%94', label: 'Zorunlu eğitim tamamlama oranı' },
    { value: '0 kaçırma', label: 'Sertifika süre uyarıları' },
    { value: 'SCORM + xAPI', label: 'Endüstri standart uyumlu' },
    { value: '40+ kurs', label: 'Hazır şablon kütüphane' },
  ],
  intro:
    "Her şirketin İK'sında 'eğitim izleme' denen bir Excel dosyası vardır: hangi çalışan KVKK eğitimini aldı, hangi departmanın iş güvenliği sertifikası süresi doluyor, yeni başlayan hangi zorunlu eğitimleri tamamlamalı. Manuel güncellenir, sürekli eksiktir, denetimde hatalar ortaya çıkar. Yeni bir iş güvenliği kazası olursa \"eğitim vermiş miydik?\" sorusunun cevabı ya kayıp ya yanlış. UpCore Eğitim modülü bu soruya her zaman kesin cevap sunar: her çalışanın eğitim geçmişi + sertifikaları + yaklaşan tarihler + yetkinlik matrisinde nereye düştüğü tek panelde.",
  features: [
    {
      title: 'Kurs kataloğu',
      desc: 'Dahili + harici kursların merkezi kataloğu. KVKK farkındalık (dahili), ISO 27001 temel (dahili), iş güvenliği sertifikası (OHSAS akredite partner), sektöre özel sertifikalar (CMA, CPA vb.). Her kursun süresi + kimlere zorunlu + sertifika geçerlilik süresi.',
    },
    {
      title: 'Otomatik zorunlu atama',
      desc: 'Yeni başlayan çalışan: ilk 30 günde KVKK farkındalık + iş güvenliği + şirket politikaları otomatik atanır · sürelere 3 hatırlatma · tamamlanmazsa yönetici bilgilendirilir.',
    },
    {
      title: 'Sertifika süre takibi',
      desc: 'İş güvenliği sertifikası 2 yılda bir yenilenir · sistem 90 gün önce hatırlatır · 30 gün kala acil uyarı · süre geçtiyse çalışan o göreve atanamaz (iş akışı durdurur). Yasal zorunluluk kaçırılmaz.',
    },
    {
      title: 'SCORM + xAPI desteği',
      desc: 'Endüstri standart e-learning formatları. Cornerstone Learning, Docebo, Udemy Business, LinkedIn Learning\'den alınan kurslar UpCore\'da oynatılır · tamamlama otomatik geri gelir. Ayrı LMS lisansına gerek yok.',
    },
    {
      title: 'Dış LMS entegrasyonu',
      desc: 'Mevcut LMS\'iniz varsa (Cornerstone, Docebo, SuccessFactors Learning) UpCore ile konuşur. Kurs katalogu UpCore\'da görünür · çalışan oradan tıklar · eski LMS\'te oynatılır · tamamlama UpCore\'a geri gelir.',
    },
    {
      title: 'Yetkinlik matrisi',
      desc: 'Her rolün gerekli yetkinlikleri tanımlı · çalışan her yetkinlikte 1-5 seviyede · eğitim aldıkça seviye yükselir. Ekip lideri "mühendislik ekibimde React seviyesi 3+ kaç kişi var?" gibi sorgular yapabilir.',
    },
    {
      title: 'Sertifika blockchain doğrulama (opsiyonel)',
      desc: 'Enterprise tier\'da: UpCore\'da kazanılan sertifikalar blockchain\'e yazılabilir · çalışan LinkedIn\'de paylaştığında doğrulanabilir · sahtekarlık önlenir.',
    },
    {
      title: 'Grup eğitimleri + zorunlu gün',
      desc: 'Yıllık zorunlu eğitim günü (KVKK farkındalık gibi) · tüm çalışanlar aynı gün · otomatik takvim + hatırlatma + katılım takibi · denetime açık rapor.',
    },
    {
      title: 'Çalışan kariyer portalı',
      desc: 'Çalışan kendi panelinden: "Senior olmak için şu 3 eğitimi tamamlamam gerek" · kendi hızında çalışır · ilerlemeyi görür · motivasyon artar.',
    },
    {
      title: 'Eğitim etkisi ölçümü',
      desc: 'Eğitim öncesi + 3 ay sonrası yetkinlik testi · bilgi artışı + iş performansına etki · etkili kurslar + etkisiz olanlar ayırt edilir · bütçe doğru yere gider.',
    },
  ],
  workflow: [
    { step: '01', title: 'Kurs kataloğu oluşturma', desc: 'İK + departman yöneticileri birlikte · hangi kurslar zorunlu + kime + ne kadar süreyle geçerli.' },
    { step: '02', title: 'Otomatik atama', desc: 'Yeni çalışan veya rol değişimi · sistem gerekli kursları otomatik atar · çalışana bildirim.' },
    { step: '03', title: 'Çalışan kursu tamamlar', desc: 'UpCore içinde oynatılır (SCORM) veya dış LMS\'te · ilerleme otomatik takip.' },
    { step: '04', title: 'Sertifika üretilir', desc: 'Kurs tamamlandı → sertifika PDF (imza + QR kod) · çalışan panele düşer · LinkedIn\'e paylaşabilir.' },
    { step: '05', title: 'Yetkinlik matrisi güncellenir', desc: 'İlgili yetkinlik seviyesi yükselir · ekip lideri görür · kariyer planında etki.' },
    { step: '06', title: 'Yenileme hatırlatma', desc: 'Sertifika süresine 90 gün kala hatırlatma · 30 gün kala acil · süresi geçti uyarısı.' },
  ],
  outcomes: [
    { metric: 'Zorunlu eğitim tamamlama', value: '%94', desc: 'Eskiden %63 · otomatik atama + hatırlatma etkisi' },
    { metric: 'Sertifika süre aşımı', value: '0', desc: '12 aylık dönemde · 200+ sertifika yönetimi' },
    { metric: 'Audit hazırlık süresi', value: '−%90', desc: '3 gün → 30 dakika · raporlar hazır' },
  ],
  comparison: [
    { feature: 'Otomatik zorunlu atama', upcore: 'Rol-bazlı yerleşik', others: 'Manuel e-posta' },
    { feature: 'Sertifika süre takibi', upcore: 'Otomatik 90/30 uyarı', others: 'Excel + unutma riski' },
    { feature: 'SCORM + xAPI desteği', upcore: 'Yerleşik', others: 'Ayrı LMS lisansı' },
    { feature: 'Yetkinlik matrisi', upcore: 'Yerleşik · ekip sorgusu', others: 'Ayrı modül' },
    { feature: 'Dış LMS entegrasyonu', upcore: 'Cornerstone + Docebo + Udemy', others: 'Custom' },
  ],
  instruments: [
    'SCORM 2004 + xAPI (Tin Can) · e-learning standartları',
    '6331 İş Sağlığı ve Güvenliği Kanunu · zorunlu eğitim',
    'KVKK Madde 12 · çalışan farkındalığı',
    'ISO 27001 Annex A.7.2.2 · bilgi güvenliği eğitimi',
  ],
  useCases: [
    { segment: 'İnşaat şirketi İSG müdürü', scenario: '200+ saha işçisine her 2 yılda iş güvenliği sertifikası yenileme zorunlu · UpCore otomatik hatırlatır, yenilemeyen saha girişini engeller · iş kazası denetiminde 100% uyum raporu.' },
    { segment: 'Tech scale-up CTO', scenario: '80 mühendislik ekibinde yetkinlik matrisinde React/Node/Go seviyeleri izleniyor · yeni proje için gerekli seviyede kaç kişi var anlık görülüyor · eğitim planı buna göre yapılır.' },
    { segment: 'Belediye İK', scenario: '12.000 memur için 657 kanunu gereği hizmet içi eğitim takibi · her yıl zorunlu saat + sertifika · UpCore otomatik · bakanlık bildirimi tek tıkla.' },
  ],
  faq: [
    { q: 'Mevcut LMS\'imiz Cornerstone, UpCore ile değiştirmemiz mi gerek?', a: 'Hayır. UpCore Cornerstone ile konuşur — kurs katalogu UpCore\'da görünür, kursa tıklayınca Cornerstone\'da oynatılır, tamamlama UpCore\'a geri gelir. İki sistem paralel çalışır. Alternatif olarak Micro/Starter tier\'larda UpCore\'un kendi dahili LMS\'i kullanılabilir · ek lisans yok.' },
    { q: 'Sertifika sahtekarlığı önlenebilir mi?', a: 'Enterprise tier\'da blockchain doğrulama var · UpCore\'da kazanılan her sertifika Ethereum/Polygon\'a yazılır · QR kodu taranınca doğruluğu kanıtlanır. Starter/Professional tier\'da PDF + dijital imza + UpCore\'un doğrulama portalı yeterli.' },
    { q: '6331 İş Sağlığı kanunu zorunlu eğitimleri?', a: 'Evet, yerleşik şablonları var: Temel İSG (16 saat) + Yüksekte çalışma (8 saat) + İlk yardım (16 saat) + Yangın (4 saat). Her birinin geçerlilik süresi + hangi rollere zorunlu + akredite eğitici partnerleri tanımlı. Denetim raporu hazır.' },
    { q: 'Eğitim için bütçem yok · ücretsiz kaynakları kullanabilir miyim?', a: 'Evet. UpCore\'da 40+ hazır dahili kurs ücretsiz. Ayrıca YouTube/Coursera bağlantıları ekleyebilirsiniz · "bu video izlensin" şeklinde atama · video tamamlandı işaretleme manuel ama sistem takip eder.' },
    { q: 'Çalışan eğitimi dinler ama öğrenmezse ne olur?', a: 'Test/quiz zorunlu · %70 geçme barajı · geçmezse tekrar. UpCore eğitim etkisi ölçümü: 3 ay sonra sürpriz mini test ile bilgi kalıcılığı ölçülür · düşükse içerik yenilenir.' },
    { q: 'Cornerstone Learning ile farkı?', a: 'Cornerstone Learning global LMS devi · zengin kurs kataloğu · ama: Türkçe içerik sınırlı, KVKK eğitimi yok (kendi içeriğinizi yüklemeniz lazım), yıllık lisans ₺180K+ (100 kişi için). UpCore: Türkçe KVKK + 6331 İSG dahili, 100 kişi için yıllık ₺34.8K, Cornerstone ile entegre çalışabilir.' },
  ],
  relatedModules: [
    { slug: 'onboarding', title: 'Yeni Başlayan Süreci', desc: 'İlk 30 gün zorunlu eğitimleri burada atanır' },
    { slug: 'gelistirme', title: 'Güçlü Yanlar', desc: 'VIA sonuçlarına göre kişisel eğitim önerileri' },
    { slug: 'performans', title: 'Performans', desc: 'Yetkinlik matrisi performans değerlendirmesine girer' },
  ],
};

export default function EgitimPage() {
  return <ModulePage content={content} />;
}
