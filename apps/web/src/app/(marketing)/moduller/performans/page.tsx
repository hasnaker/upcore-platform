import type { Metadata } from 'next';
import { BarChart3 } from 'lucide-react';
import { ModulePage, type ModuleContent } from '@/components/marketing/ModulePage';

export const metadata: Metadata = {
  title: 'Performans · 360° Değerlendirme + OKR + 9-Kutu · UpCore',
  description:
    'Performans değerlendirmeyi yıllık form doldurma acısından çıkarın. 360° geri bildirim, OKR hedef takibi, 9-kutu potansiyel kalibrasyonu — hepsi tek platformda, yıl boyu sürekli.',
};

const content: ModuleContent = {
  category: 'performans',
  title: 'Performans değerlendirmeyi "form doldurma" olmaktan çıkarın',
  tagline:
    'Çoğu şirkette performans değerlendirme yıl sonunda yapılan bir form doldurma ritüelidir — kimse ciddiye almaz, yönetici 50 kişi için 50 formu Pazar günü doldurur, sonuçlar 6 ay sonra çalışana iletilir. UpCore farklı: hedefleri yıl başında net belirleyin, çeyrek takiplerle canlı tutun, 360° geri bildirimle çok yönlü değerlendirin, 9-kutu kalibrasyonla objektif tutun.',
  icon: BarChart3,
  accent: '#8B5CF6',
  heroStats: [
    { value: '%88', label: 'Çalışan tamamlama oranı' },
    { value: '3x', label: 'Geri bildirim sıklığı' },
    { value: '25 dk', label: 'Yönetici başına değerlendirme süresi' },
    { value: '4x/yıl', label: 'Çeyreklik 1-1 rehberi' },
  ],
  intro:
    "Harvard Business Review 2024 araştırması şunu söylüyor: geleneksel yıllık performans değerlendirmesi çalışanın %90'ında stres yaratıyor, yönetici performansını artırdığı kanıtlanamıyor, şirket verimliliğine ortalama etki sıfıra yakın. Yeni yaklaşım: hedefleri objektifleştir (OKR), geri bildirimi yıl boyu yap (sürekli), değerlendirmeyi tek kişinin görüşü olmaktan çıkar (360°), potansiyel kalibrasyonunu grup kararı yap (9-kutu). UpCore Performans modülü bu 4 bilimsel yaklaşımı tek platformda birleştiriyor. Oracle Performance Management formu otomatik doldurucu değil — UpCore bilim-temelli performans kültürü kurucudur.",
  features: [
    {
      title: 'OKR hedef takibi',
      desc: 'Google\'ın 2000\'lerde kullanıp yaygınlaştırdığı sistem: Objective (ne istiyoruz) + Key Result (nasıl ölçeriz). Çalışan 3-5 OKR yazar · çeyrek sonlarında güncellenir · 0-100 skor. Şeffaf: CEO\'nun OKR\'ı herkese açık · ekip hedefleri ortada.',
    },
    {
      title: '360° çok yönlü geri bildirim',
      desc: 'Tek yönetici değil 4-6 kişiden görüş: doğrudan yönetici + ekip arkadaşları + rapor veren kişiler (varsa) + müşteri temsilcisi. Her biri 5-10 soru · anonim veya isimli tercih. Tek gözlü değerlendirmenin bias\'ı kırılır.',
    },
    {
      title: '9-kutu potansiyel kalibrasyonu',
      desc: 'McKinsey\'nin klasik modeli: Performans × Potansiyel = 3×3 = 9 kutu. Çalışan "yıldız" (yüksek perf + yüksek potansiyel) veya "çekirdek" (orta + orta) gibi kategoriye yerleşir. Kalibrasyon toplantısı zorunlu: 3 yönetici + 1 İK birlikte · audit log.',
    },
    {
      title: 'Yıl boyu sürekli geri bildirim',
      desc: 'Tek yıllık değerlendirme değil · sürekli feedback. Slack/Teams\'ten herhangi biri hemen geri bildirim gönderebilir: "X projede harika iş çıkardın" veya "Y konuda geliştirebilirsin". Yıl sonunda 360° değerlendirmede bu mesajlar otomatik toplanır.',
    },
    {
      title: 'Çeyreklik 1-1 rehberi',
      desc: 'Yılda 4 kere yönetici + çalışan birebir toplantısı. UpCore toplantı şablonu sunar: "Son çeyrekte en büyük başarın?" "Hangi zorluk yaşadın?" "Sonraki çeyrek hedefin?". Notlar kaydedilir · yıl sonu değerlendirmeye girer.',
    },
    {
      title: 'Yetkinlik modeli',
      desc: 'Şirketin kendi yetkinlik modeli (örn: Teknik Yetkinlik + Müşteri Odaklılık + Ekip Çalışması + Liderlik). Her rolün gerekli yetkinlikleri + seviyesi tanımlı · çalışan + yönetici her birini 1-5 skorla.',
    },
    {
      title: 'Hedef kaskadlama (şirket → ekip → kişi)',
      desc: 'CEO "bu yıl ciroyu %20 artır" hedefini koyar · bu otomatik olarak satış direktörüne iner ("satış cirosu %20"), ondan ekip liderine ("şu bölgede %20"), ondan bireye ("şu müşteri portföyünde büyüme"). Her hedef üstünü besler.',
    },
    {
      title: 'Performans improvement plan (PIP)',
      desc: 'Düşük performans gösteren çalışan için resmi iyileştirme planı · 30/60/90 gün · hedefler + destek + düzenli check-in · belgeli süreç. İş Kanunu açısından hukuki adımdan önceki zorunlu prosedür.',
    },
    {
      title: 'Kalibrasyon toplantı modu',
      desc: '9-kutu kalibrasyon toplantısında tüm yöneticiler UpCore ekranına bakar · çalışanları birlikte yerleştirirler · kararın gerekçesi kayıtlıdır · "neden bu çalışanı \'yıldız\' kategorisine koyduk?" sorusuna audit log\'da cevap var.',
    },
    {
      title: 'Bias denetimi',
      desc: 'Performans değerlendirmelerinde cinsiyet/yaş/departman bazlı sistematik fark var mı? Otomatik denetlenir · yıllık bağımsız rapor · mahkeme/yasal denetim için delil niteliğinde.',
    },
  ],
  workflow: [
    {
      step: '01',
      title: 'Yıl başı · OKR belirleme',
      desc: 'Şirket hedefleri → ekip hedefleri → bireysel hedefler. 2 haftalık süreç · herkes 3-5 OKR yazar · yönetici onaylar.',
    },
    {
      step: '02',
      title: 'Q1 sonu · çeyreklik check-in',
      desc: 'Çalışan + yönetici birebir · UpCore şablonlu toplantı · OKR ilerlemesi (0-100) · engeller · destek talepleri.',
    },
    {
      step: '03',
      title: 'Yıl ortası · 360° mini değerlendirme',
      desc: '4-6 kişiden kısa geri bildirim · 15 soru · 10 dk sürer · yönetici + çalışan birlikte yorumlar.',
    },
    {
      step: '04',
      title: 'Yıl sonu · tam 360° değerlendirme',
      desc: 'Tüm yetkinlikler + OKR sonuçları + yıl boyu biriken feedback. Çalışan önce self-değerlendirme yapar.',
    },
    {
      step: '05',
      title: '9-kutu kalibrasyon toplantısı',
      desc: '3+ yönetici + İK birlikte · her çalışan 9-kutuya yerleşir · kararın gerekçesi audit log\'a.',
    },
    {
      step: '06',
      title: 'Sonuç + gelişim planı',
      desc: 'Yönetici çalışanla birebir · sonuçları paylaşır · gelişim alanları · ücret/terfi kararları · sonraki yıl OKR için temel.',
    },
  ],
  outcomes: [
    { metric: 'Tamamlama oranı', value: '%88', desc: 'Tam dönem · eskiden %45 idi · sürekli feedback etkisi' },
    { metric: 'Yönetici memnuniyet', value: '+%52', desc: '1-1 şablonu + otomatik veri toplama sonrası' },
    { metric: 'Objektiflik', value: '+%38', desc: '9-kutu kalibrasyon sonrası · bias denetimi raporu' },
  ],
  comparison: [
    {
      feature: 'OKR + KR takibi',
      upcore: 'Yerleşik · 4 çeyrek güncelleme',
      others: 'Ayrı modül (Oracle Goals) · lisans',
    },
    {
      feature: '360° çok kaynaklı feedback',
      upcore: 'Anonim seçenekli · 4-6 kaynak',
      others: 'SuccessFactors: var · Oracle: eklenti',
    },
    {
      feature: 'Sürekli feedback (Slack/Teams)',
      upcore: 'Bot entegrasyonu',
      others: 'Yok veya ayrı ürün (Lattice)',
    },
    {
      feature: '9-kutu toplantı modu + audit',
      upcore: 'Yerleşik · karar gerekçesi log',
      others: 'Excel export · kalibrasyon manuel',
    },
    {
      feature: 'Bias otomatik denetimi',
      upcore: 'Quarterly otomatik',
      others: 'Yok',
    },
  ],
  instruments: [
    'OKR · Google/Intel 1970s · Doerr 2018',
    '360° Feedback · Edwards & Ewen 1996',
    'Nine-box · McKinsey 1970s',
    'Performance Improvement Plan · İş Kanunu uyumlu',
  ],
  useCases: [
    {
      segment: 'Manager',
      scenario:
        'Deniz Hanım 12 kişilik ekip yönetiyor · eski yılda tam 48 saat sürerdi yıl sonu değerlendirme (her çalışan için 4 saat). UpCore\'la sürekli feedback + çeyrek 1-1\'ler sayesinde yıl sonunda her kişi için 25 dk yetiyor · toplam 5 saat · kalitesi de arttı çünkü yıl boyu veriye dayanıyor.',
    },
    {
      segment: 'CHRO',
      scenario:
        'Murat Bey holdingde 24.000 çalışan · 9-kutu kalibrasyon toplantıları eskiden Excel\'de yapılıyordu, kayıt yok, bias riski yüksek. UpCore\'la toplantı modu + audit log + bias denetimi · yıllık "talent review board" raporu hukuki denetime hazır.',
    },
    {
      segment: 'Çalışan',
      scenario:
        'Tuğçe yıl sonu değerlendirmesini bekleyen tek kişi değil · her çeyrek yöneticisiyle birebir konuşuyor, OKR ilerlemesini görüyor, Slack\'ten iş arkadaşlarının pozitif feedback\'lerini alıyor. Yıl sonunda sürpriz olmuyor — ne için değerlendirildiğini zaten biliyor.',
    },
  ],
  faq: [
    {
      q: 'OKR ile KPI farkı ne?',
      a: 'KPI = "gösterge" (metrik, izlenir). OKR = "hedef + ölçüm" (ulaşılması hedeflenen). Örnek KPI: "müşteri memnuniyet skoru". Örnek OKR: "müşteri memnuniyetini 4.2\'den 4.6\'ya çıkar". OKR zamanla bağlıdır (çeyrek/yıllık), yapma derecesi 0-100 arası skorlanır.',
    },
    {
      q: '360° değerlendirmede anonim feedback kötüye kullanılabilir mi?',
      a: 'Risk var. Biz önlem alıyoruz: (1) Min 3 yanıt altında gösterilmez (bir kişinin kimliği açığa çıkmaz), (2) Çok olumsuz/çok olumlu yanıtlar uyarılır (bias riski), (3) Kişisel hakaret/ayrımcı dil tespit edilirse rapor ekinde flag\'lenir (AI taraması). Anonim feedback yapıcı olmak için · yıkıcı olmak için değil.',
    },
    {
      q: 'Performans değerlendirme sonucu terfi/ücret kararında kullanılabilir mi?',
      a: 'Evet, amacı bu. Performans skoru + potansiyel kutusu (9-kutu) + OKR sonuçları · üçü birlikte terfi/ücret/prim kararlarının temeli. Ama UpCore\'daki farklı veriler (BAT-TR tükenmişlik, UWES bağlılık) performans kararında kullanılamaz · sözleşme şartı.',
    },
    {
      q: 'Nine-box adil mi? "çekirdek" kutuya düşen çalışan ne hisseder?',
      a: 'Kültürel hassasiyet önemli. Biz iki felsefede kullanırız: (1) "Çekirdek" = şirketin dayandığı güvenilir çoğunluk · olumlu algı. (2) "Yıldız" çok az (tipik %5-10) · aşırı kastırma yapmayın. Çalışanla paylaşılıp paylaşılmayacağı şirket kararı · bazı şirketler sadece yönetime, bazı şirketler çalışana tamamen açık. Biz her iki modu da destekliyoruz.',
    },
    {
      q: 'PIP (Performans İyileştirme Planı) hukuki süreç midir?',
      a: 'İş Kanunu 25/2 (performans yetersizliği nedeniyle haklı fesih) için önceden PIP uygulanmış olmak zorunlu değil ama mahkemede çok güçlü delil. UpCore PIP iş akışı tüm süreci belgeler: yazılı plan + çalışanın imzası + düzenli check-in\'ler + sonuç. Feshe giderse dosya elinizde.',
    },
    {
      q: 'SAP SuccessFactors Performance ile farkı?',
      a: 'SuccessFactors formları güzeldir ama: OKR ayrı lisans, 360° eklenti, bias denetimi yok, Türkçe değerlendirme formları eksik. Oracle Performance Management benzer — Goals + 360 + 9-box ayrı modüller. UpCore\'da hepsi dahili. Yıllık maliyet de kıyasla 1/10.',
    },
  ],
  relatedModules: [
    { slug: 'surdurme', title: 'Tükenmişlik Ölçümü', desc: 'BAT-TR ≠ performans · ama performans düşüşü başlarsa uyarı' },
    { slug: 'gelistirme', title: 'Güçlü Yanlar', desc: 'VIA güçleri performans değerlendirmesinde "gelişim alanı" kısmına besler' },
    { slug: 'yerlestirme', title: 'Kariyer Yolu', desc: '9-kutu sonrası yerleştirme kararları · succession havuzu' },
  ],
};

export default function PerformansPage() {
  return <ModulePage content={content} />;
}
