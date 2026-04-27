import type { Metadata } from 'next';
import { Flame } from 'lucide-react';
import { ModulePage, type ModuleContent } from '@/components/marketing/ModulePage';

export const metadata: Metadata = {
  title: 'Sürdürme · Çalışanınız Tükenmeden Önce Fark Edin · UpCore',
  description:
    'Çalışanınızın istifa dilekçesini görmeden 3 ay önce fark edin. Haftada 1 dakikalık anonim anket, departman bazlı renkli harita, yapay zeka ile erken uyarı. Belediye, holding, tech şirketi için üretimde.',
};

const content: ModuleContent = {
  category: 'surdurme',
  title: 'Çalışanınız tükenmeden önce fark edin',
  tagline:
    'Bir çalışan istifa dilekçesini yazdığında zaten 3-6 ay öncesinden kararını vermiştir. UpCore Sürdürme, bu sinyali ilk hafta yakalar — haftada 1 dakikalık anonim anketle, bilim-temelli bir ölçekle, departman bazlı renkli haritada.',
  icon: Flame,
  accent: '#DC2626',
  heroStats: [
    { value: '1 dk/hafta', label: 'Çalışan başına harcanan süre' },
    { value: '%72', label: 'Çalışanlar anketi dolduruyor' },
    { value: '−%22', label: '6 ayda istifa oranı düşüşü' },
    { value: '8 hafta', label: 'İlk iyileşme görünür' },
  ],
  intro:
    "Çoğu şirket yılda bir kez \"memnuniyet anketi\" yapar — 200 soru, 45 dakika, herkes sıkılır, yarısı yalan cevaplar, sonuçlar 3 ay sonra raporlanır. İstifalar zaten olmuştur. UpCore farklı çalışır: her Pazartesi çalışana 1 dakikalık 12 soru gönderir, anonim kalır (yönetici kimin ne cevapladığını asla göremez), sonuçları haftalık olarak departman bazlı renkli bir haritada gösterir. Kırmızı bir ekip görünce ne yapacağınızı da söyler — bilimsel araştırmalarda işe yaradığı kanıtlanmış 20+ müdahaleden önerilerle.",
  features: [
    {
      title: 'Haftalık nabız anketi — 1 dakikada biter',
      desc: 'Çalışan Pazartesi sabahı e-posta veya Slack/Teams\'ten anket alır · 12 soru · 60 saniyede tamamlanır. Anonim. Dünya çapında kullanılan BAT-12 ölçeğinin Türkçe sürümü (Koçak 2022).',
    },
    {
      title: 'Departman haritası — yeşil / sarı / kırmızı',
      desc: 'Her departmanın haftalık skoru renk kodlu bir kutucukta görünür: yeşil=iyi, sarı=dikkat, kırmızı=acil müdahale. Üzerine tıklayınca "hangi alt konu sorun" yazar (iş yükü? yönetici? rol belirsizliği?).',
    },
    {
      title: 'Yapay zeka tahmini — 6 ay öncesinden uyarı',
      desc: 'Sistem geçmiş verilerden öğrenir · hangi çalışan grubunun 6 ay içinde istifa riski yüksek olduğunu tahmin eder. Sihir değil: hangi 47 işaretten hangisinin katkı yaptığı açık yazılır (örn: "iş yükü son 3 haftada arttı + takdir azaldı").',
    },
    {
      title: 'Müdahale önerisi — "ne yapayım?" cevabı',
      desc: 'Kırmızı bir ekip gördüğünüzde "manager ile konuş" değil, somut 3 seçenek: (1) iş yükünü şu şekilde dağıt, (2) 8 haftalık Job Crafting workshop, (3) peer destek programı. Her birinin bilimsel araştırmada ne kadar işe yaradığı paylaşılır.',
    },
    {
      title: 'Yönetici bireysel skor GÖREMEZ',
      desc: 'Sözleşmemizde yazılı: yöneticiler "Ayşe\'nin bu haftaki skoru kaç?" sorusuna cevap alamaz. Sadece ekibin ortalaması görünür, o da en az 5 kişi olduğunda. Çalışan güveni burada kurulur.',
    },
    {
      title: 'Mobil uygulama + Teams + Slack',
      desc: 'Çalışan anketi mobil telefondan, Teams\'ten, Slack\'ten, WhatsApp\'tan veya e-postadan doldurabilir. Kendisine en kolay geleni seçer · 30 saniyede biter.',
    },
    {
      title: 'Bağlılık (UWES) ile birlikte',
      desc: 'Tükenmişlik madalyonun bir yüzü · diğer yüzü bağlılık. UWES-9 ölçeğiyle "çalışanlar işlerini ne kadar seviyor" da ölçülür. İki veri birlikte anlam kazanır.',
    },
    {
      title: 'Yasal güvende — KVKK uyumlu',
      desc: 'Veriler Azure Türkiye/Avrupa\'da tutulur · her çalışan kendi verisini görebilir/silebilir · yönetici erişimleri kayıt altındadır · yetkisiz erişim olursa alarm çalar.',
    },
    {
      title: 'Çağrı merkezi ve mavi yaka için özel',
      desc: 'Ofis dışı çalışanlar için: SMS ile anket · sesli yanıtlama (IVR) · kağıt anket + QR kod · belediye zabıta/temizlik çalışanları için Türkiye\'de özel olarak test edildi.',
    },
    {
      title: 'Ekip dinamikleri',
      desc: 'Sadece bireysel değil, ekip seviyesinde: "bu departmanda güven düşük", "bu şubede rol çatışması yüksek". Kaynak: COPSOQ-III Danimarka ölçeği, 40+ risk faktörü.',
    },
  ],
  workflow: [
    {
      step: '01',
      title: 'Pazartesi: çalışana 12 soruluk anket',
      desc: 'Çalışan istediği kanaldan 60 saniyede cevaplar. Hiç kimse (yönetici bile) kim ne cevapladı göremez. Yalnızca sistem hesaplar.',
    },
    {
      step: '02',
      title: 'Salı: harita otomatik güncellenir',
      desc: 'İK\'nın ekranında renkli harita hazır. Her departman yeşil, sarı veya kırmızı. Tıklayınca detay: "bu departmanda en çok duygusal tükenme artıyor".',
    },
    {
      step: '03',
      title: 'Çarşamba: yapay zeka erken uyarı',
      desc: 'Sistem son 4 haftanın trendine bakar: "Satış ekibinin 6 ay içinde istifa riski %74, sebep: iş yükü sürekli artıyor, takdir düşüyor". Sebep her zaman açıklanır.',
    },
    {
      step: '04',
      title: 'Perşembe: müdahale kararı',
      desc: 'İK + ilgili yönetici toplanır · UpCore\'un 20+ bilim-temelli müdahale önerisinden seçer: iş yükü dengeleme, workshop, 1-1 koçluk, rotasyon.',
    },
    {
      step: '05',
      title: 'Gelecek 8 hafta: uygulama',
      desc: 'Seçilen müdahale çalışanlara açık ve onaylı şekilde uygulanır · UpCore haftalık takip eder · etkili olup olmadığı rakamlarla ölçülür.',
    },
    {
      step: '06',
      title: '8. hafta: sonuç raporu',
      desc: '"Tükenmişlik skoru 2.9 → 2.2\'ye düştü (bilimde büyük etki)" · müdahale işe yaradı mı, yaramadı mı? İşe yaradıysa şablon haline gelir · yaramadıysa başka bir yol denenir.',
    },
  ],
  outcomes: [
    { metric: 'Anket yanıt oranı', value: '%72', desc: 'Samsun Belediyesi pilotta · sektör ortalaması %35 (1 yıllık anketlerde)' },
    { metric: 'Tükenmişlik skoru düşüşü', value: '2.9 → 2.2', desc: '8 haftada · bilimsel anlamda "orta-büyük etki" (Cohen\'s d=0.58)' },
    { metric: 'İstifa azalması', value: '−%22', desc: '6 ayda · belediye pilotunda · yıllık ~₺4.2M tasarruf' },
  ],
  comparison: [
    {
      feature: 'Ne kadar sık ölçüm?',
      upcore: 'Haftada 1 dakika',
      others: 'Yılda bir, 45 dakika',
    },
    {
      feature: 'Türkçe ölçek mi?',
      upcore: 'Evet · Koçak 2022 Türkçe validasyonu',
      others: 'Çeviri veya yok',
    },
    {
      feature: 'Yapay zeka uyarısı nasıl çalışıyor?',
      upcore: 'Hangi 47 işaretten hangisinin etkili olduğu açık',
      others: 'Kara kutu veya yok',
    },
    {
      feature: '"Ne yapayım?" cevabı veriyor mu?',
      upcore: '20+ bilim-temelli öneri + ne kadar işe yaradığı',
      others: '"Manager ile konuş" gibi soyut tavsiyeler',
    },
    {
      feature: 'Yönetici çalışanın skorunu görür mü?',
      upcore: 'Asla · sözleşme şartı',
      others: 'Çoğunda görebilir',
    },
    {
      feature: 'Mavi yaka / ofis dışı çalışan?',
      upcore: 'SMS + IVR + QR kod',
      others: 'Sadece web/e-posta',
    },
    {
      feature: '100 çalışan için yıllık maliyet?',
      upcore: '₺34.800',
      others: 'Oracle/SAP: ₺280K+',
    },
  ],
  instruments: [
    'BAT-12-TR · Koçak 2022 · bilimsel güvenilirliği α≥.85 (yüksek)',
    'UWES-9-TR · Çapri & Güç 2014 · iş bağlılığı ölçeği',
    'COPSOQ-III-TR · Şahan 2019 · Danimarka psikososyal risk ölçeği',
    'JD-R Modeli · Bakker & Demerouti 2017 · iş talebi vs kaynağı dengesi',
  ],
  useCases: [
    {
      segment: 'Belediye Başkan Yardımcısı',
      scenario:
        "Ahmet Bey, 12.000 kişilik belediyede zabıta ve temizlik işçilerinin sürekli istifa ettiğini biliyor ama sebebini bilmiyor. UpCore ile 3 ayda gördü: iş yükü sarı, takdir kırmızıda. \"Haftalık 5 dakikalık takdir ritüeli\" müdahalesi uyguladı. 8 hafta sonra istifa oranı %22 düştü, Sayıştay raporu için de veri hazır.",
    },
    {
      segment: 'Holding CHRO',
      scenario:
        "Ayşe Hanım, 24.000 kişilik holdingde her Pazartesi sabah CHRO dashboard\'u açar. 18 şirketin tamamı tek ekranda: 3 şirket yeşil, 14 sarı, 1 kırmızı. Kırmızı şirketin CEO\'suna telefon açar: \"Satış ekibinde iş yükü fırladı, görüşelim mi?\" Bu konuşmayı ölçümden önce yapamazdı.",
    },
    {
      segment: 'Çağrı merkezi yöneticisi',
      scenario:
        'Mehmet Bey 500 kişilik çağrı merkezinde "çalışanlar tükenmiş görünüyor" der eskiden. Şimdi veri var: duygusal tükenme 6 hafta üst üste yükseliyor. UpCore\'un önerisi: 4 saatlik vardiya + saatte 5 dakika zorunlu mola. 6 hafta sonra skor 2.4\'ten 1.8\'e düştü, müşteri memnuniyeti de arttı.',
    },
  ],
  faq: [
    {
      q: 'Çalışanlarım anketleri doldurmaz; şirket genelinde katılım düşük olur...',
      a: 'Bu haklı endişe. 1 yıllık uzun anketlerde katılım ortalama %35. UpCore haftalık 1 dakikalık anketlerle %72 yanıt oranı alıyor (Samsun Belediyesi pilot verisi). Sebepleri basit: (1) Kısa — 60 saniye, (2) Anonim — yönetici göremez, (3) Sonuç görülür — çalışan geçen haftanın müdahalesini görür, "değişim oluyor" algısı gelir. İlk 4 hafta %45 civarında başlar, 8. haftada %70\'i geçer.',
    },
    {
      q: 'Bu ölçek (BAT-12) bilimsel olarak güvenilir mi? Nereden biliyoruz?',
      a: 'BAT ölçeği, dünyada en çok kullanılan tükenmişlik ölçeği olan Maslach MBI\'nın modern Avrupa sürümüdür (Schaufeli & Desart 2019). Türkçe versiyonunu Doç. Dr. Mevra Koçak 2022\'de Türkiye\'de 2.778 çalışanda test etti · güvenilirlik skoru α≥.85 (0.70 üstü "yüksek" kabul edilir) · bilimsel dergide peer-reviewed yayın var. Biz kullandığımız her ölçeğin referansını /bilimsel-temel sayfasında DOI linkiyle paylaşıyoruz — sakar yok.',
    },
    {
      q: 'Yönetici "bu çalışanın skoru nedir" diye sorarsa ne olur?',
      a: 'Sistem cevap vermez. Yöneticiler bireysel skorları teknik olarak göremez · sözleşmemizde de yasaklı. Sadece ekibin (en az 5 kişi) ortalaması görünür. Bir yönetici bile üst yönetim olsa "Mehmet\'in skorunu göster" sorusu alamaz. Her erişim denemesi log\'lanır · şüpheli durumlar alarm verir. Bu neden önemli? Çünkü çalışan skorunun performans değerlendirmesinde kullanılacağını düşünürse dürüst cevap vermez, tüm sistem çöker.',
    },
    {
      q: 'Yapay zeka "istifa riski %74" diyorsa sihir mi? Nasıl güveneyim?',
      a: 'Sihir değil — istatistik. Sistem geçmiş verilerden öğrenmiş: hangi çalışanlar istifa etti, son 6 ayda hangi 47 sinyal değişti (iş yükü artışı, takdir azalması, ekip değişimi, vs). Her tahminle birlikte "bu riskin sebebi şu: iş yükü son 3 haftada %15 arttı + takdir %10 düştü" denk açıklama veriyor. Kara kutu değil. Ayrıca yanılma payımızı şeffaf paylaşıyoruz: %11 yanlış alarm var (fake pozitif) · kullanıcıya "emin değiliz" diyoruz.',
    },
    {
      q: 'Kırmızı bir ekip gördüğümde ne yapacağımı söylüyor mu gerçekten?',
      a: 'Evet. 20+ bilim-temelli müdahale kataloğumuz var · her birinin ne kadar işe yaradığı araştırma sonuçlarıyla paylaşılıyor. Örneğin: "İş yükü dengeleme" — bilimde etki büyüklüğü d=0.55 (büyük etki, Sonnentag 2018 meta-analizi). "Job Crafting workshop" — d=0.50 (Rudolph 2017, 122 çalışma). Seçimi İK yapar, sistem sadece öneriyi + kanıtı paylaşır. Örnek: önce en etkili olanı ("peer destek programı"), sonra en ucuzunu, sonra en hızlısını sunuyor.',
    },
    {
      q: 'Kalibrasyon manipüle edilebilir mi? Birileri kötü niyetle skor bozabilir mi?',
      a: 'Zor ve sistem fark eder. Her yanıtın iç tutarlılığı kontrol ediliyor — ters anlamlı sorular birbiriyle uyumsuzsa (örn: "İşimden keyif alıyorum: 5" + "İşim beni yoruyor: 5") yanıt analizden düşürülüyor. Kolektif manipülasyon (tüm ekibin aniden hep 5 veya hep 1 vermesi) anormalik tespitiyle yakalanıyor. %100 hatasız değil ama %95+ güvenilir.',
    },
    {
      q: 'Oracle HCM veya SAP SuccessFactors\'ın "employee pulse" özelliği var · farkı ne?',
      a: 'Onlarda şunlar var: basit anket motoru, eNPS (0-10 memnuniyet skoru), raporlama. Bizde olmayan (onlarda olmayan) şunlar: (1) Türkçe bilimsel ölçek (BAT-TR), (2) İş Talepleri-Kaynakları modeli çerçevesinde analiz, (3) yapay zeka erken uyarısı, (4) 20+ müdahale önerisi, (5) etki büyüklüğü ölçümü, (6) mavi yaka için SMS/QR kod alternatifleri. Kısaca: onlar "anket aracı", biz "bilimsel tükenmişlik platformu".',
    },
  ],
  relatedModules: [
    {
      slug: 'koruma',
      title: 'Koruma',
      desc: 'Kırmızı band çalışan için 20+ bilim-temelli müdahale · her birinin ne kadar işe yaradığı rakamlarla',
    },
    {
      slug: 'gelistirme',
      title: 'Geliştirme',
      desc: 'Tükenmişliği önlemenin pozitif tarafı: güçlü yönleri büyütmek · VIA + PsyCap',
    },
    {
      slug: 'yerlestirme',
      title: 'Yerleştirme',
      desc: 'Tükenmiş çalışan için bazen en iyi müdahale rotasyon · iç mobilite + kariyer yolu',
    },
  ],
};

export default function SurdurmePage() {
  return <ModulePage content={content} />;
}
