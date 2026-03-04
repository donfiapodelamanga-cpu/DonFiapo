import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Royal Airdrop — Claim Free $FIAPO Tokens | Don Fiapo Kingdom",
    description:
        "By Royal Decree of Don Fiapo, millions of dollars in $FIAPO tokens are being distributed for free. Complete missions, earn points, and claim your share of the Crypto Airdrop 2026. Free Token Distribution for the Web3 Kingdom.",
    keywords: [
        "Crypto Airdrop 2026",
        "Free Token Distribution",
        "Don Fiapo Rewards",
        "Web3 Kingdom",
        "$FIAPO Airdrop",
        "Memecoin Airdrop",
        "Free Crypto",
        "Don Fiapo De la Manga",
        "Lunes Blockchain Airdrop",
    ],
    openGraph: {
        title: "Royal Decree: Millions in $FIAPO Airdrops Await!",
        description:
            "The gates to the Royal Treasury are open! Don Fiapo is distributing MILLIONS in $FIAPO tokens. Claim your noble share before the civilians arrive.",
        url: "https://donfiapo.fun/airdrop",
        siteName: "Don Fiapo De la Manga",
        images: [
            {
                url: "https://donfiapo.fun/og.jpg",
                width: 1200,
                height: 630,
                alt: "Don Fiapo Royal Airdrop 2026 — Free $FIAPO Token Distribution",
            },
        ],
        locale: "en_US",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Royal Decree: Millions in $FIAPO Airdrops Await!",
        description:
            "Don Fiapo is distributing MILLIONS in free $FIAPO tokens. Complete quests, earn points & claim your Royal Airdrop. Join the Web3 Kingdom now!",
        images: ["https://donfiapo.fun/og.jpg"],
        creator: "@DonFiapo",
        site: "@DonFiapo",
    },
    alternates: {
        canonical: "https://donfiapo.fun/airdrop",
    },
};

export default async function AirdropLayout({
    children,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    return <>{children}</>;
}
