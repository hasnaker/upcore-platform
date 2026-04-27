import type { Metadata } from 'next';
import { ArrowLeftRight } from 'lucide-react';
import { ModulePage, type ModuleContent } from '@/components/marketing/ModulePage';

export const metadata: Metadata = {
  title: 'Yerleştirme · Şirket İçi Yetenek Hareketini Görün · UpCore',
  description:
    'Boşalan bir pozisyonu şirket dışından aramak 6 kat pahalı · UpCore Yerleştirme mevcut çalışanlarınızda "bu pozisyona kim uygun, ne zaman hazır olur" sorusunun cevabını verir. Belediye 657 kadro, holding multi-entity, tech scale-up için.',
};

const content: ModuleContent = {
  category: 'yerlestirme',
  title: 'Şirket içi yetenek hareketini görün',
  tagline:
    'Satış Müdürünüz emekli oluyor, yerine kimi koyacaksınız? Bu karar bazen günlerce toplantı alır, sonunda "en iyi gördüğümüz" bir kişi seçilir — çoğu zaman yanlış. UpCore Yerleştirme, tüm kritik pozisyonlar için "şimdi hazır", "1 yıl sonra hazır", "2 yıl sonra hazır" şeklinde yedek haritası tutar. Veri konuşur, tahmin değil.',
  icon: ArrowLeftRight,
  accent: '#0EA5E9',
  heroStats: [
    { value: '6 kat', label: 'Dış alıma göre daha ucuz iç yerleştirme' },
    { value: '+%18', label: 'İç alınanların 2 yıl kalma oranı' },
    { value: '−%60', label: 'Pozisyon doldurma süresi' },
    { value: '%89', label: 'Kritik pozisyonun yedeği hazır' },
  ],
  intro:
    "Gartner\'ın 2024 araştırması şunu gösteriyor: bir pozisyonu dışarıdan doldurmak ortalama ₺85.000\'e mal oluyor (ilan + aday testi + onboarding + yanlış alım riski). Aynı pozisyonu şirket içinden doldurmak ₺14.000 · üstüne o çalışan %18 daha uzun süre kalıyor. Ama çoğu Türk şirketinde iç yerleştirme manuel: yönetici \"bence Ahmet uygun\" der, İK onaylar, olur. Bazen olur, bazen olmaz. UpCore Yerleştirme bu süreci bilimsel hale getirir: kritik pozisyonları tanımlarsınız, sistem her pozisyon için 3-5 yedek çalışan önerir (hazırlık seviyesine göre), kariyer yollarını şeffaf gösterir — çalışan \"ben 2 yıl sonra müdür olabilmek için neyi geliştirmem gerek?\" sorusunun cevabını kendisi görür.",
  features: [
    {
      title: 'Kritik pozisyonlar haritası',
      desc: 'Şirkette 40 pozisyon kritik (genelde toplam pozisyonların %15\'i) — "bu kişi ayrılırsa iş aksar" diye tanımlanan roller. İK + CHRO birlikte belirler · her birinin sahibi + yedekleri + risk seviyesi bir tabloda görünür. Güncel kalır, statik PowerPoint değildir.',
    },
    {
      title: 'Her pozisyon için yedek havuzu (3-5 kişi)',
      desc: 'Her kritik pozisyon için 3-5 kişilik yedek havuzu oluşturulur · "Şimdi Hazır", "1 Yıl Sonra Hazır", "2 Yıl Sonra Hazır" olmak üzere 3 seviyede sınıflandırılır. Bir çalışan birden fazla pozisyonun havuzunda olabilir (en fazla 3 · yoksa odak kaybolur).',
    },
    {
      title: 'Hazırlık durumu — objektif kriterler',
      desc: 'Bir kişinin "Şimdi Hazır" olması ne demek? Sistem şunlara bakar: hedef pozisyonla iş-aday uyumu 75+ skor + gerekli minimum kıdem + son performans değerlendirmesi "üzerinde" veya "çok üzerinde" + gerekli eğitim/sertifika tamam. 4 kriter de tutuyorsa yeşil, kısmi ise sarı, tutmuyorsa kırmızı.',
    },
    {
      title: '9-kutu değerlendirme (Nine-box)',
      desc: 'McKinsey\'nin 1970\'lerde geliştirdiği klasik: "Performans × Potansiyel" matrisi · 3x3 = 9 kutucuk. Çalışanlar "yıldız" (yüksek perf + yüksek potansiyel), "çekirdek" (orta perf + orta potansiyel), "risk" (düşük perf + düşük potansiyel) gibi kategorilere yerleşir. Toplantı modu var — 3 yönetici + 1 İK birlikte kalibrasyon yapar, audit log\'da kim ne dedi kayıtlıdır.',
    },
    {
      title: 'İç ilan marketplace — çalışan kendisi görür',
      desc: 'Açılan her pozisyon önce 15 gün iç marketplace\'te yayınlanır · çalışanlar başvurabilir (isterlerse yöneticileri haberdar olmadan · "gizli başvuru" seçeneği). Sistem adayı uyum skoruyla değerlendirir. Dışarıya ilan ancak iç başvurular tükenirse verilir · bu kültür değişikliği uzun vadede büyük.',
    },
    {
      title: 'Kariyer yolu — "ben nereye gidebilirim?"',
      desc: 'Çalışan kendi panelinde kariyer yolunu görür: "Junior Developer → Mid Developer (2 yıl) → Senior Developer (3-4 yıl) → Teknik Lider (2 yıl sonrası)". Her kademe için gereksinimler açık: "Senior olmak için: 5 yıl kıdem + teknik sertifika + 2 projede sorumluluk". Çalışan kendi yolunu takip eder, motivasyon artar.',
    },
    {
      title: 'Rotasyon iş akışı',
      desc: 'Bir çalışan başka departmana rotasyon isterse: önerir → mevcut yönetici onaylar → hedef yönetici onaylar → İK kontrol eder (minimum 180 gün mevcut pozisyonda, son rotasyondan 365 gün geçmiş mi) → aktif olur. Her şey tek platformda, e-posta trafiği yok.',
    },
    {
      title: 'Emeklilik ve ayrılma risk tahmini',
      desc: 'Kritik pozisyonun sahibi 2 yıl sonra emekli olacak — şimdiden yedek hazırlanmalı. Sistem hem yaş-bazlı emeklilik tahmini yapar hem de "bu kişi son 6 ayda istifa etme işareti gösteriyor mu?" sorusunu cevaplar. Tümü otomatik, İK\'nın dikkatine sunulur.',
    },
    {
      title: 'Yönetici paneli',
      desc: 'Yönetici kendi ekibinin succession haritasını görür: "ekibim 10 kişi, kimin potansiyeli yüksek, kim hangi pozisyona hazır, kim bir yıl sonra istifa riski yüksek". 1-1\'lerde kariyer konuşmalarına hazır girer.',
    },
    {
      title: 'CHRO board raporu',
      desc: 'Board toplantılarında CHRO her çeyrek şu rakamı verir: "Kritik 40 pozisyonun %89\'u için \'Şimdi Hazır\' yedek var". Bu rakam yönetim kurulunun en sevdiği: şirket yetenek açısından "gideceğim, boşluk olacak" krizine ne kadar hazır?',
    },
  ],
  workflow: [
    {
      step: '01',
      title: 'Kritik pozisyonları tanımla',
      desc: 'CHRO + İK birlikte · tüm pozisyonların yaklaşık %15\'i (örn: 500 pozisyonlu şirkette 75) · "bu kişi ayrılırsa iş aksar" kriteriyle.',
    },
    {
      step: '02',
      title: 'Her pozisyon için incumbent değerlendirme',
      desc: 'Mevcut sahibi: performansı, potansiyeli, emeklilik/ayrılma riski değerlendirilir · "kilit kişi" mi, yoksa "değiştirilebilir" mi?',
    },
    {
      step: '03',
      title: 'Yedek havuzu oluştur',
      desc: 'Her pozisyon için 3-5 aday · iş-aday uyum skoruna göre sıralanır · hazırlık seviyesi: Şimdi Hazır / 1 Yıl / 2 Yıl.',
    },
    {
      step: '04',
      title: 'Çeyreklik 9-kutu kalibrasyon',
      desc: 'Her 3 ayda bir: yöneticiler + İK birlikte çalışanları 9 kutucuğa yerleştirir · toplantı modu · audit log.',
    },
    {
      step: '05',
      title: 'Gelişim planı · Geliştirme modülü ile entegre',
      desc: '"1 Yıl Sonra Hazır" olanlara: rotasyon + koçluk + eğitim · Geliştirme modülünden otomatik plan oluşur.',
    },
    {
      step: '06',
      title: 'Pozisyon açılırsa: otomatik öneri',
      desc: 'Biri ayrıldı, pozisyon boşaldı · sistem hemen "bu havuzdan şu 3 kişi \'Şimdi Hazır\'" önerir · mülakat süreci çok kısalır.',
    },
  ],
  outcomes: [
    { metric: 'İç işe alım oranı', value: '%65', desc: 'Tüm pozisyon doldurmanın %25 → %65\'i şirket içinden' },
    { metric: 'Pozisyon doldurma süresi', value: '11 gün', desc: 'Dışarıdan 28 gün sürüyordu · %60 hızlandı' },
    { metric: 'Kritik pozisyon yedek doluluğu', value: '%89', desc: '40 kritik pozisyonun 36\'sı "Şimdi Hazır" yedekli' },
  ],
  comparison: [
    {
      feature: 'Kariyer yolu çalışana gösterme',
      upcore: 'Çalışanın kendi panelinde · şeffaf',
      others: 'PDF PowerPoint · yönetici paylaşır',
    },
    {
      feature: 'Yedek uygunluk skoru',
      upcore: 'Otomatik iş-aday uyum skoru',
      others: 'Manuel tahmin · "bence uygun"',
    },
    {
      feature: '9-kutu kalibrasyon',
      upcore: 'Toplantı modu + audit log',
      others: 'Excel · kim kararını verdi bilinmez',
    },
    {
      feature: 'İç ilan marketplace',
      upcore: 'Gizli başvuru seçeneği var',
      others: 'E-posta duyuru · çalışan utanır',
    },
    {
      feature: 'Emeklilik/ayrılma riski tahmini',
      upcore: 'Yapay zeka tahmini · şeffaf',
      others: 'Yönetici hissiyatı',
    },
    {
      feature: '657 kadro/kademe/derece desteği',
      upcore: 'Yerleşik · belediye için özel',
      others: 'Yok veya özel geliştirme',
    },
  ],
  instruments: [
    'İş-Aday Uyum Skoru · Kazanım modülünden gelir',
    'Nine-box · McKinsey 1970s · dünya standardı',
    'VIA karakter güçleri · Geliştirme modülünden',
    'Psikolojik dayanıklılık · HERO · Geliştirme modülünden',
  ],
  useCases: [
    {
      segment: 'Belediye CHRO',
      scenario:
        'Fatih Bey belediyede 15 daire başkanı pozisyonu var · her yıl 2-3 tanesi boşalıyor (emeklilik, ayrılma, siyasi değişim). Eskiden son dakikada atamalar yapıyor · yanlış seçim olunca tüm daire çalkalanıyordu. UpCore ile 15 pozisyonun tamamı için 3\'er yedek havuzu oluşturdu · 657 kadro yapısıyla uyumlu · kademe/derece otomatik takip ediliyor. Son 18 ayda yapılan tüm atamalar önceden hazır havuzdan çıktı, başarısızlık oranı %0.',
    },
    {
      segment: 'Holding CFO',
      scenario:
        'Ayşe Hanım 18 şirketli holdingde CFO · yıllık bütçede "önümüzdeki yıl kaç kişi dışarıdan almamız gerekecek?" sorusuna cevap veremiyordu. UpCore yerleştirme ile artık rakam çıkıyor: "Kritik pozisyonlar için 3 dış alım yeterli, diğer 22 için iç yerleştirme planı hazır". İK bütçesi %40 azaldı · finansal planlama öngörülebilir hale geldi.',
    },
    {
      segment: 'Mühendis çalışan',
      scenario:
        'Can Bey tech şirketinde Mid Level Backend Developer · "Senior olmak istiyorum ama nasıl?" sorusunun cevabını bulamıyordu. UpCore\'da kendi panelini açınca gördü: Senior olmak için "2 yıl kıdem daha + teknik sertifika (AWS) + 2 projede sorumluluk" gerekiyor. Şu an 10 aylık kıdemi var, sertifika sınav için referans aldı. 2 yıl sonra Senior olduğunda yöneticisi "hak ettin" dedi.',
    },
  ],
  faq: [
    {
      q: 'Nine-box kalibrasyon adil mi? Yönetici favori çalışanını yüksek kutuya koymaz mı?',
      a: 'Tamamen adil hiçbir sistem yok, ama biz 3 önlem aldık. (1) Kalibrasyon toplantısı zorunlu — en az 3 yönetici + 1 HRBP birlikte olmadan bir çalışan tek başına yerleştirilmez. (2) Audit log — "Bu çalışanı neden yüksek performansa yerleştirdiniz?" sorusuna kaydedilen gerekçe vardır. Sonradan sorgulanabilir. (3) Otomatik bias denetimi — cinsiyet/yaş/departman bazında yerleştirmelerde sistematik fark varsa alarm verir. Mahkeme sürecinde tam trail sunulabilir.',
    },
    {
      q: 'Yedek havuzundaki çalışan bu durumu biliyor mu?',
      a: 'İki seçenek var, şirket karar verir: (1) Gizli mod (varsayılan): aday kendisinin succession havuzunda olduğunu bilmiyor · sadece üst yönetim + İK görüyor · hazırlık sürecini dışarıdan fark etmeden yaşar. (2) Açık mod: aday kendisi yedek olduğunu + hangi pozisyon için olduğunu + nelere geliştirmesi gerektiğini görüyor · bu durumda motivasyon artıyor ama bekleyişe girme riski var. Her şirket kendi kültürüne göre seçer · sözleşmeyle belirlenir.',
    },
    {
      q: '"Rotasyon cooldown 365 gün" neden? Sürekli rotasyon kötü mü?',
      a: 'Sürekli rotasyon verimliliği düşürür. Araştırmalar (Lawrence 2011 meta-analizi) gösteriyor: bir çalışan yeni rolde 9-12 ay sonra "gerçekten üretken" hale geliyor. Daha kısa rotasyonlar sürekli "yeni başlayan" konumunda tutuyor. 365 gün cooldown bu için · şirket kendine göre 180-730 gün arası ayarlayabilir. İstisna: acil durum rotasyonu (performans sorunu, kişisel durum) her zaman mümkün.',
    },
    {
      q: '657 kadro yapısı ile nasıl uyumlu?',
      a: 'Belediye için özel konfigürasyon yapıyoruz: (1) Kadro derece/kademe otomasyonu — her yılın sonunda çalışanın derece/kademe hareketi sistemde · (2) Hizmet puanı hesaplama — her pozisyon için objektif kriter · (3) Devlet Personel Başkanlığı sınav sonuçlarıyla entegrasyon · (4) Sözleşmeli-memur geçiş onayları — kanun zorunlu belgeler otomatik üretilir. Samsun Büyükşehir pilotunda üretimde çalışıyor.',
    },
    {
      q: 'Oracle HCM "Talent Review" modülü ile farkı ne?',
      a: 'Oracle\'da Nine-box var ama temelde Excel\'i güzelleştirilmiş hali · audit log sınırlı · bias denetimi yok · kalibrasyon toplantısı için ayrı PowerPoint hazırlanır · çalışan kendi yolunu göremez. Üstelik kariyer yolu görselleştirme ayrı bir modül olarak alınır (Career Development Planning, yıllık ekstra maliyet). UpCore\'da: Nine-box + kariyer yolu + yedek havuzu + rotasyon workflow + 657 kadro hepsi dahil, tek platform. Bir holding müşterimiz Oracle\'da 3 yıl boyunca tam kullanamadığı modülü bizde 4 ayda üretime aldı.',
    },
    {
      q: '"Pozisyon açılırsa 3 yedek önerir" dediniz — yanılma payı?',
      a: 'Sistem önerir, karar veren İK + yönetici. Önerilen her aday için "neden önerildi" açıkça yazar: iş-aday uyum skoru 82 + gerekli kıdem tamam + son performans "üzerinde" + ekipte kalma isteği anketinde yüksek. Bu rasyoneli görerek İK/yönetici kabul veya reddeder. Öneri kara kutu değil, istatistiksel sıralamadır.',
    },
    {
      q: 'Çalışan "senior olmak için 2 yıl kıdem lazım" gördüğünde 2 yıl tamamlanınca garantili terfi bekler mi?',
      a: 'Bu önemli bir yönetim riski. Çözüm: sistem "2 yıl kıdem + sertifika + 2 proje sorumluluğu + performans \'üzerinde\' son 2 yıl" gibi net kriterler sunar · çalışan sadece kıdem tamamlayarak otomatik terfi beklemez. Ayrıca kariyer yolu görünümünde çalışana "Bu gereksinimler zorunlu ama yeterli değil — pozisyon açılması + yönetici değerlendirmesi + şirket ihtiyacı da gerek" uyarısı görünür. Çalışan sözleşmesi de buna göre yazılır.',
    },
  ],
  relatedModules: [
    {
      slug: 'kazanim',
      title: 'Kazanım',
      desc: 'İç + dış adaylar aynı sistemde · iş-aday uyum skoru paylaşımı',
    },
    {
      slug: 'gelistirme',
      title: 'Geliştirme',
      desc: '"1 Yıl Sonra Hazır" adaylar için VIA + PsyCap bazlı gelişim planı',
    },
    {
      slug: 'surdurme',
      title: 'Sürdürme',
      desc: 'Tükenmiş çalışan için bazen en iyi çözüm rotasyon · BAT-TR trendi',
    },
  ],
};

export default function YerlestirmePage() {
  return <ModulePage content={content} />;
}
