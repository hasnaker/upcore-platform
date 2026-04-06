/**
 * UpStrengths-TR Assessment Data
 * VIA taxonomy based, Upcore custom instrument
 * 8 domains x 3 questions = 24 items
 */

export interface StrengthDomain {
  id: string;
  name_tr: string;
  name_en: string;
  description_tr: string;
  color: string;
  icon: string;
  facets: string[];
}

export interface AssessmentQuestion {
  id: number;
  domainId: string;
  text_tr: string;
  facet: string;
}

export const STRENGTH_DOMAINS: StrengthDomain[] = [
  {
    id: 'wisdom',
    name_tr: 'Bilgelik',
    name_en: 'Wisdom',
    description_tr: 'Yaratıcılık, merak ve sağduyu ile bilgiyi etkili kullanma yeteneği. Karmaşık durumları farklı perspektiflerden değerlendirme kapasitesi.',
    color: '#5E5CE6',
    icon: 'lightbulb',
    facets: ['Yaratıcılık', 'Merak', 'Sağduyu'],
  },
  {
    id: 'courage',
    name_tr: 'Cesaret',
    name_en: 'Courage',
    description_tr: 'Zorluklara karşı direnç gösterme, dürüstlük ve kararlılıkla hedefe ulaşma gücü. Belirsizlik karşısında harekete geçme cesareti.',
    color: '#DC2626',
    icon: 'shield',
    facets: ['Cesaret', 'Azim', 'Dürüstlük'],
  },
  {
    id: 'humanity',
    name_tr: 'İnsanlık',
    name_en: 'Humanity',
    description_tr: 'Empati, sevgi ve şefkat ile diğer insanlarla derin bağ kurma yeteneği. Sosyal zeka ile ilişkileri güçlendirme kapasitesi.',
    color: '#EC4899',
    icon: 'heart',
    facets: ['Sevgi', 'Nezaket', 'Sosyal Zeka'],
  },
  {
    id: 'justice',
    name_tr: 'Adalet',
    name_en: 'Justice',
    description_tr: 'Takım çalışması, adillik ve liderlikle topluluk iyiliğini gözetme. Herkesin sesinin duyulmasını sağlama kapasitesi.',
    color: '#059669',
    icon: 'scale',
    facets: ['Takım Çalışması', 'Adillik', 'Liderlik'],
  },
  {
    id: 'temperance',
    name_tr: 'Ölçülülük',
    name_en: 'Temperance',
    description_tr: 'Bağışlayıcılık, alçakgönüllülük ve sağgörü ile dengeli kararlar alma. Duygusal dengeyi koruma ve dürtüsel tepkilerden kaçınma.',
    color: '#0EA5E9',
    icon: 'balance',
    facets: ['Bağışlayıcılık', 'Alçakgönüllülük', 'Sağgörü'],
  },
  {
    id: 'transcendence',
    name_tr: 'Aşkınlık',
    name_en: 'Transcendence',
    description_tr: 'Minnettarlık, umut ve mizah ile hayata anlam katma yeteneği. Büyük resmi görme ve ilham verme kapasitesi.',
    color: '#D97706',
    icon: 'sparkle',
    facets: ['Minnettarlık', 'Umut', 'Mizah'],
  },
  {
    id: 'analytical',
    name_tr: 'Analitik Düşünce',
    name_en: 'Analytical Thinking',
    description_tr: 'Problem çözme, veri analizi ve sistem düşüncesiyle karmaşık konuları çözümleme. Mantıksal çerçeveler oluşturma yeteneği.',
    color: '#6366F1',
    icon: 'brain',
    facets: ['Problem Çözme', 'Veri Analizi', 'Sistem Düşüncesi'],
  },
  {
    id: 'communication',
    name_tr: 'İletişim',
    name_en: 'Communication',
    description_tr: 'İkna, empati ve sunum becerileriyle etkili iletişim kurma. Karmaşık fikirleri açık ve anlaşılır şekilde aktarma yeteneği.',
    color: '#8B5CF6',
    icon: 'message',
    facets: ['İkna', 'Empati', 'Sunum'],
  },
];

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  // Bilgelik (Wisdom)
  { id: 1, domainId: 'wisdom', text_tr: 'Bir problemle karşılaştığımda, alışılmışın dışında yaratıcı çözümler üretmeyi severim.', facet: 'Yaratıcılık' },
  { id: 2, domainId: 'wisdom', text_tr: 'Yeni konuları öğrenmek ve araştırmak beni heyecanlandırır.', facet: 'Merak' },
  { id: 3, domainId: 'wisdom', text_tr: 'Karar vermeden önce konuyu farklı açılardan değerlendiririm.', facet: 'Sağduyu' },

  // Cesaret (Courage)
  { id: 4, domainId: 'courage', text_tr: 'Doğru olduğuna inandığım şeyi, çoğunluk karşı olsa bile savunurum.', facet: 'Cesaret' },
  { id: 5, domainId: 'courage', text_tr: 'Zorluklarla karşılaştığımda vazgeçmek yerine çözüm aramaya devam ederim.', facet: 'Azim' },
  { id: 6, domainId: 'courage', text_tr: 'İş yerinde her zaman dürüst ve şeffaf olmaya özen gösteririm.', facet: 'Dürüstlük' },

  // İnsanlık (Humanity)
  { id: 7, domainId: 'humanity', text_tr: 'İş arkadaşlarımın duygularını anlama ve onlara destek olma konusunda iyiyimdir.', facet: 'Sevgi' },
  { id: 8, domainId: 'humanity', text_tr: 'Başkalarına yardım etmek bana gerçek bir tatmin duygusu verir.', facet: 'Nezaket' },
  { id: 9, domainId: 'humanity', text_tr: 'Farklı kişiliklerle etkili iletişim kurabilirim ve sosyal dinamikleri iyi okurum.', facet: 'Sosyal Zeka' },

  // Adalet (Justice)
  { id: 10, domainId: 'justice', text_tr: 'Takım çalışmasında herkesin katkısını değerli bulurum ve birlikte çalışmayı tercih ederim.', facet: 'Takım Çalışması' },
  { id: 11, domainId: 'justice', text_tr: 'Kararlarımda herkese eşit ve adil davranmaya özen gösteririm.', facet: 'Adillik' },
  { id: 12, domainId: 'justice', text_tr: 'Bir grubu yönlendirmek ve ortak hedefe taşımak konusunda doğal bir yeteneğim var.', facet: 'Liderlik' },

  // Ölçülülük (Temperance)
  { id: 13, domainId: 'temperance', text_tr: 'Hata yapan iş arkadaşlarımı affetmek ve ikinci şans vermek benim için önemlidir.', facet: 'Bağışlayıcılık' },
  { id: 14, domainId: 'temperance', text_tr: 'Başarılarımı abartmadan, alçakgönüllü bir şekilde paylaşırım.', facet: 'Alçakgönüllülük' },
  { id: 15, domainId: 'temperance', text_tr: 'Ani kararlar vermek yerine, sonuçlarını düşünerek hareket ederim.', facet: 'Sağgörü' },

  // Aşkınlık (Transcendence)
  { id: 16, domainId: 'transcendence', text_tr: 'Hayatımdaki güzel şeylerin farkında olmak ve minnettarlık duymak benim için doğaldır.', facet: 'Minnettarlık' },
  { id: 17, domainId: 'transcendence', text_tr: 'Zorlu dönemlerde bile geleceğe umutla bakarım.', facet: 'Umut' },
  { id: 18, domainId: 'transcendence', text_tr: 'Mizah anlayışımı kullanarak ortamı rahatlatmayı ve insanları güldürmeyi severim.', facet: 'Mizah' },

  // Analitik Düşünce (Analytical)
  { id: 19, domainId: 'analytical', text_tr: 'Karmaşık problemleri parçalara ayırıp sistematik şekilde çözmekte başarılıyım.', facet: 'Problem Çözme' },
  { id: 20, domainId: 'analytical', text_tr: 'Kararlarımı veriye ve kanıta dayandırmayı tercih ederim.', facet: 'Veri Analizi' },
  { id: 21, domainId: 'analytical', text_tr: 'Olayları bütünsel bir bakış açısıyla değerlendirip, sistemdeki bağlantıları görmeyi severim.', facet: 'Sistem Düşüncesi' },

  // İletişim (Communication)
  { id: 22, domainId: 'communication', text_tr: 'Fikirlerimi ikna edici bir şekilde sunabilir ve insanları harekete geçirebilirim.', facet: 'İkna' },
  { id: 23, domainId: 'communication', text_tr: 'Karşımdaki kişinin perspektifini anlamak için aktif dinleme yaparım.', facet: 'Empati' },
  { id: 24, domainId: 'communication', text_tr: 'Karmaşık bilgileri anlaşılır ve etkili bir şekilde sunma konusunda yetenekliyim.', facet: 'Sunum' },
];

