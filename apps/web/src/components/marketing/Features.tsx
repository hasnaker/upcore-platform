import { BookOpen, Flame, Target, Users } from 'lucide-react';

const features = [
  {
    icon: BookOpen,
    title: 'Bilimsel Temel',
    description:
      'JD-R Modeli (Bakker & Demerouti 2007), BAT-12-TR (Koçak 2022, N=2778), COPSOQ-III-TR (Şahan 2019) — tüm ölçüm araçlarımız peer-reviewed literatüre dayanır.',
  },
  {
    icon: Flame,
    title: 'Tükenmişlik Yönetimi',
    description:
      'BAT-TR skorları, departman bazlı ısı haritası ve erken uyarı sistemi ile tükenmişliği riske dönüşmeden tespit edin.',
  },
  {
    icon: Users,
    title: 'Çalışan Deneyimi',
    description:
      'Pulse anketleri, değerlendirmeler ve job crafting araçlarıyla çalışan bağlılığını sürekli ölçün.',
  },
  {
    icon: Target,
    title: 'Aksiyon Merkezi',
    description:
      'Verilerden içgörü değil, aksiyon çıkarın. Öncelikli müdahaleler, sorumlu atama ve sonuç takibi tek panelde.',
  },
];

export function Features() {
  return (
    <section className="border-b border-line bg-bg-2">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-24">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Veriye değil, bilime dayalı İK
          </h2>
          <p className="mt-4 text-ink-60">
            Türkiye pazarına özel, bilimsel validasyonu yapılmış ölçüm araçlarıyla İK
            ekiplerinize kanıta dayalı karar verme gücü sağlıyoruz.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-lg border border-line bg-bg p-6 transition-colors hover:border-ink-20"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-soft text-accent">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-ink">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-60">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
