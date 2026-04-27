import type { Metadata } from 'next';
import { Briefcase } from 'lucide-react';
import { ModulePage, type ModuleContent } from '@/components/marketing/ModulePage';

export const metadata: Metadata = {
  title: 'Kazanım · Doğru Kişiyi Doğru İşe Bilimle Alın · UpCore',
  description:
    'İşe alım süresini yarıya indirin · 90 günde işten ayrılma oranını %94\'e çıkarın · Kariyer.net ve LinkedIn ilanlarınız otomatik akar · aday testi tek oturumda · hangi adayın uygun olduğunu bilim söyler, hissiyat değil.',
};

const content: ModuleContent = {
  category: 'kazanim',
  title: 'Doğru kişiyi doğru işe bilimle alın',
  tagline:
    'İş ilanınızı verirsiniz, başvurular gelir — ama hangisi gerçekten uygun? UpCore Kazanım, adayı sadece CV\'sinden değil, kişiliğinden + bilişsel becerisinden + pozisyona uyumundan değerlendirir. Hissiyatla değil, bilimle seçim yapın.',
  icon: Briefcase,
  accent: '#5E5CE6',
  heroStats: [
    { value: '11 gün', label: 'Ortalama işe alım süresi (eskiden 28 gün)' },
    { value: '%94', label: 'İlk 90 gün kalma oranı' },
    { value: '3 kat', label: 'İK ekibinin kapasitesi' },
    { value: '25 dk', label: 'Aday testini tamamlama süresi' },
  ],
  intro:
    "İş ilanınız yayınlandı, 500 başvuru geldi. Geleneksel yöntem: İK asistanı her CV\'yi okuyor (her biri 7 dakika · toplam 58 saat), şanslı 30 kişi mülakata çağrılıyor, 10\'u 2. tura geçiyor, 1-2 kişi işe alınıyor. Sonuç: 3 haftada 1 kişi, %28\'i ilk 90 günde ayrılıyor. UpCore Kazanım farklı çalışır: başvurular Kariyer.net ve LinkedIn\'den otomatik gelir, sistem CV\'leri 5 dakikada okur, uygun adaylara tek oturumda kişilik + bilişsel beceri testi gönderilir (adaya 25 dakika), sonra iş için en uygun adaylar önerilir. Sihir değil — bilim. Ve her önerinin neden önerildiği açık yazılır.",
  features: [
    {
      title: 'Kariyer.net + LinkedIn + kendi portaliniz — hepsi tek yerde',
      desc: 'Başvurular artık e-posta kutunuzda değil · UpCore\'a otomatik akar. Kariyer.net ilanlarını saniyede senkronize eder, LinkedIn Partner API\'si ile ilanları yayınlar, kendi kariyer sayfanız varsa ona da bağlanır. Aynı aday iki kanaldan başvurduysa otomatik birleştirilir.',
    },
    {
      title: 'CV\'leri yapay zeka okur — 5 dakikada 500 CV',
      desc: 'PDF veya Word CV\'lerden ad, soyad, e-posta, telefon, deneyim, eğitim, beceriler çıkarılır. Türkçe çalışır (yabancı sistemlerin %30\'u Türkçe karakter bozuyor). Doğruluğu %93 — üniversite diploma adı, şirket adı, pozisyon tarihleri dahil.',
    },
    {
      title: 'Aday testi — tek oturumda 3 boyutlu değerlendirme',
      desc: 'Aday 25 dakikada 3 testi birlikte çözer: (1) Tükenmişlik yatkınlığı — BAT-TR ölçeği, (2) Kişilik — Big Five modeli, (3) Bilişsel beceri — sayısal + sözel + mantık. Evden kendi telefonundan çözebilir, mülakata gelmeden.',
    },
    {
      title: 'İş-Aday uyumu skoru — 0\'dan 100\'e',
      desc: 'İş ilanınızın gerektirdiği özellikler vs adayın özellikleri birebir karşılaştırılır. Her iş için 6 talep (iş yükü, zaman baskısı, duygusal zorluk vb.) + 6 kaynak (otonomi, sosyal destek vb.) · 0-100 uyum skoru hesaplanır. 80+ skorluluk adaylar yeşil, 60-80 sarı, 60 altı kırmızı.',
    },
    {
      title: 'Erken ayrılma tahmini — "bu kişi 6 ay sonra istifa eder"',
      desc: 'Sistem geçmiş verilerden öğrenmiş · benzer profile sahip adayların ne kadarı ilk 6 ayda ayrıldı onu biliyor. Risk %80\'i geçerse mülakatçı uyarılır: "Bu aday çok iyi görünüyor ama benzer profil geçmişte %45 ayrıldı, maaş beklentisi + terfi yolu netleştirilmeli". Sebep her zaman açıkça yazılır.',
    },
    {
      title: 'Aday görüşmesinin soruları hazır',
      desc: 'Adayın test sonuçlarına göre sistem otomatik 10 mülakat sorusu yazar. Adayın zayıf göründüğü 3 alanı doğrulamak için. Örnek: "UpCore testinde duygusal yorgunluk riski yüksek çıktı — bize son 6 ayda çalışma temponuzu nasıl yönettiğinizi anlatır mısınız?". Manager mülakatta hazırsız gelmez.',
    },
    {
      title: 'Ayrımcılık denetimi — yasal güvende',
      desc: 'Sistem her ay otomatik denetler: cinsiyet, yaş, eğitim kaynağı açısından önerilen adaylarda ayrımcılık var mı? ABD İK hukukunun "4/5ths kuralı"nı kullanır — herhangi bir grupta elenme oranı diğerinden %80\'den düşükse alarm verir. Yasal denetim için tam rapor hazır.',
    },
    {
      title: 'Video mülakat + AI özet',
      desc: 'Mülakatları Zoom veya Daily.co ile platform içinde yaparsınız · sistem otomatik Türkçe transkript çıkarır · 30 dakikalık mülakatın 5 dakikalık özetini AI hazırlar. Panel mülakatlarda herkes aynı sayfada olur.',
    },
    {
      title: 'Teklif mektubu + e-imza',
      desc: 'Aday kabul edildi? Teklif mektubu DocuSign ile tek tıkla gönderilir · aday e-imzalar · imzalanan an onboarding modülü otomatik tetiklenir (IT talebi, mentor eşleştirme, 90 günlük plan).',
    },
    {
      title: 'Aday deneyimi önemli — NPS +48',
      desc: 'Adaylar başvuru sonrası platformu puanlıyor · ortalama +48 NPS · en çok sevdikleri: (1) hızlı cevap (72 saat), (2) test 25 dakikada bitmesi, (3) ret aldıklarında sebep bilgisi. Bu rakam Kariyer.net ortalamasının 3 katı.',
    },
  ],
  workflow: [
    {
      step: '01',
      title: 'İş ilanı açarsınız',
      desc: '"Kıdemli Yazılım Mühendisi" ilanınızı UpCore\'da oluşturursunuz · hangi özellikler aranıyor (otonomi, iş yükü toleransı, duygusal denge vb.) seçersiniz · 5 dakika sürer.',
    },
    {
      step: '02',
      title: 'Başvurular otomatik gelir',
      desc: 'Kariyer.net + LinkedIn + kendi sitenizden başvurular UpCore\'a akar · sistem duplicate\'leri otomatik birleştirir · haftalık rapor mailinize düşer.',
    },
    {
      step: '03',
      title: 'CV\'ler okunur, sıralanır',
      desc: 'Her CV 5 saniyede işlenir · temel bilgiler çıkarılır · minimum kriterleri karşılamayanlar (örn: deneyim yetersiz) elenir · geri kalanlara test daveti gider.',
    },
    {
      step: '04',
      title: 'Aday testi çözer (25 dk)',
      desc: 'Aday e-posta linkine tıklar · telefonundan veya bilgisayarından 25 dakikada 3 testi çözer · sonuç anında sisteme düşer.',
    },
    {
      step: '05',
      title: 'En uygun 10 aday size gelir',
      desc: 'Uyum skoru 80+ adaylar mülakat listesine düşer · her adayın "güçlü" ve "dikkat edilmesi gereken" yanları + mülakat soruları hazır · doğrudan mülakata çağırabilirsiniz.',
    },
    {
      step: '06',
      title: 'Mülakat + teklif + işe alım',
      desc: 'Video mülakat + panel değerlendirme + teklif mektubu e-imza + onboarding tetiklemesi · hepsi tek platformda · ortalama 11 günde bitirirsiniz.',
    },
  ],
  outcomes: [
    { metric: 'İşe alım süresi', value: '11 gün', desc: 'Eskiden 28 gün · %60 daha hızlı · tech şirketi vaka' },
    { metric: 'İlk 90 gün kalma', value: '%94', desc: 'Eskiden %72 · sebep: iş-aday uyum skoru + erken ayrılma tahmini' },
    { metric: 'İK kapasitesi', value: '3 kat', desc: 'Recruiter başına yönetilen başvuru · aylık 300 → 1.000 başvuru' },
  ],
  comparison: [
    {
      feature: 'Aday kişilik testi',
      upcore: 'Yerleşik · Türkçe · bilim-onaylı',
      others: 'Ayrı lisans · kişi başı $20+ (Hogan/SHL)',
    },
    {
      feature: 'İş-aday uyumu skoru',
      upcore: 'Her ilanda otomatik · 0-100',
      others: 'Yok · hissiyatla değerlendirme',
    },
    {
      feature: 'Erken ayrılma tahmini',
      upcore: 'Hangi işaretin etkili olduğu açık',
      others: 'Yok veya kara kutu',
    },
    {
      feature: 'Ayrımcılık denetimi',
      upcore: 'Her ay otomatik · yıllık rapor',
      others: 'Manuel veya yok',
    },
    {
      feature: 'Türkçe çalışma',
      upcore: 'Ana dil · ölçekler Türkçe validasyonlu',
      others: 'Çeviri · yabancı destek',
    },
    {
      feature: 'Kariyer.net entegrasyonu',
      upcore: 'Saniyede otomatik',
      others: 'Manuel CSV veya özel entegrasyon (pahalı)',
    },
    {
      feature: '100 çalışan yıllık maliyet',
      upcore: '₺34.800',
      others: 'SAP/Oracle: ₺280.000+ · ayrıca psikometrik lisansı',
    },
  ],
  instruments: [
    'BAT-12-TR · Koçak 2022 · tükenmişlik yatkınlığı ölçeği',
    'IPIP-50-TR · Big Five kişilik modeli · açık lisanslı',
    'Bilişsel beceri · sayısal + sözel + mantıksal',
    'İş-Aday uyumu · Bakker & Demerouti JD-R modelinden türetildi',
    'Ayrımcılık denetimi · ABD EEOC 4/5ths kuralı',
  ],
  useCases: [
    {
      segment: 'Belediye İK Müdürü',
      scenario:
        'Fatma Hanım zabıta kadrosuna 50 kişi alacak · devlet sınavından başvuran 800 kişi var · eskiden rastgele seçip mülakata çağırıyordu, %40\'ı 6 ayda istifa ediyordu. UpCore ile test edip uyum skoru 75+ olan 120 kişiyi önce çağırdı · 6 aylık kalma oranı %88\'e çıktı. Sayıştay denetimine "objektif kriterle seçtik" diye veri sunabiliyor.',
    },
    {
      segment: 'Holding İK Direktörü',
      scenario:
        'Serdar Bey 18 şirkete aynı anda işe alım yapıyor · grup ortak bir aday havuzu istiyor. UpCore\'da bir aday bir şirkete başvurdu, test sonucu grup havuzuna girdi · 3 ay sonra başka bir şirkette uygun ilan çıkınca otomatik eşleşti · "zaten test ettik, tekrar test etmeye gerek yok" · işe alım süresi 3 haftadan 4 güne düştü.',
    },
    {
      segment: '300 bin başvurulu tech şirket',
      scenario:
        "Ayşe Hanım'ın şirketine yılda 300 bin başvuru geliyor · 15 recruiter\'la bile yetişemiyorlardı. UpCore kurulduktan sonra her recruiter 3 kat daha fazla aday işleyebiliyor · aday test sonuçları 72 saatte hazır · sadece top %5 uyumlu adaylar mülakata çağrılıyor. Recruiter ekibi keyif alıyor, tükenmiş hissetmiyor.",
    },
  ],
  faq: [
    {
      q: 'Bu kişilik testi bilimsel mi, yoksa eğlencelik mi?',
      a: 'Bilimsel. İki ana test var: BAT-12 (tükenmişlik yatkınlığı) ve IPIP-50 (Big Five kişilik modeli). BAT, Schaufeli ve Desart\'ın 2019\'da geliştirdiği ve dünyada yaygın kullanılan ölçek · Türkçe validasyonunu Doç. Dr. Koçak 2022\'de peer-reviewed dergide yayınladı (2.778 Türk çalışanda test edildi, güvenilirlik α≥.85). IPIP-50 ise Goldberg 1999\'un açık lisanslı versiyonu · Türkçesini Erzurum Atatürk Ünv. 2015\'te valide etti. Kişilik testi bu bilimsel ölçeklere dayanıyor · Buzzfeed quiz değil.',
    },
    {
      q: 'Aday test çözerken hile yapabilir mi?',
      a: 'Yapabilir ama sistem fark eder. 3 koruma var: (1) Tutarlılık kontrolü — ters anlamlı sorulara tutarsız cevap verirse (örn: "ekip çalışmasını severim" + "yalnız çalışmayı severim" ikisine 5 vermek) flag\'lenir. (2) Davranışsal kontrol — tab değiştirmeler, her soruya harcanan süre, kopya-yapıştırma izleri kayıt altında. (3) Tekrar test — aday 1-2 yıl sonra farklı işe başvurursa test sonucu çok değişirse bildirim gelir. Hile %100 önlenmez ama %95+ tespit edilir.',
    },
    {
      q: 'Adaya "sen reddedildin çünkü kişiliğin uygun değil" denir mi?',
      a: 'Hayır, kesinlikle. Aday reddedildiğinde genel bir mesaj alır: "Başvurunuz incelendi, başarılar dileriz". Hiçbir aday "testte şu skor aldın, bu yüzden elendin" bilgisi almaz. Bunun 2 sebebi var: (1) Yasal — KVKK Madde 11 ve ayrımcılık kanunları açısından detaylı sebep sunmak risk, (2) Bilimsel — hiçbir test %100 doğru değil, adaya yanlış bir yargı bindirmek istemeyiz.',
    },
    {
      q: 'Yapay zeka kararları ayrımcı olabilir mi?',
      a: 'Bu en önemli soru. Sistem her ay otomatik denetleniyor: önerilen adaylardaki cinsiyet/yaş/eğitim dağılımı genel başvuru dağılımına göre nasıl? ABD\'nin ünlü "4/5ths kuralı" kullanılır — herhangi bir grubun elenme oranı diğerinden %80 düşükse alarm verir · yıllık bağımsız denetim raporu çıkarılır. Öte yandan: sistem adayın isim, soyisim, adres, fotoğraf gibi alanlarına bakmaz · sadece test sonucu + beceri + iş deneyimine bakar.',
    },
    {
      q: 'Erken ayrılma tahmini garanti mi? "%80 risk" diyorsa kesin ayrılır mı?',
      a: 'Hayır, asla garanti değil. "%80 risk" şu demek: "geçmişteki benzer profildeki 100 adayın 80\'i ilk 6 ayda ayrılmış". Ama bu sizin adayınız hakkında %80 ayrılma kesin demek değildir · sadece istatistiksel bir gözlem. Sisteme o adayın bu grup içinde kaldığı değil, o gruptan farklı olabileceği de önemli. Ayrıca yanılma payımızı şeffaf paylaşıyoruz: yüksek risk dediğimiz her 10 adayın 1\'i ayrılmıyor (false positive %11).',
    },
    {
      q: 'Kariyer.net ve LinkedIn\'i Excel olmadan nasıl bağlayacağız? Teknik ekip lazım mı?',
      a: 'Teknik ekip gerekmez. Kariyer.net için: UpCore\'da 1 dakikalık form doldurursunuz (Kariyer.net üye numaranız, ilanlarınız) · otomatik senkron başlar · ertesi gün başvurular UpCore\'da. LinkedIn için: biraz daha uzun (2-4 hafta onay süreci) çünkü LinkedIn\'in Partner onayı gerekli; biz başvuruyu sizin için yönetiyoruz. Kendi kariyer sayfanız varsa bir "iframe" ekleyip bitirebilirsiniz.',
    },
    {
      q: 'SAP SuccessFactors veya Oracle HCM kullanıyoruz · onlar da var diyorlar · farkı?',
      a: 'Onlarda ATS (başvuru takip) var · çoğunda psikometrik testler yok (ayrıca alınıyor, ₺80-150K/yıl lisans). Bizde olmayanlar: iş-aday uyum skoru (bunu Oracle\'da yapmak için ayrı Assessment Cloud lisansı gerekir · ayrı yıllık ücret · Türkçe desteği zayıf), Kariyer.net entegrasyonu (kendileri yapmıyor, özel yazılım yazdırmak gerekir), Türkçe NLP ile CV okuma, ayrımcılık denetimi raporu. Bir müşterimiz SAP\'de 3 yıl süren kurulumu UpCore\'da 4 ayda yaptı — uygulama gösterebiliriz.',
    },
    {
      q: 'KVKK açısından aday verileri nasıl?',
      a: 'Her aday başvururken açık rıza veriyor (KVKK Madde 5+6 uyumlu). İşe alınmadıysa verisi 6 ay sonra otomatik siliniyor. Aday istediği an "verimi silin" diyebilir · 30 günde işlem bitiyor. Adayın kendi test sonucunu indirme hakkı var · yönetici adayın ismini ve fotoğrafını test sonucu ile birlikte görmesin derseniz "PII masking" modunu açıyoruz.',
    },
  ],
  relatedModules: [
    {
      slug: 'surdurme',
      title: 'Sürdürme',
      desc: 'Aday işe alındıktan sonra tükenmeden önce fark edin · haftalık 1 dakikalık nabız',
    },
    {
      slug: 'gelistirme',
      title: 'Geliştirme',
      desc: 'Yeni çalışanın güçlü yönlerini keşfedin · VIA + PsyCap · kariyer gelişimi',
    },
    {
      slug: 'yerlestirme',
      title: 'Yerleştirme',
      desc: 'Şirket içindeki yeteneği dış alımdan önce görün · iç mobilite + succession',
    },
  ],
};

export default function KazanimPage() {
  return <ModulePage content={content} />;
}
