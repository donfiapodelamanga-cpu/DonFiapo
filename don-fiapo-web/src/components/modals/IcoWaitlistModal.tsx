"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, Gift, Sparkles, ArrowRight, ExternalLink, Shield, Users, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface IcoWaitlistModalProps {
    isOpen: boolean;
    onClose: () => void;
    autoOpen?: boolean;
}

export function IcoWaitlistModal({ isOpen, onClose }: IcoWaitlistModalProps) {
    const t = useTranslations("modal");
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const handleClaimAirdrop = () => {
        // GA4 / GTM conversion tracking
        if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
            (window as any).gtag("event", "royal_decree_cta_click", {
                event_category: "conversion",
                event_label: "airdrop_decree_modal",
                value: 1,
            });
        }
        // dataLayer push for GTM
        if (typeof window !== "undefined" && (window as any).dataLayer) {
            (window as any).dataLayer.push({
                event: "royal_decree_cta_click",
                eventCategory: "conversion",
                eventLabel: "airdrop_decree_modal",
            });
        }

        onClose();
        router.push("/airdrop?tab=missions");
    };

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/85 backdrop-blur-md z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        transition={{ type: "spring", stiffness: 300, damping: 22 }}
                        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg"
                    >
                        <article
                            className="relative overflow-hidden rounded-2xl shadow-2xl shadow-golden/20"
                            itemScope
                            itemType="https://schema.org/Event"
                        >
                            {/* Hidden Schema.org metadata */}
                            <meta itemProp="name" content="Don Fiapo Royal Airdrop 2026 — Millions in Free $FIAPO Tokens" />
                            <meta itemProp="description" content="By Royal Decree of Don Fiapo, millions of dollars in $FIAPO tokens will be distributed for free. Claim your share of the Royal Airdrop before civilians arrive." />
                            <meta itemProp="startDate" content="2026-03-01" />
                            <meta itemProp="endDate" content="2026-12-31" />
                            <meta itemProp="eventAttendanceMode" content="https://schema.org/OnlineEventAttendanceMode" />
                            <meta itemProp="eventStatus" content="https://schema.org/EventScheduled" />
                            <span itemProp="location" itemScope itemType="https://schema.org/VirtualLocation">
                                <meta itemProp="url" content="https://donfiapo.fun/airdrop" />
                            </span>
                            <span itemProp="organizer" itemScope itemType="https://schema.org/Organization">
                                <meta itemProp="name" content="Don Fiapo De la Manga" />
                                <meta itemProp="url" content="https://donfiapo.fun" />
                            </span>
                            <span itemProp="offers" itemScope itemType="https://schema.org/Offer">
                                <meta itemProp="price" content="0" />
                                <meta itemProp="priceCurrency" content="USD" />
                                <meta itemProp="availability" content="https://schema.org/InStock" />
                                <meta itemProp="url" content="https://donfiapo.fun/airdrop" />
                                <meta itemProp="validFrom" content="2026-03-01" />
                            </span>

                            {/* Parchment-style background layers */}
                            <div className="absolute inset-0 bg-gradient-to-b from-[#1a1207] via-[#0d0a04] to-[#0a0804]" />
                            <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-golden to-transparent" />
                            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-golden/60 to-transparent" />
                            <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-transparent via-golden/30 to-transparent" />
                            <div className="absolute top-0 right-0 h-full w-1 bg-gradient-to-b from-transparent via-golden/30 to-transparent" />

                            {/* Glowing corners */}
                            <div className="absolute top-0 left-0 w-16 h-16 bg-golden/10 blur-2xl rounded-full" />
                            <div className="absolute top-0 right-0 w-16 h-16 bg-golden/10 blur-2xl rounded-full" />
                            <div className="absolute bottom-0 left-0 w-16 h-16 bg-golden/5 blur-2xl rounded-full" />
                            <div className="absolute bottom-0 right-0 w-16 h-16 bg-golden/5 blur-2xl rounded-full" />

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                aria-label="Close decree"
                                className="absolute top-4 right-4 text-golden/40 hover:text-golden transition-colors z-10 p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="relative p-6 md:p-8 space-y-5 text-center">

                                {/* Royal Seal */}
                                <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                                    className="flex justify-center"
                                >
                                    <div className="relative">
                                        <div className="absolute -inset-3 bg-golden/20 blur-xl rounded-full animate-pulse" />
                                        <div className="relative w-20 h-20 rounded-full border-2 border-golden shadow-lg shadow-golden/30 overflow-hidden bg-black/60">
                                            <Image
                                                src="/images/logo-round.png"
                                                alt="Royal Seal of Don Fiapo"
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Decree Badge */}
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="inline-flex items-center gap-2 px-4 py-1.5 bg-golden/15 border border-golden/40 rounded-full text-xs font-black text-golden uppercase tracking-[0.2em]"
                                >
                                    <Crown className="w-3.5 h-3.5" />
                                    {t("badge")}
                                </motion.div>

                                {/* Headline — semantic h1 for SEO */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    <h1 className="text-2xl md:text-3xl font-black text-golden font-display uppercase tracking-tight leading-tight drop-shadow-[0_0_12px_rgba(201,166,91,0.3)]">
                                        {t("headline")}
                                    </h1>
                                </motion.div>

                                {/* Decree divider */}
                                <div className="flex items-center gap-3 px-4">
                                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-golden/40 to-transparent" />
                                    <Sparkles className="w-4 h-4 text-golden/60" />
                                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-golden/40 to-transparent" />
                                </div>

                                {/* Decree Body — semantic h2 + p for SEO */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="space-y-3"
                                >
                                    <h2 className="sr-only">Crypto Airdrop 2026 — Free Token Distribution by Don Fiapo Kingdom</h2>
                                    <p className="text-sm md:text-base text-amber-100/80 leading-relaxed max-w-md mx-auto font-serif italic">
                                        &ldquo;{t("body")}&rdquo;
                                    </p>
                                    <p className="text-xs text-golden/50 font-display uppercase tracking-[0.15em]">
                                        — {t("signature")}
                                    </p>
                                </motion.div>

                                {/* Value Props */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                    className="grid grid-cols-3 gap-2 py-2"
                                >
                                    <div className="flex flex-col items-center gap-1 p-2 bg-golden/5 border border-golden/10 rounded-xl">
                                        <Coins className="w-4 h-4 text-golden" />
                                        <span className="text-lg font-black text-golden">30.5B</span>
                                        <span className="text-[9px] text-golden/60 uppercase tracking-wider">{t("stat1")}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 p-2 bg-golden/5 border border-golden/10 rounded-xl">
                                        <Gift className="w-4 h-4 text-golden" />
                                        <span className="text-lg font-black text-golden">100%</span>
                                        <span className="text-[9px] text-golden/60 uppercase tracking-wider">{t("stat2")}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 p-2 bg-golden/5 border border-golden/10 rounded-xl">
                                        <Users className="w-4 h-4 text-golden" />
                                        <span className="text-lg font-black text-golden">2.5%</span>
                                        <span className="text-[9px] text-golden/60 uppercase tracking-wider">{t("stat3")}</span>
                                    </div>
                                </motion.div>

                                {/* CTA Button */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.7, type: "spring", stiffness: 300, damping: 18 }}
                                >
                                    <Button
                                        size="lg"
                                        onClick={handleClaimAirdrop}
                                        className="w-full h-14 bg-gradient-to-r from-golden via-yellow-500 to-golden hover:from-golden/90 hover:via-yellow-400 hover:to-golden/90 text-black font-black text-base uppercase tracking-wide transition-all shadow-lg shadow-golden/30 hover:shadow-golden/50 group relative overflow-hidden"
                                    >
                                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                                        <span className="relative flex items-center justify-center gap-2">
                                            {t("cta")}
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </span>
                                    </Button>
                                </motion.div>

                                {/* Telegram + Social Proof */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.8 }}
                                    className="pt-3 border-t border-golden/10 space-y-3"
                                >
                                    <Button
                                        variant="outline"
                                        className="w-full border-golden/20 hover:bg-golden/5 hover:text-golden text-golden/70 group h-10 text-xs uppercase tracking-wider font-bold"
                                        onClick={() => window.open("https://t.me/donfiapodela", "_blank")}
                                        type="button"
                                    >
                                        <Shield className="w-3.5 h-3.5 mr-2" />
                                        {t("telegramBtn")}
                                        <ExternalLink className="w-3 h-3 ml-2 group-hover:translate-x-0.5 transition-transform" />
                                    </Button>

                                    <p className="text-[10px] text-golden/30 font-display tracking-wider">
                                        {t("privacyFooter")}
                                    </p>
                                </motion.div>

                            </div>
                        </article>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
