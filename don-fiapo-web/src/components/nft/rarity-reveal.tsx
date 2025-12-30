"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Star, Crown, Gem, Flame } from "lucide-react";
import { API_CONFIG, getRarityConfig } from "@/lib/api/config";
import type { VisualRarity } from "@/hooks/useEvolution";
import Image from "next/image";

interface RarityRevealProps {
  nftId: number;
  tierId: number;
  rarity: VisualRarity;
  onComplete?: () => void;
  autoPlay?: boolean;
}

const rarityParticles = {
  common: { count: 5, color: 'bg-gray-400' },
  uncommon: { count: 10, color: 'bg-green-400' },
  rare: { count: 20, color: 'bg-blue-400' },
  epic: { count: 30, color: 'bg-purple-400' },
  legendary: { count: 50, color: 'bg-yellow-400' },
};

const rarityIcons = {
  common: Star,
  uncommon: Sparkles,
  rare: Gem,
  epic: Crown,
  legendary: Flame,
};

export function RarityReveal({ 
  nftId, 
  tierId, 
  rarity, 
  onComplete,
  autoPlay = true 
}: RarityRevealProps) {
  const [phase, setPhase] = useState<'idle' | 'charging' | 'reveal' | 'complete'>('idle');
  const [showParticles, setShowParticles] = useState(false);
  
  const tierConfig = API_CONFIG.nftTiers[tierId];
  const rarityConfig = getRarityConfig(rarity);
  const particles = rarityParticles[rarity];
  const RarityIcon = rarityIcons[rarity];

  useEffect(() => {
    if (autoPlay) {
      startReveal();
    }
  }, [autoPlay]);

  const startReveal = () => {
    setPhase('charging');
    
    // Charging phase
    setTimeout(() => {
      setPhase('reveal');
      setShowParticles(true);
    }, 1500);

    // Complete phase
    setTimeout(() => {
      setPhase('complete');
      setShowParticles(false);
      onComplete?.();
    }, 4000);
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Card Container */}
      <motion.div
        className="relative aspect-square rounded-2xl overflow-hidden"
        animate={{
          scale: phase === 'charging' ? [1, 1.02, 1] : 1,
          rotateY: phase === 'reveal' ? [0, 360] : 0,
        }}
        transition={{
          scale: { duration: 0.5, repeat: phase === 'charging' ? Infinity : 0 },
          rotateY: { duration: 1, ease: 'easeInOut' },
        }}
      >
        {/* Background Glow */}
        <AnimatePresence>
          {(phase === 'charging' || phase === 'reveal') && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.2, 1],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity }}
              className={`absolute inset-0 ${rarityConfig.bgColor.replace('/20', '')} blur-3xl`}
            />
          )}
        </AnimatePresence>

        {/* NFT Image */}
        <motion.div
          className="relative w-full h-full"
          animate={{
            filter: phase === 'idle' ? 'brightness(0.3) blur(10px)' : 
                   phase === 'charging' ? 'brightness(0.5) blur(5px)' :
                   'brightness(1) blur(0px)',
          }}
          transition={{ duration: 0.5 }}
        >
          <Image
            src={tierConfig?.image || '/nfts/tier1-free.png'}
            alt={tierConfig?.name || 'NFT'}
            fill
            className="object-cover"
          />
        </motion.div>

        {/* Mystery Overlay */}
        <AnimatePresence>
          {phase === 'idle' && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/70"
            >
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="w-16 h-16 text-golden mx-auto mb-4" />
                </motion.div>
                <p className="text-xl font-bold text-white">Tap to Reveal</p>
                <p className="text-sm text-muted-foreground">NFT #{nftId}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Charging Animation */}
        <AnimatePresence>
          {phase === 'charging' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <motion.div
                className="w-32 h-32 rounded-full border-4 border-golden"
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [1, 0, 1],
                  borderWidth: ['4px', '2px', '4px'],
                }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rarity Badge Reveal */}
        <AnimatePresence>
          {phase === 'complete' && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="absolute bottom-4 left-4 right-4"
            >
              <div className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl ${rarityConfig.bgColor} backdrop-blur-sm`}>
                <RarityIcon className={`w-6 h-6 ${rarityConfig.color}`} />
                <span className={`text-xl font-bold ${rarityConfig.color}`}>
                  {rarityConfig.name}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Particle Effects */}
      <AnimatePresence>
        {showParticles && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: particles.count }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: '50%',
                  y: '50%',
                  scale: 0,
                  opacity: 1,
                }}
                animate={{ 
                  x: `${Math.random() * 100}%`,
                  y: `${Math.random() * 100}%`,
                  scale: [0, 1, 0],
                  opacity: [1, 1, 0],
                }}
                transition={{ 
                  duration: 2,
                  delay: Math.random() * 0.5,
                  ease: 'easeOut',
                }}
                className={`absolute w-2 h-2 rounded-full ${particles.color}`}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Tier Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: phase === 'complete' ? 1 : 0, y: phase === 'complete' ? 0 : 20 }}
        className="mt-4 text-center"
      >
        <h3 className="text-2xl font-bold">{tierConfig?.name}</h3>
        <p className="text-muted-foreground">{tierConfig?.shortName} Tier • NFT #{nftId}</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <span className="text-green-500 font-medium">
            +{tierConfig?.dailyMining.toLocaleString()}/day
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-golden font-medium">
            {tierConfig?.miningDays} days
          </span>
        </div>
      </motion.div>

      {/* Tap to Start */}
      {phase === 'idle' && !autoPlay && (
        <button
          onClick={startReveal}
          className="absolute inset-0 cursor-pointer"
          aria-label="Reveal rarity"
        />
      )}
    </div>
  );
}

// Mini version for card displays
export function RarityBadge({ rarity }: { rarity: VisualRarity }) {
  const config = getRarityConfig(rarity);
  const Icon = rarityIcons[rarity];
  
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 ${config.bgColor} ${config.color} text-xs font-medium rounded`}
    >
      {rarity !== 'common' && <Icon className="w-3 h-3" />}
      {config.name}
    </motion.span>
  );
}

// Animated legendary border for cards
export function LegendaryBorder({ children, rarity }: { children: React.ReactNode; rarity: VisualRarity }) {
  if (rarity !== 'legendary' && rarity !== 'epic') {
    return <>{children}</>;
  }
  
  const borderColor = rarity === 'legendary' ? 'from-yellow-400 via-orange-500 to-yellow-400' : 'from-purple-400 via-pink-500 to-purple-400';
  
  return (
    <div className="relative p-0.5 rounded-xl overflow-hidden">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        className={`absolute inset-0 bg-gradient-conic ${borderColor}`}
      />
      <div className="relative bg-card rounded-xl">
        {children}
      </div>
    </div>
  );
}
