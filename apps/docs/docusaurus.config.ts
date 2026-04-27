import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import { themes as prismThemes } from "prism-react-renderer";

const SITE_URL = "https://docs.upcore.io";
const GITHUB_ORG_URL = "https://github.com/upcore";
const PRODUCT_URL = "https://upcore.io";

const config: Config = {
  title: "UpCore Docs",
  tagline:
    "Türkiye'nin ilk bilim-temelli İK platformu — self-serve rehber, API referansı, KVKK uyum.",
  favicon: "img/favicon.ico",

  url: SITE_URL,
  baseUrl: "/",
  trailingSlash: false,

  organizationName: "upcore",
  projectName: "upcore-platform",

  onBrokenLinks: "throw",
  onBrokenAnchors: "warn",
  onBrokenMarkdownLinks: "warn",
  onDuplicateRoutes: "throw",

  i18n: {
    defaultLocale: "tr",
    locales: ["tr", "en"],
    localeConfigs: {
      tr: {
        label: "Türkçe",
        direction: "ltr",
        htmlLang: "tr-TR",
        calendar: "gregory",
        path: "tr",
      },
      en: {
        label: "English",
        direction: "ltr",
        htmlLang: "en-US",
        calendar: "gregory",
        path: "en",
      },
    },
  },

  markdown: {
    mermaid: true,
    format: "detect",
  },

  themes: ["@docusaurus/theme-mermaid"],

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl: `${GITHUB_ORG_URL}/upcore-platform/tree/main/apps/docs/`,
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
          versions: {
            current: {
              label: "v2",
              path: "",
              banner: "none",
            },
          },
          lastVersion: "current",
          includeCurrentVersion: true,
          disableVersioning: false,
          breadcrumbs: true,
          remarkPlugins: [],
        },
        blog: {
          path: "changelog",
          routeBasePath: "changelog",
          blogTitle: "UpCore Changelog",
          blogDescription:
            "UpCore platformunun sürüm notları, kırılgan değişiklikler ve migrasyon rehberleri.",
          blogSidebarTitle: "Tüm sürümler",
          blogSidebarCount: "ALL",
          postsPerPage: 10,
          showReadingTime: true,
          feedOptions: {
            type: ["rss", "atom", "json"],
            title: "UpCore Changelog",
            description:
              "UpCore platformu için sürüm notları, yeni özellikler, düzeltmeler.",
            copyright: `Copyright © ${new Date().getFullYear()} UpCore Teknoloji A.Ş.`,
            language: "tr",
          },
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
        sitemap: {
          changefreq: "weekly",
          priority: 0.5,
          filename: "sitemap.xml",
          ignorePatterns: ["/tags/**"],
        },
        pages: {
          path: "src/pages",
          routeBasePath: "/",
          include: ["**/*.{js,jsx,ts,tsx,md,mdx}"],
          exclude: [
            "**/_*.{js,jsx,ts,tsx,md,mdx}",
            "**/_*/**",
            "**/*.test.{js,jsx,ts,tsx}",
            "**/__tests__/**",
          ],
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/social-card.png",
    colorMode: {
      defaultMode: "light",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    announcementBar: {
      id: "v2_preview",
      content:
        "UpCore v2 beta yayında. <a href='/docs/ik/hizli-baslangic/ilk-15-dakika'>İlk 15 dakika rehberini okuyun →</a>",
      backgroundColor: "#0f172a",
      textColor: "#f8fafc",
      isCloseable: true,
    },
    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: true,
      },
      versionPersistence: "localStorage",
    },
    navbar: {
      title: "UpCore",
      logo: {
        alt: "UpCore",
        src: "img/logo.svg",
        srcDark: "img/logo-dark.svg",
        href: "/",
      },
      hideOnScroll: false,
      items: [
        {
          type: "docSidebar",
          sidebarId: "employeeSidebar",
          position: "left",
          label: "Çalışan",
        },
        {
          type: "docSidebar",
          sidebarId: "managerSidebar",
          position: "left",
          label: "Yönetici",
        },
        {
          type: "docSidebar",
          sidebarId: "hrSidebar",
          position: "left",
          label: "İK",
        },
        {
          type: "docSidebar",
          sidebarId: "adminSidebar",
          position: "left",
          label: "Admin",
        },
        {
          type: "docSidebar",
          sidebarId: "developerSidebar",
          position: "left",
          label: "Geliştirici",
        },
        {
          to: "/changelog",
          label: "Changelog",
          position: "left",
        },
        {
          type: "docsVersionDropdown",
          position: "right",
          dropdownActiveClassDisabled: true,
        },
        {
          type: "localeDropdown",
          position: "right",
        },
        {
          href: PRODUCT_URL,
          label: "Ürün",
          position: "right",
        },
        {
          href: `${GITHUB_ORG_URL}/upcore-platform`,
          label: "GitHub",
          position: "right",
          "aria-label": "GitHub repo",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Doküman",
          items: [
            { label: "Çalışan rehberi", to: "/docs/calisan/giris" },
            { label: "Yönetici rehberi", to: "/docs/yonetici/giris" },
            { label: "İK rehberi", to: "/docs/ik/giris" },
            { label: "Admin rehberi", to: "/docs/admin/giris" },
            { label: "Geliştirici rehberi", to: "/docs/developer/giris" },
          ],
        },
        {
          title: "API",
          items: [
            { label: "REST API referans", to: "/docs/developer/api/genel-bakis" },
            { label: "Webhook", to: "/docs/developer/webhook/genel-bakis" },
            { label: "Rate limit", to: "/docs/developer/api/rate-limit" },
            { label: "Durum sayfası", href: "https://status.upcore.io" },
          ],
        },
        {
          title: "Uyum",
          items: [
            { label: "KVKK rehberi", to: "/docs/ik/kvkk/giris" },
            { label: "DPIA şablonu", to: "/docs/ik/modul/kvkk/dpia-sablon" },
            { label: "DPA şablonu", to: "/docs/admin/uyum/dpa-sablon" },
            { label: "ML model kartları", to: "/docs/developer/ml/model-kartlari" },
          ],
        },
        {
          title: "UpCore",
          items: [
            { label: "Ana sayfa", href: PRODUCT_URL },
            { label: "Blog", href: `${PRODUCT_URL}/blog` },
            { label: "İletişim", to: "/iletisim" },
            { label: "GitHub", href: `${GITHUB_ORG_URL}/upcore-platform` },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} UpCore Teknoloji A.Ş. · KVKK uyumlu · ISO 27001 hazırlık aşamasında · <a href="/hukuki/kullanim-sartlari">Kullanım şartları</a> · <a href="/hukuki/gizlilik">Gizlilik</a>`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: [
        "bash",
        "diff",
        "json",
        "yaml",
        "go",
        "python",
        "typescript",
        "tsx",
        "sql",
        "http",
        "nginx",
      ],
      magicComments: [
        {
          className: "theme-code-block-highlighted-line",
          line: "highlight-next-line",
          block: { start: "highlight-start", end: "highlight-end" },
        },
        {
          className: "code-block-error-line",
          line: "hata",
        },
      ],
    },
    algolia: {
      appId: process.env.ALGOLIA_APP_ID || "UPCORE_DOCSEARCH",
      apiKey: process.env.ALGOLIA_SEARCH_API_KEY || "REPLACE_IN_CI",
      indexName: "upcore-docs",
      contextualSearch: true,
      searchParameters: {
        hitsPerPage: 20,
        attributesToSnippet: ["content:40"],
        queryLanguages: ["tr", "en"],
        removeStopWords: ["tr", "en"],
      },
      searchPagePath: "search",
      insights: true,
    },
    mermaid: {
      theme: { light: "neutral", dark: "dark" },
    },
    metadata: [
      {
        name: "keywords",
        content:
          "UpCore, İK SaaS, JD-R modeli, BAT-TR, tükenmişlik, çalışan bağlılığı, KVKK, VERBIS, Türkiye İK",
      },
      { name: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@upcore_io" },
    ],
  } satisfies Preset.ThemeConfig,

  plugins: [],
};

export default config;
