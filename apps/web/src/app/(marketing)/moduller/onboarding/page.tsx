import type { Metadata } from 'next';
import { PlayCircle } from 'lucide-react';
import { ModulePage, type ModuleContent } from '@/components/marketing/ModulePage';

export const metadata: Metadata = {
  title: 'Onboarding · İlk 90 Günü Ustalıkla Yönetin · UpCore',
  description:
    'Yeni çalışan ilk 90 günde kalır mı kalmaz mı — bu dönemin kalitesine bağlı. UpCore onboarding: 30/60/90 değerlendirme, mentor eşleştirme, IT/HR checklistleri, dijital sözleşme — yeni çalışan kaybetmezsiniz.',
};

const content: ModuleContent = {
  category: 'onboarding',
  title: 'İlk 90 günde çalışan kaybetmeyin',
  tagline:
    'Yeni çalışanın ilk 90 günü kariyer kaderini belirler. Kötü bir onboarding sonrası %28\'i ilk yıl ayrılır — bu ₺85.000\'lik işe alım maliyetiniz çöpe. UpCore Onboarding ilk 30/60/90 günü yapılandırır: IT teslimi, mentor eşleştirme, eğitim atamaları, değerlendirme check-in\'leri — hiçbir şey unutulmaz.',
  icon: PlayCircle,
  accent: '#0EA5E9',
  heroStats: [
    { value: '%94', label: 'İlk 90 gün kalma oranı (eskiden %72)' },
    { value: '30/60/90', label: 'Yapılandırılmış değerlendirme' },
    { value: '40+ task', label: 'Otomatik hazır checklist' },
    { value: '1. gün', label: 'IT + mentor + plan hazır' },
  ],
  intro:
    "Harvard Business Review 2024: yeni işe alınan çalışanların %33'ü ilk yıl içinde ayrılıyor. Ana sebeplerin başında kötü onboarding geliyor — ilk gün bilgisayarı olmayan, 2. hafta bile kimseyi tanımayan, hangi hedefleri taşıdığını bilmeyen çalışanın bağlılık kurması imkansız. SHRM araştırması gösteriyor: yapılandırılmış onboarding yapan şirketlerde ilk yıl kalma oranı %69 daha yüksek. UpCore Onboarding modülü bu yapılandırmayı sunar: teklif kabul edildiği an iş akışı başlar, IT ekipman talebi oluşur, mentor atanır, 30/60/90 planı çalışana iletilir, ilk gün kutlaması organize edilir. Yeni çalışan ilk günden \"burada beklenen neydi bilmiyorum\" duygusundan kurtulur.",
  features: [
    {
      title: 'Teklif kabul → otomatik iş akışı',
      desc: 'Çalışan teklifi e-imzaladığı an (DocuSign) · UpCore 40+ task\'ı otomatik tetikler: IT\'ye laptop talebi, mentor eşleştirme, birim müdürüne bildirim, ilk gün kutlaması, gelişim planı hazırlığı. Hiçbir adım manuel değil.',
    },
    {
      title: 'İlk gün hazır olur (pre-boarding)',
      desc: 'Çalışan gelmeden 1 hafta önce: laptop + telefon hazır, e-posta hesabı aktif, 40 sistemin şifresi verilmiş, oryantasyon takvimi oturmuş. Yeni çalışan geldiği ilk dakikada "merhaba, buraya otur, şifren şu" denk değerlendirmeye başlar.',
    },
    {
      title: 'Mentor eşleştirme',
      desc: 'Aynı departmanda 1-2 yıl kıdemli bir çalışan otomatik mentor atanır · haftalık kahve randevusu takvime düşer · ilk 90 gün boyunca destek. Eşleştirme algoritması: benzer kariyer yolu + müsait kapasite + daha önce mentor olmamış.',
    },
    {
      title: '30/60/90 değerlendirme',
      desc: '30. günde: "Şirket kültürüne uyum + temel araçları öğrenme" · 60. günde: "İlk proje sorumluluğu + ekip ilişkileri" · 90. günde: "Tam üretken olup olmadığı + deneme süresi sonu kararı". Her birinde çalışan + yönetici + İK birlikte değerlendirir.',
    },
    {
      title: 'Dijital özlük dosyası',
      desc: 'TC kimlik + diploma + sertifika + sağlık raporu + iş sözleşmesi + KVKK aydınlatma metni imzası — hepsi dijital yüklenir · şifreli saklanır · her an indirilebilir · kağıt dosya yok.',
    },
    {
      title: 'IT + İK + Fiziksel checklist\'ler',
      desc: 'Departmana özel checklistler: "yazılım mühendisi = laptop + dev ortamı + GitHub hesabı + Slack + VPN" · "satış temsilcisi = tablet + CRM erişimi + araç anahtarı + müşteri listesi". Hiç kimse "bir şey unuttuk" demez.',
    },
    {
      title: 'Zorunlu eğitim atamaları',
      desc: 'İlk 30 günde tamamlanması gereken eğitimler otomatik atanır: KVKK + iş güvenliği + şirket politikaları + sektöre özel sertifikalar. LMS ile entegre (UpCore LMS veya dış Cornerstone). Tamamlanma takibi.',
    },
    {
      title: 'Buddy system + Slack bot',
      desc: 'İlk haftada "buddy" (mentor değil, iş arkadaşı) atanır · Slack bot her gün "bugün nasıl geçti?" diye sorar · anonim feedback toplar. Yeni çalışanın sessiz kalıp ayrılmasını önler.',
    },
    {
      title: 'Performans hedefleri (ilk 90 gün)',
      desc: 'Yönetici + çalışan birlikte ilk 90 gün için 3 OKR belirler · haftalık check-in ile takip · "ne bekliyoruz, ne başardın" transparan. Deneme süresi sonunda bu veri kararın temeli.',
    },
    {
      title: 'Deneme süresi sonu otomatik karar',
      desc: '2 ay sonunda sistem hatırlatır: deneme süresi biter · 30/60/90 değerlendirmeleri + performans skoru + mentor notu · yönetici 4 seçenek: devam, uzat, son ver (yasal prosedür rehberi), farklı rol öner.',
    },
  ],
  workflow: [
    {
      step: '01',
      title: 'Teklif kabul edildi',
      desc: 'Aday DocuSign e-imzaladı · UpCore otomatik 40+ task tetikler · pre-boarding başlar.',
    },
    {
      step: '02',
      title: 'Pre-boarding (1 hafta)',
      desc: 'IT ekipman hazırlığı · mentor + buddy atama · oryantasyon takvimi · çalışana hoşgeldin e-postası.',
    },
    {
      step: '03',
      title: 'İlk gün',
      desc: 'Ekipman teslimi + tur + ekip tanıtımı + yemek · sistem checklist\'leri takip eder · İK\'ya ilerleme raporu.',
    },
    {
      step: '04',
      title: '30 gün değerlendirme',
      desc: 'Çalışan + yönetici + İK · kültürel uyum + temel araç kullanımı · erken uyarılar (uyum sorunu varsa).',
    },
    {
      step: '05',
      title: '60 gün değerlendirme',
      desc: 'İlk proje sorumluluğu · ekip ilişkileri · gelişim ihtiyaçları belirlenir.',
    },
    {
      step: '06',
      title: '90 gün + deneme süresi sonu',
      desc: 'Tam üretkenlik değerlendirmesi · deneme süresi kararı · sonraki yıl OKR\'ları için temel.',
    },
  ],
  outcomes: [
    { metric: '90-gün kalma oranı', value: '%94', desc: 'Eskiden %72 idi · SHRM benchmark %69 iyileşme' },
    { metric: 'Time-to-productivity', value: '−%35', desc: 'Tam üretken olma süresi · yapılandırılmış onboarding etkisi' },
    { metric: 'Yeni çalışan NPS', value: '+52', desc: 'İlk 90 gün deneyim puanı · kariyer portalı öneriyle ilgili' },
  ],
  comparison: [
    {
      feature: 'Otomatik iş akışı tetikleme',
      upcore: '40+ task · teklif imzası = başlat',
      others: 'Manuel e-posta + Excel',
    },
    {
      feature: 'Pre-boarding (gelmeden hazırlık)',
      upcore: 'Yerleşik · 1 hafta önce',
      others: 'Ad hoc · her seferinde ayrı',
    },
    {
      feature: 'Mentor eşleştirme algoritması',
      upcore: 'Kıdem + kapasite + uygunluk',
      others: 'Manuel',
    },
    {
      feature: '30/60/90 standart değerlendirme',
      upcore: 'Yerleşik şablon',
      others: 'Yok veya custom',
    },
    {
      feature: 'Buddy + Slack bot',
      upcore: 'Yerleşik · günlük check-in',
      others: 'Yok',
    },
    {
      feature: 'Fiyat (100 çalışan/yıl)',
      upcore: '₺34.800 · tüm modüller dahil',
      others: 'Cornerstone Onboarding: ₺180K+',
    },
  ],
  instruments: [
    'SHRM Employee Onboarding Standards',
    'Harvard Business Review · Talya Bauer onboarding model',
    'İş Kanunu · deneme süresi hükümleri (2 ay)',
    '30/60/90 Framework · Silicon Valley tech company yaygın uygulama',
  ],
  useCases: [
    {
      segment: 'Tech startup kurucu',
      scenario:
        'Burak Bey 50 kişilik yazılım şirketinin kurucusu · ilk 90 günde 4 yeni çalışan ayrılmıştı (sebep: oryantasyon kaotik, ne yapacağını bilmeyen, erken başarısızlık). UpCore onboarding ile 40 task\'lık standart süreç kuruldu · sonraki 12 yeni çalışanın hepsi 90 günü tamamladı · 1 yıl sonu kalma %94.',
    },
    {
      segment: 'Holding İK Direktörü',
      scenario:
        'Zehra Hanım 18 şirketli holdingde yılda 800 yeni çalışan alınıyor · her şirket farklı onboarding süreciyle · kalite uyumsuz. UpCore ile merkezi şablon + her şirketin custom adımları · tutarlı deneyim · yeni çalışan NPS +52 (sektör ortalaması +12).',
    },
    {
      segment: 'Belediye İK',
      scenario:
        'Ayşe Hanım belediyede her yıl sınavla 100 memur alınıyor · oryantasyon 1 hafta şeklen · çoğu ilk 3 ayda ne yapacağını anlamıyor. UpCore\'da 657 kadro yapısına özel onboarding + belediye kültür eğitimi + daire başkanı mentorluğu · 1 yıllık kalma %78 → %92.',
    },
  ],
  faq: [
    {
      q: 'Küçük şirketim, 5 kişi var · onboarding yapılandırmaya gerek var mı?',
      a: 'Küçük şirkette de yapılandırma önemli ama farklı bir formda. Micro/Starter planda 15 task\'lık temel checklist: ilk gün kutlaması, temel IT hazırlığı, kültür kitapçığı, 30-gün check-in. Holding için kullanılan 40+ task\'ı değil · küçük şirkete uygun basit şablon.',
    },
    {
      q: '"Deneme süresi" yasal olarak ne kadar?',
      a: 'İş Kanunu 15. madde: maksimum 2 ay. Bu süre içinde işveren çalışanı ihbar süresine uymadan işten çıkarabilir · çalışan da ayrılabilir. Toplu iş sözleşmesinde 4 aya kadar uzatılabilir. UpCore 60-gün değerlendirmesi deneme süresi sonundan önce karar için ideal zamanlama.',
    },
    {
      q: 'Mentor istemez çalışan olursa?',
      a: 'Seçime bırakırız · çalışan ilk gün "mentor istemiyorum" diyebilir. Ama istatistiksel: mentor alan çalışanın 1-yıl kalma oranı %28 daha yüksek (MentorcliQ 2023). Dolayısıyla "istemiyorum" cevabı ideal değil · yöneticiye alternatif yaklaşım (küçük ekip + haftalık 1-1) önerilir.',
    },
    {
      q: '30/60/90 değerlendirmede düşük skor veren çalışan ne olur?',
      a: 'Aşamalı yaklaşım: 30\'da düşük → yönetici + İK destek sunar, eğitim/mentor ek desteği. 60\'ta hâlâ düşük → yapılandırılmış plan (PIP benzeri) + net hedefler. 90\'da hâlâ düşükse + yasal deneme süresi bitmiş + önemli gelişim yoksa → İş Kanunu çerçevesinde karar. UpCore her aşamada doküman üretir.',
    },
    {
      q: 'Yeni çalışan ilk gün UpCore\'u nasıl kullanır?',
      a: 'Pre-boarding e-postasında UpCore login bilgileri (Clerk ile SSO) · mobilden giriş yapar · kendine özel "hoşgeldin" dashboardu: ilk gün programı + ekip tanıtımı + şirket el kitabı + ilk eğitimleri. Yöneticisiyle ilk 1-1\'i takvime düşmüş. Bilgisayarı olmayan mavi yaka için yönetici yönlendirir.',
    },
    {
      q: 'Workday Onboarding ile farkı?',
      a: 'Workday Onboarding global, güzel UX, ama: Türk İş Kanunu (deneme süresi, SGK işe giriş bildirgesi) dahili değil, KVKK aydınlatma akışı ayrı konfig, yıllık lisans kıyasla ₺450K/100 kişi. UpCore: Türk mevzuat dahili, KVKK aydınlatma yerleşik, 100 kişi ₺34.8K/yıl.',
    },
  ],
  relatedModules: [
    { slug: 'kazanim', title: 'Kazanım (İşe Alım)', desc: 'Aday kabul edildi · otomatik onboarding\'e devir' },
    { slug: 'calisan-yonetimi', title: 'Çalışan Kayıtları', desc: 'Özlük dosyası + sözleşme · onboarding\'de oluşur' },
    { slug: 'egitim', title: 'Eğitim', desc: 'Zorunlu ilk 30 gün eğitimleri otomatik atanır' },
  ],
};

export default function OnboardingPage() {
  return <ModulePage content={content} />;
}
