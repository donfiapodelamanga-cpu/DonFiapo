"use client";

import { useTranslations } from "next-intl";
import { useEffect, useCallback, useState } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Crown, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrestigeCelebrationProps {
    isVisible: boolean;
    onClose: () => void;
    bonusAmount?: number;
    tierName?: string;
}

// Format number with commas
function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
}

export function PrestigeCelebration({
    isVisible,
    onClose,
    bonusAmount = 0,
    tierName = "NFT"
}: PrestigeCelebrationProps) {
    const t = useTranslations("ico");
    const tCommon = useTranslations("common");
    const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);

    // Fire confetti burst
    const fireConfetti = useCallback(() => {
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        function randomInRange(min: number, max: number) {
            return Math.random() * (max - min) + min;
        }

        const interval: ReturnType<typeof setInterval> = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);

            // Fire from left side
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                colors: ['#FFD700', '#FDB931', '#FFFFFF', '#D1D5DB'] // Gold, Amber, White, Gray
            });

            // Fire from right side
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                colors: ['#FFD700', '#FDB931', '#FFFFFF', '#D1D5DB']
            });
        }, 250);
    }, []);

    // Trigger confetti when celebration becomes visible
    useEffect(() => {
        if (isVisible && !hasTriggeredConfetti) {
            fireConfetti();
            setHasTriggeredConfetti(true);
        }
        if (!isVisible) {
            setHasTriggeredConfetti(false);
        }
    }, [isVisible, hasTriggeredConfetti, fireConfetti]);

    // Auto-dismiss after 8 seconds
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, y: 50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 20 }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 25,
                            delay: 0.1
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative max-w-md w-[90%] mx-4 p-8 bg-black border-2 border-golden rounded-3xl shadow-2xl shadow-golden/20 overflow-hidden"
                    >
                        {/* Background subtle effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-golden/5 to-transparent pointer-events-none" />

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-golden transition-colors z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Sparkle decorations */}
                        <div className="absolute -top-3 -left-3">
                            <Sparkles className="w-8 h-8 text-golden animate-pulse" />
                        </div>
                        <div className="absolute -top-3 -right-3">
                            <Sparkles className="w-8 h-8 text-golden animate-pulse" />
                        </div>
                        <div className="absolute -bottom-3 -left-3">
                            <Sparkles className="w-6 h-6 text-golden/50 animate-pulse" />
                        </div>
                        <div className="absolute -bottom-3 -right-3">
                            <Sparkles className="w-6 h-6 text-golden/50 animate-pulse" />
                        </div>

                        {/* Content */}
                        <div className="text-center space-y-5 relative z-10">
                            {/* Crown icon */}
                            <motion.div
                                animate={{
                                    rotate: [0, -10, 10, -10, 0],
                                    scale: [1, 1.1, 1]
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    repeatDelay: 2
                                }}
                                className="w-20 h-20 mx-auto bg-golden rounded-full flex items-center justify-center shadow-lg shadow-golden/40"
                            >
                                <Crown className="w-10 h-10 text-black" />
                            </motion.div>

                            {/* Title */}
                            <motion.h2
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-3xl font-black font-display text-golden uppercase tracking-wide"
                            >
                                {t('prestige.congrats')}
                            </motion.h2>

                            {/* Description */}
                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-muted-foreground text-lg"
                            >
                                {t('prestige.congratsDesc')}
                            </motion.p>

                            {/* Bonus Amount */}
                            {bonusAmount > 0 && (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.4, type: "spring" }}
                                    className="p-4 bg-golden/10 border border-golden/30 rounded-2xl backdrop-blur-sm"
                                >
                                    <p className="text-sm text-golden/80 mb-1 font-medium">{t('prestige.bonusLabel')}</p>
                                    <p className="text-5xl font-black text-golden drop-shadow-sm font-display">
                                        +{formatNumber(bonusAmount)} <span className="text-2xl text-golden/80">$FIAPO</span>
                                    </p>
                                </motion.div>
                            )}

                            {/* Info */}
                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-xs text-zinc-500 font-medium"
                            >
                                {t('prestige.vestingInfo')}
                            </motion.p>

                            {/* CTA Button */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.6 }}
                            >
                                <Button
                                    onClick={onClose}
                                    className="w-full bg-golden hover:bg-golden/90 text-black font-bold py-6 text-lg rounded-xl shadow-lg shadow-golden/20"
                                >
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    {tCommon('continue')}
                                </Button>
                            </motion.div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
