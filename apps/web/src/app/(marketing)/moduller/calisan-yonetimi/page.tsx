import type { Metadata } from 'next';
import { Users } from 'lucide-react';
import { ModulePage, type ModuleContent } from '@/components/marketing/ModulePage';

export const metadata: Metadata = {
  title: 'Çalışan Kayıtları · Dijital Özlük Dosyası · UpCore',
  description:
    'Özlük dosyası Excel + fotokopi + klasör dönemi bitti. UpCore dijital özlük: TC kimlik şifreli, sözleşme sürümleri, aile bilgileri, kadro hareketleri — tek yerde, 7 yıl saklama, anlık erişim.',
};

const content: ModuleContent = {
  category: 'calisan-yonetimi',
  title: 'Özlük dosyası kağıt klasörden dijital arşive',
  tagline:
    'Çalışan geçmişi eskiden kağıt klasörde dururdu: sözleşme + fotoğraf + diploma + SGK bildirgeleri + izin formları — hepsi fotokopi. Bir çalışanın 10 yıllık geçmişini bulmak saatler alırdı. UpCore Çalışan Kayıtları modülü bunu dijitalleştirir: TC kimlik şifreli saklanır, sözleşmenin her sürümü versiyonlanır, anlık erişim + audit log.',
  icon: Users,
  accent: '#3B82F6',
  heroStats: [
    { value: '0 kağıt', label: 'Tam dijital özlük' },
    { value: '7 yıl', label: 'Yasal saklama süresi · otomatik' },
    { value: 'Şifreli', label: 'TC kimlik · maaş bilgisi' },
    { value: '3 sn', label: 'Çalışan bilgisi bulma süresi' },
  ],
  intro:
    "Her şirketin İK departmanında bir \"personel arşivi\" odası vardı: raf raf kağıt dosya, fotokopi makinesi yanında ödeme bordro kopyaları, 2008'den kalma iş sözleşmeleri. Bir mahkeme davasında 5 yıl önceki bordro istendiğinde, bir çalışan emekli olacaksa, Sayıştay denetimi geldiğinde — günlerce kağıt karıştırırdı İK personeli. KVKK sonrası bu kağıt arşivler aynı zamanda büyük yasal risk haline geldi: yanlış kişi elledi ihlal, yangın çıksa kayıp, kişisel veriyi silme talebi gelirse hangi kağıtlarda var bulamama. UpCore Çalışan Kayıtları modülü bu problemin modern çözümü: dijital özlük dosyası + şifreli depolama + sürüm kontrolü + KVKK uyumlu silme akışı + anlık arama.",
  features: [
    {
      title: 'Dijital özlük dosyası',
      desc: 'Çalışanın tüm kayıtları tek ekranda: kişisel bilgi, iletişim, aile, acil durum kişisi, sözleşme, pozisyon geçmişi, bordro arşivi, izin geçmişi, eğitim/sertifikalar, performans değerlendirmeleri, dahili/harici yazışmalar.',
    },
    {
      title: 'TC kimlik şifreli (pgcrypto)',
      desc: 'TC kimlik numarası veritabanında düz metin saklanmaz · PostgreSQL pgcrypto ile şifrelenir · her tenant için ayrı anahtar. Veritabanı sızdırılsa bile TC kimlikler anlaşılamaz. KVKK Madde 12 için gerekli teknik önlem.',
    },
    {
      title: 'Sözleşme sürüm kontrolü',
      desc: 'Çalışanın ilk sözleşmesi + her maaş artışı için ek protokol + pozisyon değişikliğinde yeni sözleşme · hepsi tarihle versiyonlanır. "Bu çalışanın 2021 Eylül\'deki sözleşmesini göster" sorgusuna tek tıkla cevap.',
    },
    {
      title: 'E-imza entegrasyonu (DocuSign)',
      desc: 'Sözleşme + yıllık izin formu + aydınlatma metinleri · DocuSign ile dijital imza · KVKK Madde 11 kapsamında yasal geçerli · kağıt fiziksel imzaya gerek yok.',
    },
    {
      title: 'Kadro + derece + kademe (657 için)',
      desc: 'Belediye/kamu kurumları için: 657 sayılı Kanun\'un kadro yapısı · derece/kademe ilerlemesi otomatik · hizmet puanı hesaplama · bakanlık bildirimleri hazır.',
    },
    {
      title: 'Personel tipi yönetimi',
      desc: 'Memur (657) · Sözleşmeli (4/B) · İşçi (4857) · Geçici · Stajyer · Part-time — her biri farklı kurallara tabi · sistem otomatik uygular. Bir çalışan tip değiştirirse (örn: sözleşmeli → memur) geçmişi korunur.',
    },
    {
      title: 'Aile + bakmakla yükümlülük',
      desc: 'Eş + çocuk + bakmakla yükümlü bilgileri · SGK bildirgelerinde doğru ek prim + AGI (Asgari Geçim İndirimi) otomatik hesaplanır. Doğum sonrası analık izni + çocuk parası burada tetiklenir.',
    },
    {
      title: 'Organizasyon şeması + matrix manager',
      desc: 'Çalışanın bir birincil yöneticisi + (opsiyonel) matrix/proje yöneticisi · organizasyon şemasında gösterilir · her ikisi de performans + izin onaylarına dahil.',
    },
    {
      title: 'Pozisyon geçmişi + maaş tarihçesi',
      desc: 'Çalışanın 2014\'teki başlangıç pozisyonundan bugüne tüm hareketler kronolojik liste · her değişimin gerekçesi + onay + sözleşme. Kıdem tazminatı hesabına otomatik veri.',
    },
    {
      title: 'KVKK uyumlu silme akışı',
      desc: 'Çalışan ayrıldı · yasal zorunlu saklama 5 yıl · sonrası otomatik anonimleştirme/silme · çalışan "verimi şimdi sil" talebiyle KVKK Madde 11\'i kullanabilir · sistem hangi alanları silebileceğini gösterir.',
    },
  ],
  workflow: [
    {
      step: '01',
      title: 'Aday işe alındı',
      desc: 'Kazanım modülünden UpCore\'a geçer · özlük dosyası otomatik oluşur · temel bilgiler + sözleşme şablonu hazır.',
    },
    {
      step: '02',
      title: 'Dijital belge yüklemeleri',
      desc: 'Diploma + adli sicil + sağlık raporu + kimlik fotokopi · çalışan mobilden upload · İK kontrol eder · şifreli saklanır.',
    },
    {
      step: '03',
      title: 'Sözleşme + e-imza',
      desc: 'İş sözleşmesi hazırlanır · DocuSign ile çalışan imzalar · İK imzalar · versiyon 1.0 arşive düşer.',
    },
    {
      step: '04',
      title: 'SGK işe giriş bildirgesi',
      desc: 'SGK e-Bildirge sistemine otomatik XML · işe giriş tarihi kaydedilir · ilk bordro dönemi için hazır.',
    },
    {
      step: '05',
      title: 'Yıllık güncelleme + değişiklikler',
      desc: 'Maaş artışı · pozisyon değişikliği · yeni çocuk · evlilik · medeni hal · her değişiklik versiyonlanır + audit log.',
    },
    {
      step: '06',
      title: 'Çıkış + arşivleme',
      desc: 'Çalışan ayrıldı · son bordro + kıdem/ihbar tazminatı + SGK çıkış bildirgesi · dosya 5 yıl aktif arşivde · sonrası anonimleştirme.',
    },
  ],
  outcomes: [
    { metric: 'Bilgi bulma süresi', value: '3 saniye', desc: 'Eskiden 2 saat kağıt karıştırma · belediye pilot' },
    { metric: 'Kağıt tüketimi', value: '−%95', desc: 'Yıllık 50.000 kağıt tasarrufu · orta şirket' },
    { metric: 'KVKK uyum puanı', value: '100/100', desc: 'VERBIS denetimi · anonimleştirme + silme hakları' },
  ],
  comparison: [
    {
      feature: 'TC kimlik şifreleme',
      upcore: 'pgcrypto · tenant başına anahtar',
      others: 'Düz metin veritabanında · risk',
    },
    {
      feature: 'Sözleşme versiyon kontrolü',
      upcore: 'Git benzeri diff + tarihçe',
      others: 'Excel · son sürüm belirsiz',
    },
    {
      feature: '657 kadro + derece/kademe',
      upcore: 'Yerleşik · belediye için',
      others: 'SAP: ayrı modül · BordroCep: yok',
    },
    {
      feature: 'KVKK silme talep akışı',
      upcore: 'Çalışan portal · 30 gün SLA',
      others: 'Manuel e-posta · belirsiz süre',
    },
    {
      feature: 'E-imza yerleşik',
      upcore: 'DocuSign + İyzico e-imza',
      others: 'Ayrı araç · entegrasyon manuel',
    },
  ],
  instruments: [
    'KVKK · Madde 11 (hak kullanımı) + Madde 12 (güvenlik)',
    'İş Kanunu 4857 · sözleşme zorunlu unsurları',
    '657 sayılı Devlet Memurları Kanunu · kadro/derece/kademe',
    'Borçlar Kanunu · bakmakla yükümlülük tanımları',
  ],
  useCases: [
    {
      segment: 'KOBİ işletmeci',
      scenario:
        'Ayşe Hanım 6 kişilik kafede çalışanlarının her bilgisi Gmail\'de PDF olarak saklanıyordu · SGK denetmeni geldi, sözleşmeleri göstermeye yarım saatte ancak yetti · sonra KVKK ihtarı "PII buralarda gezmemeli". UpCore Micro\'ya geçti · tüm kayıtlar şifreli · denetmen geldiğinde 30 saniyede aranan dosya.',
    },
    {
      segment: 'Belediye CHRO',
      scenario:
        'Selim Bey 12.000 çalışanlı belediyede özlük arşivinde 50+ yıllık kağıt dosyalar · 657 kadro yapısındaki her çalışan için derece/kademe manuel izleniyordu · hatalar olağandı. UpCore\'a geçti · 6 ayda tüm arşiv sayısallaştı · Sayıştay denetimi artık veri ile savunuluyor.',
    },
    {
      segment: 'Holding İK Direktörü',
      scenario:
        'Burcu Hanım 24.000 çalışanlı holdingde 18 şirket arasında çalışan transferi günlerce sürüyordu — her şirketin ayrı özlük dosyası vardı. UpCore multi-entity ile: çalışan bir şirketten diğerine geçtiğinde dosya taşınır · tarihçe korunur · yeni sözleşme otomatik üretilir · transfer 1 günde biter.',
    },
  ],
  faq: [
    {
      q: 'Eski kağıt dosyalarımı nasıl dijitalleştiririm?',
      a: 'İki yol: (1) Kendiniz yaparsınız · tarayıcı + UpCore upload · 1 çalışanın dosyası 30 dk. (2) Biz yaparız · "dijitalleştirme hizmeti" · çalışan başı ₺150 · gizlilik sözleşmesi + biter bitmez fiziksel dosyalar geri döner. 24.000 çalışanlı holding için 3 ayda tamamlandı.',
    },
    {
      q: 'TC kimlik şifrelenmesi ne kadar güvenli?',
      a: 'Veritabanında pgcrypto ile AES-256 şifreli · tenant başına ayrı anahtar · anahtarlar Azure Key Vault\'ta (HSM seviyesinde). Azure Key Vault\'ın sertifikaları FIPS 140-2 Level 2 · bankacılık sektörünün kullandığı seviye. Veritabanı tamamen sızdırılsa bile TC kimlikler okunamaz.',
    },
    {
      q: 'Çalışan "tüm verilerimi sil" diye talep ederse?',
      a: 'KVKK Madde 11 · talep alındı · 30 gün içinde işlem yapılır. Yasal zorunlu saklanması gereken veriler (bordro 5 yıl, sözleşme 10 yıl, iş kazası 30 yıl) saklanmaya devam eder ama çalışandan kimlik bilgileri anonimleştirilir. Silinemeyen kayıtların gerekçesi rapor edilir · çalışan itiraz edebilir.',
    },
    {
      q: 'Sözleşme versiyonları arasında farkı görebilir miyim?',
      a: 'Evet. Git diff benzeri arayüz · 2021 sözleşmesinde "maaş: 8.000 TL" → 2023 sözleşmesinde "maaş: 14.000 TL" değişim açıkça gösterilir · kim onayladı + ne zaman. Mahkeme dosyasında kanıt değerinde.',
    },
    {
      q: '657 kadro + derece/kademe ilerlemesi nasıl?',
      a: 'Her yıl 1 Ocak\'ta sistem otomatik kontrol eder · çalışan o yılın kademe artış şartlarını (asgari 1 yıl dolmuş + disiplin cezası yok + sicil olumlu) sağlıyorsa otomatik ilerletir · dosyasına not düşer · bordroya yeni baz maaş yansır. Bakanlığa gönderilecek belgeler hazır.',
    },
    {
      q: 'Oracle HCM ile farkı?',
      a: 'Oracle HCM tam kurumsal HRIS · ama: Türk 657 kadro yapısı eklenti, KVKK akışı manuel konfigürasyon, SGK e-Bildirge entegrasyonu yok, TC kimlik şifrelemesi custom kod, yıllık lisans (500 kişi için) ₺400K+. UpCore: yerleşik TR mevzuat, KVKK yerleşik, SGK dahili, 500 kişi için yıllık ₺294K.',
    },
  ],
  relatedModules: [
    { slug: 'bordro', title: 'Bordro', desc: 'Özlük + pozisyon + aile bilgisi bordronun temelidir' },
    { slug: 'onboarding', title: 'Yeni Başlayan Süreci', desc: 'İşe alındığında özlük dosyası otomatik oluşur' },
    { slug: 'kvkk-uyumu', title: 'KVKK Uyumu', desc: 'Özlük verisi en hassas PII · KVKK mücessesesi' },
  ],
};

export default function CalisanYonetimiPage() {
  return <ModulePage content={content} />;
}