export const LIKERT_OPTIONS = [
  { value: 1, label: 'Kesinlikle katılmıyorum' },
  { value: 2, label: 'Katılmıyorum' },
  { value: 3, label: 'Kararsızım' },
  { value: 4, label: 'Katılıyorum' },
  { value: 5, label: 'Kesinlikle katılıyorum' },
];

/** Development suggestion map per domain */
export const DEVELOPMENT_SUGGESTIONS: Record<string, string[]> = {
  wisdom: [
    'Her hafta farklı bir disiplinden bir kitap veya makale okuyun',
    'Beyin fırtınası oturumları düzenleyin veya katılın',
    'Ters düşünceler (devil\'s advocate) tekniğini karar süreçlerinde uygulayın',
  ],
  courage: [
    'Konfor alanınızın dışındaki projelere gönüllü olun',
    'Zor konuşmalar için yapılandırılmış geri bildirim çerçeveleri kullanın',
    'Küçük adımlarla risk alma alışkanlığı geliştirin',
  ],
  humanity: [
    'Mentörlük veya koçluk programlarına katılın',
    'Aktif dinleme tekniklerini günlük iletişiminize entegre edin',
    'Departmanlar arası iş birliği projelerinde yer alın',
  ],
  justice: [
    'Takım retrospektifleri düzenleyerek herkesin sesini duyurun',
    'Liderlik eğitim programlarına katılın',
    'Çeşitlilik ve kapsayıcılık girişimlerinde aktif rol alın',
  ],
  temperance: [
    'Mindfulness ve meditasyon uygulamalarını günlük rutininize ekleyin',
    'Karar verme süreçlerinde 24 saat kuralını uygulayın',
    'Duygusal zeka atölyelerine katılın',
  ],
  transcendence: [
    'Günlük minnettarlık günlüğü tutun',
    'Takım motivasyonunu artıracak sosyal etkinlikler organize edin',
    'Vizyon oluşturma ve strateji çalışmalarına katkıda bulunun',
  ],
  analytical: [
    'Veri analizi ve görselleştirme araçlarını öğrenin',
    'Sistem düşüncesi atölyelerine katılın',
    'Karmaşık problemleri yapılandırılmış çerçevelerle (MECE, 5 Neden) çözün',
  ],
  communication: [
    'Sunum becerilerinizi geliştirmek için Toastmasters benzeri gruplara katılın',
    'Yazılı iletişim becerilerinizi blog yazarak veya raporlama ile güçlendirin',
    'Müzakere ve ikna teknikleri eğitimi alın',
  ],
};

