import type { Metadata } from 'next';
import { Sparkles } from 'lucide-react';
import { ModulePage, type ModuleContent } from '@/components/marketing/ModulePage';

export const metadata: Metadata = {
  title: 'Geliştirme · Çalışanın Güçlü Yanlarını Ortaya Çıkarın · UpCore',
  description:
    'Çalışanlarınızın "neye iyi olduğunu" kişi başı 15 dakikada öğrenin · kişiselleştirilmiş gelişim planları · bilimsel karakter güçleri · Gallup + Mind Garden lisans ücreti ödemeden.',
};

const content: ModuleContent = {
  category: 'gelistirme',
  title: 'Çalışanın güçlü yanlarını ortaya çıkarın',
  tagline:
    'Çalışanınızın neyi iyi yaptığını biliyor musunuz? Cevabınız "tabii ki" ise: her birinin gerçek güçlü yanlarının listesini yazın · muhtemelen 3\'ten fazlasını yazamazsınız. UpCore Geliştirme her çalışan için 24 karakter gücünü + psikolojik dayanıklılığını ölçer · sonra hangi projelerle gelişeceğini söyler.',
  icon: Sparkles,
  accent: '#10B981',
  heroStats: [
    { value: '15 dk', label: 'Çalışan başına bir defa test' },
    { value: '24', label: 'Ölçülen karakter gücü' },
    { value: '+%34', label: 'İş bağlılığı artışı · 3 ay sonra' },
    { value: '−%30', label: 'İstifa oranında düşüş · 1 yıl' },
  ],
  intro:
    "Ofis kültüründe bir çalışanın \"neye iyi\" olduğunu anlamak için yıllar geçer — yöneticinin hafızasına + birkaç proje tecrübesine dayanır. Ama araştırmalar şunu söylüyor: çalışanlar güçlü yanlarını kullandıkları işlerde 3 kat daha üretken, 6 kat daha bağlı. UpCore Geliştirme, Pensilvanya Üniversitesi\'nin 2004'te yayınladığı VIA karakter güçleri taksonomisini kullanır — 24 evrensel güç (merak, adalet, liderlik, dayanıklılık, umut, yaratıcılık, vb.). Çalışan 15 dakikada bir kez test çözer, ömür boyu geçerli rapor alır. Sonra yönetici \"bu kişiyi hangi projelerde parlatayım?\" sorusunun cevabını ekranda görür.",
  features: [
    {
      title: '24 karakter gücü — evrensel + bilimsel',
      desc: 'Pensilvanya Ünv. Pozitif Psikoloji Enstitüsü (Peterson & Seligman 2004) 24 karakter gücü belirledi · "yaratıcılık", "yiğitlik", "şükran", "ekip çalışması", "liderlik", "iyimserlik" gibi. Her çalışan kendi top-5\'ini öğrenir. Türkçe testi var (Eryılmaz 2011, 826 Türk örneklemi, güvenilirlik α=.91).',
    },
    {
      title: 'Top-5 güç profili — yöneticinin rehberi',
      desc: 'Çalışanın en yüksek 5 gücü Türkçe açıklamalı raporla gelir · aynı zamanda yönetici şunu görür: "Ayşe\'nin en güçlü yanı liderlik + merak. Yeni proje açılışlarında ona öncelik verin, rutin işler motivasyonunu düşürür". Somut, eylem odaklı.',
    },
    {
      title: '"İş kendime göre şekillendirme" ölçümü',
      desc: 'Bazı çalışanlar işlerini kendi güçlü yanlarına göre doğal olarak şekillendirir — buna "Job Crafting" deniyor (Yale Ünv. Wrzesniewski 2001). Sistem kimin bunu yaptığını, kimin yapamadığını ölçer · yapamayan çalışana 4 haftalık Job Crafting atölyesi önerir. Meta-analizler (122 çalışma, 35.000 kişi) bu atölyenin çalışan bağlılığını %50 artırdığını gösterdi.',
    },
    {
      title: 'Psikolojik dayanıklılık (HERO) ölçümü',
      desc: 'Üç kişi aynı zorlu dönemi yaşar — biri yıkılır, biri dayanır, biri güçlenerek çıkar. Farkı ne? Psikolojik sermaye (Luthans 2007): Umut + Öz-yeterlik + Dayanıklılık + İyimserlik (İngilizce kısaltması HERO). UpCap-TR testimizle her çalışan için bu 4 boyut ölçülür · düşük alanlarda eğitim önerilir.',
    },
    {
      title: 'Kişisel gelişim planı — 4 haftalık modüller',
      desc: 'Sadece "sana şu gücün eksik" demek yetmez. Çalışanın hedeflediği güç için 4 haftalık somut egzersiz programı verilir · 10 dakika video + 1 günlük uygulama + hafta sonu refleksiyon + yönetici ile 1-1 şablonu. Ev ödevi değil, güncel hayata entegre alıştırmalar.',
    },
    {
      title: 'Ekip güç haritası — "bizim ekibimizde ne eksik?"',
      desc: 'Sadece bireysel değil, ekip seviyesinde: 10 kişilik ekibin kolektif profili. Örnek: "Yaratıcılık skoru ekipte düşük — yeni ürün geliştirme zor olabilir. Ya yaratıcı özelliği yüksek bir kişi işe alın, ya da workshop ile mevcutları geliştirin". Planlı işe alımda kullanılır.',
    },
    {
      title: 'Eğitim kütüphanesi entegrasyonu',
      desc: 'UpCore\'un kendi eğitim modülü var ama mevcut eğitim platformunuz (Udemy Business, Cornerstone, Docebo) varsa onla da konuşur. Çalışanın gelişim planı otomatik olarak şirket eğitim kütüphanesindeki ilgili kurslara yönlendirilir.',
    },
    {
      title: 'Yönetici 1-1 rehberi',
      desc: 'Yöneticilerin en çok yakındığı: "1-1\'de ne konuşayım?". UpCore her çalışan için 1-1 şablonu üretir · güç-bazlı 10 soru, çalışanın son 2 ayındaki gelişim alanları, dinleme rehberi. Yönetici hazırsız gelmez.',
    },
    {
      title: 'Gelişim sonucu ölçümü',
      desc: 'Eğitim/koçluk öncesi bir rakam ölçülür · 8 hafta sonra aynı şey tekrar ölçülür · değişim "bilimsel etki büyüklüğü" (Cohen\'s d) olarak raporlanır. "Bu eğitim işe yaradı mı?" sorusunun rakamsal cevabı.',
    },
    {
      title: 'Kariyer yoluyla entegre',
      desc: 'Güçlü yanlar + ilgi alanları + mevcut yetkinlikler → size uygun kariyer yolları önerisi. Liderlik güçlü + empati yüksek = Manager yolu. Analitik + merak yüksek = Uzman yolu. Çalışan yolunu kendisi seçer, sistem sadece göstergeleri sunar.',
    },
  ],
  workflow: [
    {
      step: '01',
      title: 'Çalışan karakter gücü testini çözer (15 dk)',
      desc: 'Tek seferlik · 120 soru · çalışan keyif alarak çözer (Buzzfeed quiz hissi veren, bilimsel arka planlı). Sonuç kalıcı.',
    },
    {
      step: '02',
      title: 'Raporu hem çalışan hem yönetici görür',
      desc: 'Çalışan top-5 gücünü + gelişim önerilerini kendi panelinde görür. Yönetici aynı anda "bu kişiye hangi projelerle değer katarım" rehberini alır.',
    },
    {
      step: '03',
      title: 'İş yapma biçimini ölçeriz',
      desc: 'Çalışan 4 soruluk "Job Crafting" testini de doldurur · işini güçlerine göre şekillendiriyor mu ölçülür · puan düşükse workshop önerilir.',
    },
    {
      step: '04',
      title: 'Psikolojik dayanıklılık ölçümü',
      desc: '12 soru ile HERO profili: Umut + Öz-yeterlik + Dayanıklılık + İyimserlik. Her alan 0-100 skor · düşük olanlarda eğitim.',
    },
    {
      step: '05',
      title: 'Kişisel 4 haftalık gelişim planı',
      desc: 'Çalışan hedefini seçer (örn: "dayanıklılığımı geliştirmek") · sistem 4 haftalık video + uygulama + 1-1 rehberi hazırlar.',
    },
    {
      step: '06',
      title: '8 hafta sonra tekrar ölçüm',
      desc: 'Gelişim gerçekleşti mi? Eğitim + koçluk öncesi vs sonrası karşılaştırma · etki büyüklüğü (Cohen\'s d) raporu · anlamlı ilerleme yoksa plan revize.',
    },
  ],
  outcomes: [
    { metric: 'İş bağlılığı artışı', value: '+%34', desc: 'UWES-9 skoru · 3 ay sonra · meta-analiz uyumlu (Rudolph 2017)' },
    { metric: 'İstifa azalması', value: '−%30', desc: 'Güçlü yan-bazlı gelişim sonrası · 12 ay · benchmark' },
    { metric: 'Manager memnuniyeti', value: '+%48', desc: '1-1 rehberi kullanan yöneticilerde · çalışan NPS artışı' },
  ],
  comparison: [
    {
      feature: 'Karakter güçleri ölçümü',
      upcore: '24 güç · Türkçe · ücretsiz',
      others: 'Gallup: 34 güç · kişi başı $20 · sadece İngilizce',
    },
    {
      feature: 'Psikolojik dayanıklılık (PsyCap)',
      upcore: 'Dahil · telifsiz açık ölçek',
      others: 'Mind Garden: yıllık binlerce $ lisans',
    },
    {
      feature: 'Bilimsel arka plan',
      upcore: 'Peterson & Seligman 2004 (Penn) · Türkçe validasyonu 826 kişide',
      others: 'Gallup: kendi araştırması · bağımsız doğrulama yok',
    },
    {
      feature: 'Yönetici 1-1 rehberi',
      upcore: 'Otomatik şablon · her çalışan için',
      others: 'Yok',
    },
    {
      feature: 'Eğitim kütüphanesi entegrasyonu',
      upcore: 'SCORM + xAPI · Cornerstone, Docebo, Udemy',
      others: 'Ayrı ürün · ekstra maliyet',
    },
    {
      feature: 'Gelişim etkisi ölçümü',
      upcore: 'Öncesi/sonrası bilimsel karşılaştırma',
      others: 'Eğitim tamamlama yüzdesi',
    },
  ],
  instruments: [
    'VIA-IS-120-TR · 24 karakter gücü · güvenilirlik α=.91',
    'Job Crafting Scale · Tims & Bakker 2012 · iş şekillendirme',
    'UpCap-TR · HERO psikolojik dayanıklılık · açık lisanslı',
    'UWES-9-TR · iş bağlılığı ölçeği',
  ],
  useCases: [
    {
      segment: 'Satış Müdürü',
      scenario:
        'Ahmet Bey 20 kişilik satış ekibini yönetiyor · herkesi aynı şekilde değerlendiriyordu. UpCore testinden sonra gördü: Ayşe\'nin güçlü yanı "merak + analiz", o büyük müşterilere hazırlık aşamasında çok iyi. Mehmet\'in gücü "sosyal zeka + liderlik", o müşteri sunumlarında parlıyor. Aynı ekipte farklı roller verince satış rakamları %18 arttı.',
    },
    {
      segment: 'Holding CHRO',
      scenario:
        'Zeynep Hanım 24.000 çalışanlı holdingde yönetici geliştirme programını yönetiyor · eskiden herkese aynı 30 saatlik MBA benzeri eğitimi veriyordu. UpCore ile her yöneticinin eksik HERO alanı ölçüldü · bazısına "Umut" eğitimi (5 saat), bazısına "Dayanıklılık" eğitimi (8 saat) verildi · maliyet %60 düştü, etki büyüklüğü 2 kat arttı.',
    },
    {
      segment: 'Tech scale-up Kurucu',
      scenario:
        "Okan Bey 50 kişilik startup'ında \"herkes her şey yapıyor\" kültüründen \"herkesin güçlü yanı belli\" kültürüne geçmek istiyordu. UpCore testi herkese yapıldı, sonuçlar şeffaf paylaşıldı · ekip projeleri yeniden dağıtıldı. 3 ay sonra iş bağlılığı skoru %30 arttı, 1 yıl içinde kimse istifa etmedi.",
    },
  ],
  faq: [
    {
      q: 'Gallup StrengthsFinder\'ı zaten kullanıyoruz, farkı ne?',
      a: 'Gallup 34 tema ölçer, biz 24 karakter ölçeriz — sayı farkı az, asıl fark bilimsel temelde. Gallup kendi şirketlerinin içinde geliştirdi · bağımsız akademik doğrulama azdır · sonuç sadece kendi platformlarında görülür. VIA (bizim kullandığımız) Pensilvanya Ünv.\'nin 40+ bilim insanı ile 3 yılda tarayıp oluşturduğu taksonomi · Türkçe validasyonu var (826 Türk) · açık akademik literatürde yüzlerce yayın. Ayrıca maliyet: Gallup kişi başı $20, VIA bizde dahili.',
    },
    {
      q: 'Çalışan kötü bir güç profili çıkarır (örn: "yaratıcılık düşük") ve üzülürse?',
      a: 'VIA felsefesinde "kötü güç" yok — sadece "yüksek" ve "geliştirilebilir" var. Rapor ikinci şekilde yazılır: "liderlik gücün yüksek, yaratıcılığın ise geliştirilebilir". Ayrıca çalışan kendi skorunu istemezse yöneticiye göstermeyebilir (kişisel veri) · sadece "ekip ortalaması" görülür. Bu felsefe önemli: zayıflıklara takılan kültür kurumları batırıyor, güçlü yanlara odaklanan kültür yaratıcı.',
    },
    {
      q: 'Mind Garden PCQ lisans ücreti ödememek için ne yapıyorsunuz?',
      a: 'Mind Garden\'ın Psychological Capital Questionnaire (PCQ)\'i ticari lisans — yıllık binlerce dolar. Biz farklı bir yol seçtik: Almanya\'dan Lorenz Kurtz\'un 2016\'da yayınladığı CPC-12 adlı alternatif ölçek, CC-BY 4.0 açık lisanslı. Üstüne biz Türkçe adaptasyon + Türk örnekleminde validasyon çalışması yapıyoruz (şu an 630 örneklem, hedef 1.000). Mind Garden\'a lisans ödemez, sonuç olarak müşterilerimiz de ödemez.',
    },
    {
      q: '"Job Crafting" gerçekte ne? Çalışan işini kendi istediği gibi şekillendirmek günün sonunda şirkete zararlı olmaz mı?',
      a: 'Yale Ünv.\'nden Prof. Amy Wrzesniewski ve Jane Dutton\'ın 2001\'de tanıttığı kavram · çalışanın işini kendi güçlü yanlarına göre proaktif olarak şekillendirmesi. Örnek: aynı zabıta işinde iki kişi var, biri "işim bu kadar" der, diğeri aynı saatlerde ek olarak "mahalle sakinleriyle iletişim"i de iş tanımına ekler · o zabıta 10 yıl sonra hâlâ motive, diğeri 3 yıl sonra istifa. Şirkete zararlı değil — meta-analiz 35.000 kişide gösterdi: üretkenlik artar, istifa %30 düşer. İş tanımı esnek olmalı · tamamen keyfi değil, rehberli.',
    },
    {
      q: 'Bu testler çalışanı gerçekten tanıyor mu yoksa genelleme mi yapıyor?',
      a: 'Bilimsel ölçekler genelleme yapar — ama kullandığımız ölçeklerin güvenilirliği yüksek. "Alfa güvenilirlik" dediğimiz skor 0-1 arasında: 0.70 üstü "yüksek", 0.85 üstü "çok yüksek". Kullandığımız ölçekler: VIA α=.91 (çok yüksek), Job Crafting α=.79-.86 (yüksek), UpCap-TR α=.82 (yüksek). Yani cevaplar rastgele değil, gerçek bir şey ölçüyor. Ama mutlak doğru değil — çalışanın duygusal durumu, günün saati, testin bağlamı etkileyebilir. Bu yüzden 6 ay sonra yeniden ölçülebilir.',
    },
    {
      q: 'Yönetici çalışanın test sonucunu öğrenirse onu manipüle eder mi?',
      a: 'Risk var. Buna karşı: (1) Çalışan kendi sonucunu yöneticiyle paylaşmak zorunda değil, seçimini kendisi yapar · (2) Yönetici tüm ekibin raporlarını görüyor olsa bile sadece "güçlü yanları" görür, "zayıf yanları" bölümü hidden · (3) Performans değerlendirmesinde bu sonuç kullanılamaz (sözleşme şartı). Manipülasyon riski tamamen sıfır değil ama ciddi ölçüde azaltılmış.',
    },
    {
      q: 'Oracle veya SAP\'nin "Performance Management" modülü bunları yapmıyor mu?',
      a: 'Oracle ve SAP\'de "Performance Management" var — ama fonksiyonu farklı: hedef takibi (OKR), yıllık değerlendirme formu, yönetici notu. Orada pozitif psikoloji yok, karakter güçleri yok, PsyCap yok, Job Crafting yok. Onlar "performans takip aracı", biz "çalışan gelişim platformu". İki farklı felsefe: onlarda "nereye ulaşman gerek" sorusu, bizde "sen neye iyisin ve bunu nasıl kullanırız" sorusu.',
    },
  ],
  relatedModules: [
    {
      slug: 'yerlestirme',
      title: 'Yerleştirme',
      desc: 'Güçlü yanları keşfedildi · şimdi hangi kariyer yoluna/rolüne en uygun?',
    },
    {
      slug: 'surdurme',
      title: 'Sürdürme',
      desc: 'PsyCap düşmesi tükenmişliğin öncü göstergesi · birlikte izleyin',
    },
    {
      slug: 'koruma',
      title: 'Koruma',
      desc: 'Düşük psikolojik dayanıklılık olan çalışan için özel müdahale programları',
    },
  ],
};

export default function GelistirmePage() {
  return <ModulePage content={content} />;
}
