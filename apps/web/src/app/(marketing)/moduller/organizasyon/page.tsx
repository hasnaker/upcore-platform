import type { Metadata } from 'next';
import { Building2 } from 'lucide-react';
import { ModulePage, type ModuleContent } from '@/components/marketing/ModulePage';

export const metadata: Metadata = {
  title: 'Organizasyon Şeması · Pozisyon + Matrix Manager · UpCore',
  description:
    'Organizasyon şeması PowerPoint\'te donmuş bir resim olmasın. UpCore Organizasyon: sürükle-bırak şema, pozisyon tanımları, çift raporlama (matrix), vekalet, headcount planlaması — canlı, sürümlü, her an güncel.',
};

const content: ModuleContent = {
  category: 'organizasyon',
  title: 'Organizasyonu canlı tutun · PowerPoint\'te değil',
  tagline:
    'Çoğu şirkette organizasyon şeması 2 yıl önce yapılmış bir PowerPoint dosyasıdır — 4 kişi ayrıldı, 6 kişi geldi, 3 kişi departman değiştirdi ama şema hâlâ eski. UpCore Organizasyon modülü şemayı canlı tutar: bir çalışan transfer oldu, yeni bir pozisyon açıldı, bir departman yeniden yapılandı — şema anında güncel.',
  icon: Building2,
  accent: '#0F766E',
  heroStats: [
    { value: 'Canlı', label: 'Her an güncel · PowerPoint değil' },
    { value: 'Sürükle-bırak', label: 'Yeniden yapılandırma UI' },
    { value: '50+ seviye', label: 'Desteklenen hiyerarşi derinliği' },
    { value: 'Matrix', label: 'Çift raporlama desteği' },
  ],
  intro:
    "Organizasyon şeması iki amaca hizmet eder: (1) İçeride \"kim kime bağlı\" sorusunun cevabı — yeni başlayan çalışan kendi yöneticisini bulabilsin. (2) Dışarıda potansiyel müşteri/yatırımcı/iş ortağına sunum. Geleneksel yöntem: Visio veya PowerPoint'te bir tane yapılır, her büyük değişiklikte 1-2 saatte güncellenir, arada eskidir. UpCore Organizasyon şeması sistemsel: bir çalışan giriş aldığında yeni kutucuk otomatik çıkar, transfer olduğunda pozisyonu değişir, ayrıldığında kutucuk şeffaflaşır. Matrix organizasyonlarda çift raporlama ilişkileri gösterilir — proje yöneticisi + birim yöneticisi.",
  features: [
    {
      title: 'Sürükle-bırak organizasyon şeması',
      desc: 'Modern org chart UI · bir kutucuğu alıp başka bir yöneticiye sürükleyerek transfer yapılır · İK onayı istenir · gerçekleşirse çalışanın pozisyonu + yöneticisi güncellenir · ilgili e-postalar gider.',
    },
    {
      title: 'Pozisyon tanımları',
      desc: 'Her pozisyonun: başlığı + departmanı + kadrosu + ücret bandı + gereksinimleri + yetkinlikleri tanımlı. Yeni çalışan alırken ilan metni buradan türetilir · işe alım kriterleri + performans değerlendirme referansı.',
    },
    {
      title: 'Matrix (çift) raporlama',
      desc: 'Bir çalışanın 2 yöneticisi olabilir: birincil (birim yöneticisi) + ikincil (proje yöneticisi). Her ikisi de performans değerlendirmeye katkı verir · izin onayına çağrılır · 360 feedback\'e dahil edilir.',
    },
    {
      title: 'Vekalet yönetimi',
      desc: 'Yönetici tatile çıkıyor · 2 hafta vekaleti X kişiye devrediyor · sistem otomatik onay akışını değiştirir · kararlar geciktirilmez. İş akışında "vekaleten" etiketi · audit log\'da kimin vekaletiyle onaylandığı kayıtlı.',
    },
    {
      title: 'Headcount planlaması',
      desc: 'Gelecek yıl için hangi departmanda kaç pozisyon açılacak · her pozisyonun maliyeti · toplam bütçe otomatik hesaplanır. CFO\'nun yıllık bütçe planlaması için temel · "planlanan vs. gerçek" raporu aylık.',
    },
    {
      title: 'Sürüm karşılaştırma',
      desc: 'Bu yılın organizasyon şeması vs. geçen yılın · farklar renkli gösterilir · kaç çalışan arttı/azaldı + hangi departmanlar genişledi/daraldı · yıllık rapor için veri.',
    },
    {
      title: 'Pozisyon vs. kişi',
      desc: 'Sistemde "Satış Direktörü" pozisyonu vardır, o pozisyonu dolduran kişi "Ahmet Bey" olur. Ahmet Bey ayrıldığında pozisyon kalır, boş olduğu işaretlenir · yeni alım sürecini tetikler. Pozisyon-kişi ayrımı önemli · şirket büyür, insanlar gelir gider.',
    },
    {
      title: 'Kadro + derece/kademe (657)',
      desc: 'Belediye/kamu için: her pozisyonun kadro numarası + uygulanacak derece/kademe · devlet personel rejimi uyumlu · bakanlık bildirimleri otomatik.',
    },
    {
      title: 'Departman hiyerarşisi',
      desc: '50+ seviye derinliğinde hiyerarşi · alt-üst departman ilişkisi · konsolide raporlama için temel (örn: "Satış Direktörlüğü = İstanbul Satış + Ankara Satış + İzmir Satış"). Rapor kırılımları buradan türetilir.',
    },
    {
      title: 'Org chart PDF/SVG export',
      desc: 'Yönetim kuruluna sunum için: tek tık PDF (A3/A2 boyutunda) veya SVG · logolu + tarihli. Harici paydaşlara (yatırımcı/denetçi) paylaşım için link (süreli + filigranlı).',
    },
  ],
  workflow: [
    { step: '01', title: 'Temel organizasyon yapısı', desc: 'CEO + üst yönetim + departmanlar · ilk organizasyon şeması oluşur · herkese görünür.' },
    { step: '02', title: 'Pozisyon tanımları', desc: 'Her pozisyonun başlığı + kadrosu + gereksinimleri · İK + birim yöneticisi birlikte doldurur.' },
    { step: '03', title: 'Çalışan atamaları', desc: 'Her çalışan bir pozisyona atanır · birincil yönetici + (varsa) matrix yönetici · organizasyon şemasında görünür.' },
    { step: '04', title: 'Değişiklik yönetimi', desc: 'Transfer · pozisyon değişimi · vekalet · hepsi iş akışında · onaylar · otomatik güncelleme.' },
    { step: '05', title: 'Headcount planlama', desc: 'Yıllık: CHRO + CFO birlikte · yeni pozisyonlar · kapanan pozisyonlar · bütçe.' },
    { step: '06', title: 'Yıl sonu sürüm kapanışı', desc: 'Yıl sonunda sürüm kilitlenir · yeni yıl için baseline · karşılaştırma raporları.' },
  ],
  outcomes: [
    { metric: 'Org chart güncellik', value: 'Gerçek zamanlı', desc: 'PowerPoint döneminde 1-2 ay geride · sistemsel sonrası canlı' },
    { metric: 'Transfer süresi', value: '1 saat', desc: 'Eskiden 3 gün · onay zinciri + güncellemeler otomatik' },
    { metric: 'Bütçe hatası', value: '−%80', desc: 'Headcount planlama otomatik · manuel hata riski azaldı' },
  ],
  comparison: [
    { feature: 'Sürükle-bırak şema', upcore: 'Modern UI · herkes kullanır', others: 'Visio/PowerPoint · zor güncelleme' },
    { feature: 'Matrix raporlama', upcore: 'Yerleşik · iki yönetici', others: 'Oracle: config · SAP: eklenti' },
    { feature: 'Pozisyon vs. kişi ayrımı', upcore: 'Yerleşik · succession ile entegre', others: 'Karıştırılır genelde' },
    { feature: '657 kadro desteği (TR)', upcore: 'Yerleşik · kademe otomatik', others: 'Custom veya yok' },
    { feature: 'Org chart export', upcore: 'PDF + SVG + paylaşım linki', others: 'PowerPoint manuel export' },
    { feature: 'Sürüm karşılaştırma', upcore: 'Yıllık + custom tarih aralığı', others: 'Eski PowerPoint dosyası' },
  ],
  instruments: [
    'McKinsey 7S Framework · organizasyon tasarımı',
    'Mintzberg · Organizational Structures',
    '657 sayılı Devlet Memurları Kanunu · kadro yapısı',
    'BPMN 2.0 · iş akışı onay zincirleri',
  ],
  useCases: [
    { segment: 'Holding Kurumsal Gelişim', scenario: 'Cem Bey 18 şirketli holdingde her ay organizasyon değişiklikleri toplar, PowerPoint güncellerdi · 1 hafta sürüyordu. UpCore\'da çalışanlar transfer olduğunda şema otomatik güncelleniyor · Cem Bey\'in işi 1 haftadan 1 saate düştü.' },
    { segment: 'Belediye CHRO', scenario: 'Ayşe Hanım belediyede 657 kadro yapısında 2.500 memur · her yıl derece/kademe ilerlemeleri organizasyon şemasında kadrolara düşer · bakanlık bildirimleri otomatik · müfettiş denetiminde 5 dakikada rapor.' },
    { segment: 'Tech startup', scenario: 'Ece Hanım 80 kişilik startup\'ta 8 squad yapısında çalışıyor · her squad 4-6 kişi · squad yöneticisi + ürün müdürü (matrix). UpCore matrix raporlama ile her çalışanın iki yöneticisi tanımlı · performans değerlendirme çift kaynaklı.' },
  ],
  faq: [
    { q: 'Organizasyon değişikliği kaç tıkla oluyor?', a: 'Basit transfer: 2 tık (çalışanı yeni yöneticiye sürükle → onayla). Kompleks yeniden yapılandırma: yeni departman oluşturma + birden fazla transfer → iş akışı açılır · İK + ilgili yöneticiler onaylayınca toplu olarak gerçekleşir · herkese e-posta gider.' },
    { q: 'Matrix raporlama gerçek dünyada işe yarıyor mu?', a: 'Tartışmalı bir konu. Araştırmalar gösteriyor: matrix yapılar inovasyon + bilgi paylaşımını artırıyor, ama karar hızını yavaşlatıyor · iki yönetici arasında çatışma olabiliyor. UpCore matrix\'i destekler ama zorunlu kılmaz · şirket kültürünüze göre karar verirsiniz. Enterprise tier\'da "hangi tür kararda hangi yönetici karar verir" matrix policy tanımlanabilir.' },
    { q: 'Küçük şirketim, karmaşık organizasyona ihtiyacım yok...', a: 'Doğru. Micro/Starter tier\'larda basit hiyerarşi yeter: CEO → departman yöneticileri → çalışanlar. Matrix, vekalet gibi özellikler Professional+ seviyede açılıyor. Küçük şirkette zaten gereksiz karmaşıklık.' },
    { q: '657 kadro sisteminde derece/kademe ilerlemesi otomatik mi?', a: 'Evet. Her çalışanın kadro + derece + kademe bilgisi var · her yıl 1 Ocak sistem otomatik kontrol eder · hak kazanmış mı (1 yıl doldu + disiplin cezası yok + sicil olumlu) · ilerletir · özlük dosyasına not düşer · bordroya yeni maaş yansır · bakanlığa bildirilecek belgeler hazır.' },
    { q: 'Yeniden yapılandırma (reorg) büyük değişikliklerde?', a: 'UpCore "reorg mode" destekler · tüm çalışanların + departmanların tek seferde toplu yeniden atanması · onay: CHRO + CEO + bazı durumlarda yönetim kurulu · uygulandığında: tüm bildirimler tek seferde gider · audit log\'da "reorg 2026-03-15" etiketi · geri alma bile mümkün (ilk 24 saatte).' },
    { q: 'Workday Organization Management ile farkı?', a: 'Workday global standart ama: Türk kadro sistemi (657) ayrı config gerektirir, matrix raporlama karmaşık kurulur, org chart UI eski. UpCore: 657 yerleşik, matrix basit aç/kapat, modern drag-drop UI. 10.000+ çalışanlı kurum için Workday daha derin features sunabilir ama Türkiye odaklı kurumlar için UpCore yeterli.' },
  ],
  relatedModules: [
    { slug: 'calisan-yonetimi', title: 'Çalışan Kayıtları', desc: 'Organizasyondaki her kutucuk özlük dosyasıyla bağlı' },
    { slug: 'yerlestirme', title: 'Kariyer Yolu', desc: 'Pozisyon boşalınca succession havuzundan öneriler' },
    { slug: 'analitik', title: 'Yönetici Raporları', desc: 'Organizasyon değişiklik raporu · headcount trendi' },
  ],
};

export default function OrganizasyonPage() {
  return <ModulePage content={content} />;
}