/** Mock employee strengths for the overview list */
export interface EmployeeStrengthSummary {
  id: string;
  name: string;
  department: string;
  top3: { domainId: string; score: number }[];
  profileCompleteness: number;
  assessmentDate: string | null;
}

export const MOCK_EMPLOYEE_STRENGTHS: EmployeeStrengthSummary[] = [
  {
    id: '1',
    name: 'Zeynep Kaya',
    department: 'Mühendislik',
    top3: [
      { domainId: 'analytical', score: 4.7 },
      { domainId: 'wisdom', score: 4.3 },
      { domainId: 'courage', score: 4.1 },
    ],
    profileCompleteness: 92,
    assessmentDate: '2026-03-15',
  },
  {
    id: '2',
    name: 'Ahmet Yılmaz',
    department: 'Pazarlama',
    top3: [
      { domainId: 'communication', score: 4.8 },
      { domainId: 'transcendence', score: 4.4 },
      { domainId: 'humanity', score: 4.2 },
    ],
    profileCompleteness: 88,
    assessmentDate: '2026-03-10',
  },
  {
    id: '3',
    name: 'Elif Demir',
    department: 'İnsan Kaynakları',
    top3: [
      { domainId: 'humanity', score: 4.9 },
      { domainId: 'justice', score: 4.5 },
      { domainId: 'temperance', score: 4.3 },
    ],
    profileCompleteness: 95,
    assessmentDate: '2026-03-20',
  },
  {
    id: '4',
    name: 'Murat Öz',
    department: 'Finans',
    top3: [
      { domainId: 'analytical', score: 4.6 },
      { domainId: 'temperance', score: 4.4 },
      { domainId: 'justice', score: 4.0 },
    ],
    profileCompleteness: 78,
    assessmentDate: '2026-02-28',
  },
  {
    id: '5',
    name: 'Seda Arslan',
    department: 'Mühendislik',
    top3: [
      { domainId: 'wisdom', score: 4.5 },
      { domainId: 'analytical', score: 4.3 },
      { domainId: 'communication', score: 4.1 },
    ],
    profileCompleteness: 85,
    assessmentDate: '2026-03-05',
  },
  {
    id: '6',
    name: 'Can Türk',
    department: 'Satış',
    top3: [
      { domainId: 'communication', score: 4.7 },
      { domainId: 'courage', score: 4.5 },
      { domainId: 'transcendence', score: 4.2 },
    ],
    profileCompleteness: 90,
    assessmentDate: '2026-03-18',
  },
  {
    id: '7',
    name: 'Aylin Koç',
    department: 'Pazarlama',
    top3: [],
    profileCompleteness: 0,
    assessmentDate: null,
  },
  {
    id: '8',
    name: 'Burak Şen',
    department: 'Mühendislik',
    top3: [
      { domainId: 'courage', score: 4.6 },
      { domainId: 'analytical', score: 4.4 },
      { domainId: 'wisdom', score: 4.0 },
    ],
    profileCompleteness: 82,
    assessmentDate: '2026-03-01',
  },
  {
    id: '9',
    name: 'Deniz Yıldız',
    department: 'İnsan Kaynakları',
    top3: [
      { domainId: 'humanity', score: 4.7 },
      { domainId: 'communication', score: 4.5 },
      { domainId: 'transcendence', score: 4.1 },
    ],
    profileCompleteness: 91,
    assessmentDate: '2026-03-22',
  },
  {
    id: '10',
    name: 'Emre Aydın',
    department: 'Finans',
    top3: [],
    profileCompleteness: 0,
    assessmentDate: null,
  },
];

/** Mock department averages for peer comparison */
export const DEPARTMENT_AVERAGES: Record<string, Record<string, number>> = {
  Mühendislik: { wisdom: 3.8, courage: 3.5, humanity: 3.2, justice: 3.4, temperance: 3.1, transcendence: 3.0, analytical: 4.2, communication: 3.3 },
  Pazarlama: { wisdom: 3.4, courage: 3.3, humanity: 3.6, justice: 3.5, temperance: 3.2, transcendence: 3.7, analytical: 3.1, communication: 4.1 },
  'İnsan Kaynakları': { wisdom: 3.5, courage: 3.2, humanity: 4.1, justice: 3.8, temperance: 3.6, transcendence: 3.5, analytical: 3.0, communication: 3.9 },
  Finans: { wisdom: 3.6, courage: 3.1, humanity: 3.0, justice: 3.3, temperance: 3.7, transcendence: 2.9, analytical: 4.0, communication: 3.2 },
  Satış: { wisdom: 3.2, courage: 3.8, humanity: 3.4, justice: 3.3, temperance: 3.0, transcendence: 3.5, analytical: 3.0, communication: 4.3 },
};
