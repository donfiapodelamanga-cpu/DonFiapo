"use client";

import { siteConfig } from "@/config/site";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Mail, Bell, Check, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import Image from "next/image";

import { TermsModal } from "@/components/modals/TermsModal";

interface IcoWaitlistModalProps {
    isOpen: boolean;
    onClose: () => void;
    autoOpen?: boolean; // New prop to handle auto open behavior specific logic if needed
}

export function IcoWaitlistModal({ isOpen, onClose }: IcoWaitlistModalProps) {
    const t = useTranslations("modal");
    const [mounted, setMounted] = useState(false);
    const [email, setEmail] = useState("");
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Time left calculation
    const [timeLeft, setTimeLeft] = useState({
        days: 30, // Default start
        hours: 0,
        minutes: 0,
        seconds: 0
    });

    useEffect(() => {
        setMounted(true);

        let targetDate: Date;
        try {
            targetDate = new Date(siteConfig.icoLaunchDate);
            // Validate date
            if (isNaN(targetDate.getTime())) {
                console.error("Invalid ICO Launch Date configured:", siteConfig.icoLaunchDate);
                // Fallback to 30 days from now if configuration is invalid
                targetDate = new Date();
                targetDate.setDate(targetDate.getDate() + 30);
            }
        } catch (e) {
            console.error("Error parsing ICO date:", e);
            targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + 30);
        }

        // Timer Logic
        const timer = setInterval(() => {
            const now = new Date();
            const difference = targetDate.getTime() - now.getTime();

            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                });
            } else {
                clearInterval(timer);
                // Optional: Handled expired state
            }
        }, 1000);

        return () => {
            clearInterval(timer);
            setMounted(false);
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsSubmitting(true);

        try {
            const res = await fetch("/api/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, source: "waitlist_modal" }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.message || "Failed to subscribe");
            }

            setIsSuccess(true);
        } catch (error) {
            console.error("Subscription error:", error);
            // Ideally we would show a toast error here
        } finally {
            setIsSubmitting(false);
        }
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
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg"
                    >
                        <div className="relative bg-[#0a0a0a] border border-golden/30 rounded-2xl overflow-hidden shadow-2xl shadow-golden/10">

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors z-10"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Decorative Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-golden/5 to-purple-500/5 pointer-events-none" />
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-golden to-transparent opacity-50" />

                            <div className="relative p-6 md:p-8 space-y-6 text-center">

                                {/* Header */}
                                <div className="space-y-4">
                                    <div className="flex justify-center">
                                        <div className="relative w-24 h-24 rounded-full border-2 border-golden/30 shadow-lg shadow-golden/20 overflow-hidden bg-black/50">
                                            <Image
                                                src="/images/logo-round.png"
                                                alt="Don Fiapo Logo"
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    </div>

                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-golden/10 border border-golden/20 rounded-full text-xs font-bold text-golden mb-2">
                                        <Clock className="w-3 h-3" />
                                        {t('title')}
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-bold text-white font-display uppercase tracking-tight leading-tight">
                                        {t('description') || t.raw('desc') || "Don Fiapo"} <br />
                                    </h2>
                                    <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                                        {t('desc')}
                                    </p>
                                </div>

                                {/* Countdown */}
                                <div className="grid grid-cols-4 gap-2 md:gap-4 py-4">
                                    {[
                                        { label: "Days", value: timeLeft.days },
                                        { label: "Hours", value: timeLeft.hours },
                                        { label: "Mins", value: timeLeft.minutes },
                                        { label: "Secs", value: timeLeft.seconds }
                                    ].map((item, i) => (
                                        <div key={i} className="flex flex-col items-center p-3 bg-white/5 border border-white/10 rounded-xl">
                                            <span className="text-2xl md:text-3xl font-bold font-mono text-white tabular-nums">
                                                {String(item.value).padStart(2, '0')}
                                            </span>
                                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                                {item.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Form or Success State */}
                                <div className="min-h-[140px] flex items-center justify-center">
                                    {!isSuccess ? (
                                        <form onSubmit={handleSubmit} className="w-full space-y-3">
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input
                                                    type="email"
                                                    placeholder="Enter your email address"
                                                    className="pl-10 h-12 bg-white/5 border-white/10 focus:border-golden/50 transition-all font-medium"
                                                    value={email}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <Button
                                                type="submit"
                                                size="lg"
                                                className="w-full h-12 bg-golden hover:bg-golden/80 text-black font-bold text-base transition-all"
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting ? (
                                                    "Joining..."
                                                ) : (
                                                    <>
                                                        {t('cta')} <Bell className="w-4 h-4 ml-2" />
                                                    </>
                                                )}
                                            </Button>

                                            {/* Telegram Community Section */}
                                            <div className="pt-4 border-t border-white/5 space-y-3">
                                                <p className="text-xs text-golden font-medium uppercase tracking-widest opacity-80">
                                                    {t('telegramTitle')}
                                                </p>
                                                <Button
                                                    variant="outline"
                                                    className="w-full border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-400 group h-10 text-xs"
                                                    onClick={() => window.open('https://t.me/donfiapodelamanga', '_blank')}
                                                    type="button"
                                                >
                                                    {t('telegramBtn')}
                                                    <ExternalLink className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
                                                </Button>
                                            </div>
                                        </form>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="w-full space-y-4"
                                        >
                                            <div className="flex flex-col items-center justify-center p-4 bg-green-500/10 border border-green-500/20 rounded-xl space-y-2">
                                                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/20">
                                                    <Check className="w-6 h-6 text-black" />
                                                </div>
                                                <div className="text-center">
                                                    <h3 className="font-bold text-green-400">{t('successTitle')}</h3>
                                                    <p className="text-xs text-green-200/70">{t('successDesc')}</p>
                                                </div>
                                            </div>

                                            <Button
                                                variant="outline"
                                                className="w-full border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-400 group"
                                                onClick={() => window.open('https://t.me/donfiapodelamanga', '_blank')}
                                                type="button"
                                            >
                                                Join Official Telegram
                                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                            </Button>
                                        </motion.div>
                                    )}
                                </div>

                                <p className="text-[10px] text-muted-foreground/60">
                                    By joining, you agree to receive updates about Don Fiapo project. <br />
                                    We respect your privacy. No spam, only memes.
                                </p>

                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
