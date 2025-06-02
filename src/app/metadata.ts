import { Metadata } from "next";

export const siteConfig = {
  name: "KDS Simulasi Bakteri",
  description:
    "Sistem simulasi pertumbuhan dan evolusi bakteri untuk analisis mikrobiologi",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://kds-simulasi-bakteri.vercel.app",
};

export const defaultMetadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "simulasi",
    "bakteri",
    "mikrobiologi",
    "evolusi",
    "pertumbuhan",
    "resistensi antibiotik",
    "computational biology",
    "bioinformatics",
  ],
  authors: [
    { name: "Aththariq Lisan Q. D. S." },
    { name: "Anthony Bryant Gouw" },
    { name: "Richie Leonardo" },
  ],
  creator: "KDS Team - Kelompok 6",
  publisher: "KDS",
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    type: "website",
    locale: "id_ID",
    siteName: siteConfig.name,
    url: siteConfig.url,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export const homePageMetadata: Metadata = {
  ...defaultMetadata,
  title: "Simulasi Resistensi Antibiotik Bakteri | KDS Simulasi Bakteri",
  description:
    "Platform simulasi interaktif untuk memodelkan evolusi bakteri dan penyebaran resistensi antibiotik menggunakan biologi komputasional dan visualisasi data",
  keywords: [
    ...defaultMetadata.keywords!,
    "resistensi antibiotik",
    "evolusi bakteri",
    "simulasi interaktif",
    "visualisasi data",
    "computational biology",
  ],
  openGraph: {
    ...defaultMetadata.openGraph,
    title: "Simulasi Resistensi Antibiotik Bakteri",
    description:
      "Platform simulasi interaktif untuk memodelkan evolusi bakteri dan penyebaran resistensi antibiotik",
  },
};
