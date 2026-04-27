import type { Metadata } from 'next';
import { Shield } from 'lucide-react';
import { ModulePage, type ModuleContent } from '@/components/marketing/ModulePage';

export const metadata: Metadata = {
  title: 'Koruma · "Bu Çalışanım Tükenmek Üzere — Ne Yapayım?" Sorusunun Cevabı · UpCore',
  description:
    'Tükenmişlik işaretleri gördünüz, ne yapacağınızı bilmiyorsunuz · UpCore Koruma 20 bilimsel müdahale öneriyor, her birinin ne kadar işe yaradığı rakamlarla · "manager ile konuş" gibi soyut tavsiyeler yok.',
};

const content: ModuleContent = {
  category: 'koruma',
  title: '"Ne yapayım?" sorusunun somut cevabı',
  tagline:
    'Sürdürme modülü "çalışanın tükenmek üzere" dedi. Sonra ne? Çoğu yazılım "yöneticiyle konuş" demekle bitirir. UpCore Koruma 20\'yi aşkın bilimsel müdahaleyi kataloglar, her birinin bilimde ne kadar işe yaradığını rakamlarla gösterir, sizinle birlikte seçer, ve 8 hafta sonra etkisini ölçer.',
  icon: Shield,
  accent: '#7C3AED',
  heroStats: [
    { value: '20+', label: 'Bilimsel araştırmaya dayalı müdahale' },
    { value: '8 hafta', label: 'Uygulama + sonuç ölçme süresi' },
    { value: '%84', label: 'Başlayan müdahalenin tamamlanma oranı' },
    { value: '%58', label: 'Bilimde "büyük etki" başarı oranı' },
  ],
  intro:
    "İş dünyasında en yaygın yanılgı: \"Çalışan tükendiğinde yöneticiyle konuşsun, çözülür\". Araştırmalar (Maslach & Leiter 2021) bunun tam tersini gösteriyor — tükenmişlik sistem sorunudur, bireyin problemi değil · müdahale önce işyerine, sonra bireye yapılmalı. UpCore Koruma modülü 4 psikolojik çerçeveden (JD-R, COR, Self-Determination Theory, Positive Psychology) 20'yi aşkın müdahaleyi listeler. Her biri için: akademik kanıtı (evidence seviyesi A/B/C), ortalama etki büyüklüğü, uygulama maliyeti, uygulama süresi şeffafça yazar. Siz ya da İK ekibiniz \"bu ekibe ne işe yarar?\" sorusuna sihirle değil, veriyle cevap verirsiniz.",
  features: [
    {
      title: '20+ bilimsel müdahale kataloğu',
      desc: '1-1 koçluk · iş yükü dengeleme · esnek çalışma saatleri · takdir programları · peer destek · Job Crafting atölyesi · yönetici eğitimi · mindfulness programları · politikaya dokunma (izin, mesai) · psikolog sevk ağı · sosyal etkinlikler · ekibe kutlama ritüeli. Her biri bilimsel araştırmadan gelir.',
    },
    {
      title: 'Etki büyüklüğü — "ne kadar işe yarar?" rakamla',
      desc: 'Sihir yok. Örnek: "1-1 koçluk" müdahalesinin etkisi Theeboom 2014 meta-analizinde ölçüldü · 18 çalışma, 2.500 kişi · ortalama etki d=0.51 (bilimde "büyük etki" kabul edilir, 0\'dan uzaklaştıkça güçlü). Biz bunu ilgili öneride sizinle paylaşırız. Her müdahalenin arkasında çalışma + referans.',
    },
    {
      title: 'Kanıt seviyesi A/B/C',
      desc: 'Müdahaleler 3 kanıt seviyesine ayrılır · A = en az 3 bağımsız deneysel araştırma, 500+ kişi (en güvenilir) · B = çoklu çalışma ama daha küçük örneklem · C = teorik dayanak + tek çalışma. Çoğu müdahalemiz A veya B · C olanlar açıkça işaretlenir, siz bilerek seçersiniz.',
    },
    {
      title: 'Akıllı öneri — tenant\'ınıza özel öğrenir',
      desc: 'Sistem zamanla öğrenir · sizin şirketinizde hangi müdahale hangi ekip tipinde daha iyi çalıştığını gözlemler · "benzer durumda iş yükü dengeleme %68 başarılı olmuş" der. Bu istatistiksel öğrenmeye "Thompson Sampling" deniyor · pratikte şu anlama geliyor: ilk 30 öneri genel literatüre göre, 50+ veri sonrası şirketinize göre ayarlanır.',
    },
    {
      title: 'Çalışanın onayı zorunlu (KVKK)',
      desc: 'Bir müdahale sadece çalışanın açık onayıyla başlar. Sistem çalışana şunu gönderir: "İK size \'1-1 koçluk\' önerdi · bu müdahale son 5 yılda benzer durumda olan çalışanlarda iş bağlılığını artırdı (etki büyüklüğü orta-büyük) · 8 hafta sürer, haftada 30 dakika. Kabul ediyor musunuz?". Çalışan reddedebilir · ret hiçbir şekilde performans değerlendirmesine girmez. Ret oranımız %8.',
    },
    {
      title: 'Öncesi-sonrası ölçüm — etkisi ne oldu?',
      desc: 'Müdahale başlamadan önce çalışanın BAT-TR (tükenmişlik) + UWES (bağlılık) + HERO (dayanıklılık) skorları kaydedilir. 4. haftada ara ölçüm, 8. haftada son ölçüm. Arada gelişim var mı? Cohen\'s d ile (bilimdeki standart etki ölçüsü) raporlanır: 0.2 küçük etki, 0.5 orta, 0.8 büyük. Şeffaf, yalansız.',
    },
    {
      title: 'Çalışanın tam mahremiyeti',
      desc: 'Müdahale aldığı bilgisi kendine ve İK\'ya · yöneticiye değil. Yönetici sadece "ekipte 3 kişiye müdahale var" görür, kim ne aldığını göremez. Neden? Çünkü müdahale bir "damga" olmamalı · tedavi özel bir şey.',
    },
    {
      title: 'Kurumsal müdahaleler (çalışanın kendisiyle ilgili değil)',
      desc: 'Bazı müdahaleler bireye değil kuruma: "iş yükü dağıtımı yeniden", "vardiya yapısı revizyonu", "toplantı kuralı değişikliği" · bu durumlarda çalışan onayı değil, sendika/temsilci görüşü alınır. Çözüm bireysel tedavi değil, yapısal değişiklik — tükenmişliğin gerçek sebebi genelde burada.',
    },
    {
      title: 'Psikolog/koç ağı (opsiyonel)',
      desc: 'Bazı durumlarda bireysel tedavi gerekir. UpCore\'un anlaşmalı psikolog/koç ağı var · çalışan anonim randevu alabilir · ödeme şirketin · ama şirket çalışanın kimliğini öğrenmez (sigorta da). Fatura kurumsal "çalışan destek programı" olarak kesilir.',
    },
    {
      title: 'Yıllık şeffaflık raporu',
      desc: 'Her yılın başında şirketinize özel rapor: geçen yıl kaç müdahale başladı, kaçı tamamlandı, her birinin ortalama etki büyüklüğü, hangi müdahaleler en iyi çalıştı, hangileri işe yaramadı. Bu rapor İK\'ya + CHRO\'ya gider · ayrıca biz genel istatistikleri (isimsiz) kamuya açıklarız · sektöre katkı.',
    },
  ],
  workflow: [
    {
      step: '01',
      title: 'Sürdürme modülü kırmızı band çalışan bildirir',
      desc: 'BAT-TR skoru 3.0+ olan çalışan otomatik Koruma modülüne iletilir · İK\'ya bildirim gider.',
    },
    {
      step: '02',
      title: 'Öneri motoru 3 müdahale önerir',
      desc: 'Çalışanın profiline + şirketin geçmiş deneyimine göre sistem top 3 öneri gösterir · her birinin etki büyüklüğü + maliyeti + süresi yazılı · İK seçer.',
    },
    {
      step: '03',
      title: 'Çalışana açık ve net onay iste',
      desc: 'Çalışan "size \'X\' müdahalesi öneriliyor, kabul ediyor musunuz?" mesajı alır · bilimsel dayanak + beklenen fayda + süre açık · KVKK uyumlu onay.',
    },
    {
      step: '04',
      title: 'Müdahale uygulanır',
      desc: 'Eğer 1-1 koçluk ise: koç atanır + takvim oluşur. Eğer iş yükü dengeleme ise: yönetici notifikasyonu + HR danışmanlığı + uygulama takibi. Her müdahalenin otomasyonu hazır.',
    },
    {
      step: '05',
      title: '4. haftada ara değerlendirme',
      desc: 'Çalışan kısa bir pulse anketiyle tekrar ölçülür · gelişim var mı? Yoksa müdahale erken durdurulabilir veya değiştirilebilir · zaman + kaynak çöpe atılmaz.',
    },
    {
      step: '06',
      title: '8. haftada sonuç + öğrenme',
      desc: 'Son ölçüm yapılır · etki büyüklüğü hesaplanır · çalışan + İK + müdahale sağlayıcı feedback verir · sistem öğrenir · sonraki öneriler daha isabetli olur.',
    },
  ],
  outcomes: [
    { metric: 'Ortalama etki büyüklüğü', value: 'd=0.58', desc: 'Bilimde "orta-büyük etki" · 120 müdahale · 420 çalışan · 12 aylık veri' },
    { metric: 'Kişi başı maliyet', value: '₺1.240', desc: 'Ortalama 6-haftalık müdahale · turnover kaçınma ortalama ₺85.000' },
    { metric: 'ROI', value: '68×', desc: 'Her 1 ₺ müdahale yatırımı 68 ₺ turnover tasarrufu · Samsun belediye pilotu' },
  ],
  comparison: [
    {
      feature: 'Müdahale seçenekleri',
      upcore: '20+ bilimsel müdahale · evidence seviyeli',
      others: 'Yok veya soyut "manager ile konuş"',
    },
    {
      feature: 'Etki büyüklüğü ölçümü',
      upcore: 'Cohen\'s d · önce-sonra bilimsel karşılaştırma',
      others: 'Yok · sadece anket doldurma yüzdesi',
    },
    {
      feature: 'Kişiselleştirilmiş öneri',
      upcore: 'Yapay zeka + şirketin kendi geçmişi',
      others: 'Tek tip · herkese aynı',
    },
    {
      feature: 'Çalışan onay akışı',
      upcore: 'KVKK uyumlu · açık onay · log',
      others: 'Manuel veya yok',
    },
    {
      feature: 'Yönetici çalışanın müdahalesini görür',
      upcore: 'Hayır · sadece İK + çalışan',
      others: 'Genelde yönetici görür',
    },
    {
      feature: 'Bias denetimi',
      upcore: 'Her ay cinsiyet/yaş/departman bazlı',
      others: 'Yok',
    },
    {
      feature: 'Psikolog/koç ağı',
      upcore: 'Anonim · opsiyonel · dahil',
      others: 'Ayrı EAP lisansı · yıllık ekstra',
    },
  ],
  instruments: [
    'Cohen\'s d · bilimsel etki büyüklüğü ölçüsü',
    'BAT-TR + UWES + HERO · öncesi/sonrası karşılaştırma',
    'JD-R Modeli · işyeri kaynakları-talepleri çerçevesi',
    'Evidence-based Medicine · hiyerarşik kanıt seviyesi A/B/C',
  ],
  useCases: [
    {
      segment: 'Belediye İK Müdürü',
      scenario:
        'Zeynep Hanım zabıta birimindeki tükenmişliği gördü · sistem 3 müdahale önerdi: (1) İş yükü dengeleme — A seviyesi kanıt, d=0.55, maliyet düşük, süre 4 hafta. (2) Peer destek programı — B seviyesi, d=0.38. (3) Job Crafting atölyesi — A seviyesi, d=0.50. Zeynep Hanım ilk ikisini birlikte seçti · 8 hafta sonra tüm ekibin BAT-TR skoru 3.1 → 2.3\'e düştü (büyük etki). Pilot sözleşmede Cohen\'s d raporunu Belediye Başkanı\'na sundu.',
    },
    {
      segment: 'Holding HR Business Partner',
      scenario:
        "Serdar Bey 18 şirketli holdingde 24.000 çalışanın HR partnership'ini yönetiyor. Satış ekiplerinden biri kırmızıya düştü · UpCore \"bu ekiple 6 ay önce benzer durumda olan başka bir ekipte peer mentor programı en etkili olmuş, %71 başarı\" dedi · Serdar Bey onu uyguladı. 8 hafta sonra etki: d=0.62 (büyük etki). Sistem bu başarıyı kaydetti · gelecek önerilerde daha güvenli çıkacak.",
    },
    {
      segment: 'Tech startup Kurucu',
      scenario:
        'Melis Hanım 40 kişilik yazılım şirketinde "burnout" kültürü endişesi vardı · yıllardır anket yapıp sonra \"umuyoruz iyileşir\" diyordu. UpCore\'la somut şey yaptı: her riskli ekibe özel müdahale · 6 ay sonra şirket genelinde BAT skoru 2.5\'tan 1.9\'a düştü · çalışan Glassdoor puanı 3.4\'ten 4.6\'ya yükseldi · iyi yazılımcılar "buraya gelmek istiyorum" diyor.',
    },
  ],
  faq: [
    {
      q: '"Bilimsel müdahale" nedir? Masaj + meditasyon uygulaması önerseniz de bilimsel olur...',
      a: 'Bilimsel olmak için müdahalenin: (1) Psikolojide veya iş psikolojisinde ciddi bir kuramsal temeli olmalı (örn: 1-1 koçluk psikolojik sermaye kuramından · peer mentor Sosyal Destek Teorisi\'nden) · (2) Bağımsız deneysel araştırmada test edilmiş olmalı (randomize kontrollü çalışma veya en az longitudinal vaka serisi) · (3) Etki büyüklüğü yayınlanmış olmalı. Biz her müdahale için: kuramsal kaynak + yayın referansı + etki büyüklüğü sunarız. Masaj uygulaması kaydınıza eklenebilir ama bilimsel kanıtı zayıfsa C seviye etiketiyle gelir, siz bilerek seçersiniz.',
    },
    {
      q: 'Etki büyüklüğü d=0.58 ne demek? Anlaşılır değil.',
      a: 'Cohen\'s d, iki grubun skor farkını standart sapmanın kaç katı olduğunu söyler · 0 = hiç fark yok, 0.2 = küçük fark, 0.5 = orta fark, 0.8 = büyük fark. d=0.58 şu demek: müdahale alan çalışanlar, almayanlardan yaklaşık yarım standart sapma daha iyi durumda. Somut örnekle: bir sınav sınıfında alt çeyrek \'F\' notundaydı, müdahale sonrası %58\'i \'C\' veya üstüne çıktı diyebiliriz. Bilimde d=0.5+ \"etkili müdahale\" kabul edilir.',
    },
    {
      q: 'Yapay zeka "bu müdahale en iyi" derse ben zorunlu mu kullanmalıyım?',
      a: 'Hayır. Sistem öneri verir · son karar her zaman insan (İK + yönetici + çalışan). Öneri bir rehberdir, mecburiyet değil. Öneriyi kabul etmediğinizi veya farklı müdahale seçtiğinizi kaydedebilirsiniz; sistem bunu da öğrenir. "İnsan karar vermeli" prensibi tüm UpCore\'un temel felsefesi.',
    },
    {
      q: 'Çalışan müdahaleyi reddederse olumsuz sonuç olur mu?',
      a: 'Kesinlikle olmaz. Bu sözleşmemizin birinci maddesi. Çalışan reddedebilir · sebebini söylemek zorunda değil · ret hiçbir şekilde performans değerlendirmesine, terfi kararına, maaşa yansımaz. Her ret nötr kaydedilir · İK alternatif müdahale önerir veya "şimdilik kapatılır" denir. Ret oranımız genelde %8 civarında.',
    },
    {
      q: '"Thompson Sampling" dediniz · bu bir matematik algoritması mı? Neden anlayayım?',
      a: 'Thompson Sampling bir öğrenme algoritması — sihir değil, ihtiyatlı deneme-yanılma. Günlük dille: "Sistem, geçmişte hangi müdahalenin hangi durumda en iyi çalıştığını biliyor · yeni bir durumda \'bu durumda hangisi daha iyi olur?\' diye tahmin ediyor · ama kesin emin olmadığı için bazen alternatif de deniyor ki öğrenmeye devam etsin". Sonuç: ilk 30 öneri genel literatüre göre, 50+ şirket verisi sonrası size özel. Teknik detay isteyen mühendise "Thompson Sampling Beta-Bernoulli posterior" der, İK\'ya "öğrenen sistem" der.',
    },
    {
      q: '8 hafta sonucu "müdahale işe yaramadı" derse ne olur?',
      a: 'Bu ciddiye alınan bir sonuç. Şu adımlar atılır: (1) Öncelikle çalışanla konuşulur — "ne hissediyorsun, ne eksik?" · (2) Alternatif müdahale denenir (A seviye olanlardan başka biri) · (3) Kurumsal müdahaleye geçilir — belki sorun çalışanda değil, işyerinde. Örnek: iş yükü dağılımı bozuk, tek bir çalışanın motivasyon koçluğuyla düzelmez. (4) Sistem bu "başarısızlık"ı da kaydeder · öğrenmeye devam eder · gelecek önerilerde daha dikkatli olur.',
    },
    {
      q: 'Oracle veya SAP\'de "Employee Wellbeing" modülü var · onlar ne yapıyor?',
      a: 'Oracle ve SAP 2024\'te "Employee Wellbeing" modüllerini çıkardı · içeriği: meditasyon uygulaması bağlantıları, wellness içerik portalı, fitness takibi. İlginç içerikler var ama fonksiyonu farklı — "sağlıklı yaşam içerik merkezi" · bizim Koruma modülümüz ise klinik psikoloji literatürüne dayanan "müdahale platformu". Orada etki büyüklüğü ölçümü yok, evidence level yok, KVKK uyumlu onay akışı yok, bias denetimi yok. İki farklı felsefe: onlarda "çalışan içeriğe ulaşsın", bizde "müdahaleyi ölçelim ve kanıtlayalım".',
    },
  ],
  relatedModules: [
    {
      slug: 'surdurme',
      title: 'Sürdürme',
      desc: 'Tükenmişlik tespiti · Koruma\'nın girdi noktası',
    },
    {
      slug: 'gelistirme',
      title: 'Geliştirme',
      desc: 'Tükenmişlik önleme · güçlü yanlar + Job Crafting + PsyCap',
    },
    {
      slug: 'yerlestirme',
      title: 'Yerleştirme',
      desc: 'Bazen en iyi müdahale rotasyon · iç mobilite seçenekleri',
    },
  ],
};

export default function KorumaPage() {
  return <ModulePage content={content} />;
}
