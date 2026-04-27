import React from "react";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import Head from "@docusaurus/Head";

type AudienceCard = {
  icon: string;
  title: string;
  desc: string;
  href: string;
  cta: string;
};

const AUDIENCES: AudienceCard[] = [
  {
    icon: "🧑‍💻",
    title: "Çalışan",
    desc: "Pulse anketlerine nasıl cevap verilir, veri indirme, KVKK hakları.",
    href: "/docs/calisan/giris",
    cta: "Çalışan rehberine git",
  },
  {
    icon: "🧑‍💼",
    title: "Yönetici",
    desc: "Bire-bir görüşme, ekip pulse yorumlama, müdahale onayı.",
    href: "/docs/yonetici/giris",
    cta: "Yönetici rehberine git",
  },
  {
    icon: "🏢",
    title: "İK",
    desc: "Sürdürme, koruma, performans, mobility, KVKK — 8 modül rehberi.",
    href: "/docs/ik/giris",
    cta: "İK rehberine git",
  },
  {
    icon: "⚙️",
    title: "Admin",
    desc: "Tenant kurulumu, SSO, billing, feature flag, webhook.",
    href: "/docs/admin/giris",
    cta: "Admin rehberine git",
  },
  {
    icon: "💻",
    title: "Geliştirici",
    desc: "REST API referansı, webhook, SDK, ML model kartları.",
    href: "/docs/developer/giris",
    cta: "Geliştirici rehberine git",
  },
];

export default function Home(): JSX.Element {
  return (
    <Layout
      title="UpCore dokümantasyonu"
      description="UpCore platformu için çalışan, yönetici, İK, admin ve geliştirici rehberleri, API referansı, KVKK uyum ve ML model kartları."
    >
      <Head>
        <meta property="og:title" content="UpCore dokümantasyonu" />
        <meta
          property="og:description"
          content="Türkiye'nin ilk bilim-temelli İK platformu için self-serve dokümantasyon."
        />
        <link rel="alternate" hrefLang="tr" href="https://docs.upcore.io/" />
        <link rel="alternate" hrefLang="en" href="https://docs.upcore.io/en/" />
      </Head>

      <header className="upcore-hero">
        <div className="container">
          <h1 className="upcore-hero__title">UpCore Dokümantasyonu</h1>
          <p className="upcore-hero__subtitle">
            UpCore platformunun kullanıcı rehberleri, API referansı, KVKK uyum şablonları,
            ML model kartları ve sürüm notları — hepsi tek yerde.
          </p>
          <div className="upcore-hero__actions">
            <Link
              className="button button--primary button--lg"
              to="/docs/ik/hizli-baslangic/ilk-15-dakika"
            >
              İlk 15 dakika rehberi
            </Link>
            <Link
              className="button button--secondary button--lg"
              to="/docs/developer/api/genel-bakis"
            >
              API referansı
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="container">
          <div className="upcore-audience-grid" aria-label="Hedef kitle rehberleri">
            {AUDIENCES.map((a) => (
              <Link
                key={a.href}
                to={a.href}
                className="upcore-audience-card"
                aria-label={a.cta}
              >
                <span className="upcore-audience-card__icon" aria-hidden="true">
                  {a.icon}
                </span>
                <h2 className="upcore-audience-card__title">{a.title}</h2>
                <p className="upcore-audience-card__desc">{a.desc}</p>
                <span
                  style={{
                    marginTop: "0.5rem",
                    color: "var(--ifm-color-primary)",
                    fontWeight: 600,
                  }}
                >
                  {a.cta} →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section
          className="container"
          style={{ paddingBottom: "4rem", paddingTop: "1rem" }}
        >
          <h2>Popüler sayfalar</h2>
          <ul>
            <li>
              <Link to="/docs/ik/hizli-baslangic/ilk-pulse-anketi">
                İlk pulse anketini oluşturma
              </Link>
            </li>
            <li>
              <Link to="/docs/ik/modul/koruma/mudahale-katalogu">
                Evidence-based müdahale kataloğu
              </Link>
            </li>
            <li>
              <Link to="/docs/ik/modul/kvkk/madde-11-talep-yonetimi">
                KVKK Madde 11 talep yönetimi
              </Link>
            </li>
            <li>
              <Link to="/docs/developer/ml/model-kartlari">
                ML model kartları (Google Model Cards)
              </Link>
            </li>
            <li>
              <Link to="/changelog">Son sürüm notları ve changelog</Link>
            </li>
          </ul>
        </section>
      </main>
    </Layout>
  );
}
