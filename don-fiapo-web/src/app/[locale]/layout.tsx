import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Montserrat, Anton } from "next/font/google";
import { locales, type Locale } from "@/config/i18n";
import { Header, Footer } from "@/components/layout";
import { WalletProvider } from "@/components/providers/wallet-provider";
import { ToastProvider } from "@/components/ui/toast";
import { ErrorLogger } from "@/components/debug/error-logger";
import JsonLd from "@/components/seo/JsonLd";
import { WebMcpScript } from "@/components/webmcp/WebMcpScript";
import { WebMCPInitializer } from "@/components/webmcp/WebMCPInitializer";
import "../globals.css";
import { GlobalAlert } from "@/components/layout/global-alert";
import React from "react";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

// Anton - Tall, thick, condensed sans-serif
// Fits "smooth, thick and sans-serif" and is less "fat" than Alfa Slab One
const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    metadataBase: new URL("https://donfiapo.fun"),
    title: t("title"),
    description: t("description"),
    keywords: t("keywords").split(", "),
    authors: [{ name: "Don Fiapo" }],
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: `https://donfiapo.fun/${locale}`,
      siteName: "Don Fiapo",
      type: "website",
      images: [
        {
          url: "/hero-bg.png",
          width: 1200,
          height: 630,
          alt: "Don Fiapo",
        },
      ],
      locale: locale,
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: ["/hero-bg.png"],
    },
    alternates: {
      canonical: `https://donfiapo.fun/${locale}`,
      languages: {
        en: "https://donfiapo.fun/en",
        es: "https://donfiapo.fun/es",
        fr: "https://donfiapo.fun/fr",
        pt: "https://donfiapo.fun/pt",
        ru: "https://donfiapo.fun/ru",
        zh: "https://donfiapo.fun/zh",
        "x-default": "https://donfiapo.fun/en"
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages({ locale });

  return (
    <html lang={locale} className={`${montserrat.variable} ${anton.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
        <JsonLd />
        <WebMcpScript />
        <WebMCPInitializer />
        {process.env.NODE_ENV === 'development' && <ErrorLogger />}
        <NextIntlClientProvider locale={locale} messages={messages}>
          <WalletProvider>
            <ToastProvider>
              <div className="relative flex min-h-screen flex-col">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
                <GlobalAlert />
              </div>
            </ToastProvider>
          </WalletProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
