import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Montserrat, Anton } from "next/font/google";
import { locales, type Locale } from "@/config/i18n";
import { Header, Footer } from "@/components/layout";
import { WalletProvider } from "@/components/providers/wallet-provider";
import { ToastProvider } from "@/components/ui/toast";
import { ErrorLogger } from "@/components/debug/error-logger";
import "../globals.css";

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

export const metadata: Metadata = {
  title: "Don Fiapo Dela Manga - The Alpha of Memecoins",
  description: "He doesn't bark — he decrees. The blockchain now has a monarchy. Join the reign.",
  keywords: ["memecoin", "cryptocurrency", "NFT", "staking", "airdrop", "DeFi", "Lunes"],
  authors: [{ name: "Don Fiapo" }],
  openGraph: {
    title: "Don Fiapo de Manga",
    description: "The Alpha of Memecoins. The King of Decentralized Humor.",
    url: "https://donfiapo.com",
    siteName: "Don Fiapo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Don Fiapo de Manga",
    description: "The Alpha of Memecoins. The King of Decentralized Humor.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

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
        {process.env.NODE_ENV === 'development' && <ErrorLogger />}
        <NextIntlClientProvider locale={locale} messages={messages}>
          <WalletProvider>
            <ToastProvider>
              <div className="relative flex min-h-screen flex-col">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
            </ToastProvider>
          </WalletProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
