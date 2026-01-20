"use client";

import { FC, useState, useEffect, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Star, Shield, Gift, Crown, Loader2, Ticket, X } from 'lucide-react';
import { PaymentModal, SpinPackage } from '@/components/games/payment-modal';
import { connectToLunes } from '@/lib/web3/lunes';
import SpinGameClient from '@/lib/contracts/spin-game-client';
import { cn } from '@/lib/utils';

const prizes = SpinGameClient.getPrizeList().map((p, i) => ({
  ...p,
  icon: i === 0 ? <Star /> : i === 1 ? <Star /> : i === 2 ? <Shield /> : i === 3 ? <Gift /> : i === 4 ? <Star /> : i === 5 ? <Gift /> : i === 6 ? <Gift /> : i === 7 ? <Crown /> : i === 8 ? <Shield /> : i === 9 ? <Star /> : i === 10 ? <Shield /> : <X />,
}));

const SpinWheel: FC<{ rotation: number; isSpinning: boolean; onSpin: () => void; disabled: boolean }> = ({ rotation, isSpinning, onSpin, disabled }) => {
  const t = useTranslations('Games.spin');
  const wheelSize = 400;
  const segmentAngle = 360 / prizes.length;

  return (
    <div className="relative flex items-center justify-center" style={{ width: wheelSize, height: wheelSize }}>
      {/* Marcador/Ponteiro */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }}>
        <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-red-600"></div>
      </div>

      {/* Roda */}
      <div
        className="relative w-full h-full rounded-full border-8 border-golden bg-card shadow-2xl transition-transform duration-[4000ms] ease-out"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {prizes.map((prize, index) => {
          const angle = index * segmentAngle;
          return (
            <div
              key={index}
              className="absolute w-1/2 h-1/2 origin-bottom-right flex items-center justify-start pt-4 pl-4"
              style={{ transform: `rotate(${angle}deg)` }}
            >
              <div
                className="absolute inset-0 border-r-2 border-golden/20"
                style={{
                  clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                  backgroundColor: prize.color + '20',
                  transform: `rotate(${segmentAngle}deg)`,
                  transformOrigin: '0 100%'
                }}
              />
              <div style={{ transform: `rotate(${segmentAngle / 2}deg) translate(-50%, -50%)` }} className="relative left-1/4 top-1/4 w-2/3 text-center">
                <div className="text-white/90 text-xs font-bold -rotate-90 flex flex-col items-center gap-1">
                  <div className="w-5 h-5" style={{ color: prize.color }}>{prize.icon}</div>
                  <span className="text-[10px]">{prize.name.split(' ')[0]}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botão Central */}
      <button
        onClick={onSpin}
        disabled={disabled || isSpinning}
        className="absolute w-28 h-28 rounded-full bg-background border-4 border-golden flex items-center justify-center z-10 hover:bg-golden/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg"
      >
        {isSpinning ? (
          <Loader2 className="w-10 h-10 text-golden animate-spin" />
        ) : (
          <span className="font-display text-golden text-3xl transition-transform duration-300 group-hover:scale-110">{t('spinBtn')}</span>
        )}
      </button>
    </div>
  );
};

const spinPackages: SpinPackage[] = [
  { spins: 1, price: 0.10 },
  { spins: 5, price: 0.50 },
  { spins: 25, price: 1.50 },
  { spins: 50, price: 3.00 },
  { spins: 100, price: 6.00 },
  { spins: 200, price: 12.00 },
];

const SpinPage: FC = () => {
  const t = useTranslations('Games.spin');
  const tCommon = useTranslations('common');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<SpinPackage | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinBalance, setSpinBalance] = useState(3); // Inicia com 3 para teste
  const [lastPrize, setLastPrize] = useState<typeof prizes[0] | null>(null);

  useEffect(() => {
    const initConnection = async () => {
      try {
        await connectToLunes();
      } catch (error) {
        console.error('Erro ao conectar à rede Lunes:', error);
      }
    };
    initConnection();
  }, []);

  const handlePackageSelect = (pkg: SpinPackage) => {
    setSelectedPackage(pkg);
    setIsModalOpen(true);
  };

  const handleSpin = async () => {
    if (spinBalance <= 0 || isSpinning) return;

    setIsSpinning(true);
    setLastPrize(null);

    // --- SIMULATED LOGIC (Mirrors Smart Contract for UX) ---
    // In production, this result comes from the contract event

    // Determine last package tier (simulated based on typical behavior or random for now if not tracking history locally)
    // Ideally we'd track 'last purchased tier'. For simulation, let's assume Tier 2 (25 spins) as average behavior or randomize it.
    // Better: let's use a simple simulation of the weighted probabilities based on a "default" tier (Tier 0 or 2).
    // Let's simulate Tier 2 (25 spins) probabilities: USDT 3%, FIAPO 55%, Boost 22%, Nada 20%

    const rng = Math.random() * 10000; // 0-9999
    let winningPrizeIndex = 11; // Default Nada

    // Simple simulation of Tier 2 (25 spins) weights
    // USDT (3%) -> 0-300
    // FIAPO (55%) -> 300-5800
    // Boost (22%) -> 5800-8000
    // Nada (20%) -> 8000-10000

    if (rng < 300) {
      // USDT: 80% chance of 1 USDT (Index 6), 20% chance of 5 USDT (Index 3)
      winningPrizeIndex = (Math.random() < 0.8) ? 6 : 3;
    } else if (rng < 5800) {
      // FIAPO
      const subRng = Math.random() * 100;
      if (subRng < 5) winningPrizeIndex = 4; // 1000 FIAPO
      else if (subRng < 30) winningPrizeIndex = 9; // 100 FIAPO
      else {
        // 0.5 FIAPO (Indices 2, 5, 8, 10)
        const indices = [2, 5, 8, 10];
        winningPrizeIndex = indices[Math.floor(Math.random() * indices.length)];
      }
    } else if (rng < 8000) {
      winningPrizeIndex = 7; // Boost
    } else {
      winningPrizeIndex = 11; // Nada
    }

    // Force Jackpot check (0.05%)
    if (Math.random() < 0.0005) winningPrizeIndex = 0;

    const prize = prizes[winningPrizeIndex];
    // -------------------------------------------------------

    // Calcula a rotação final
    const ROTATION_OFFSET = 135; // Calibrated offset based on empirical testing
    const segmentAngle = 360 / prizes.length;
    const randomOffset = (Math.random() - 0.5) * segmentAngle * 0.8;
    const baseRotation = rotation - (rotation % 360);

    // O ponteiro está no topo (270 graus ou -90 graus no sistema de coordenadas padrão se 0 for direita)
    // Mas aqui estamos girando a roda.
    // Se o prêmio é o índice 0. O ângulo dele é 0.
    // Para o índice 0 ficar no topo, a roda tem que girar X graus.
    const targetRotation = 360 * 5 + (360 - (winningPrizeIndex * segmentAngle)) + ROTATION_OFFSET + randomOffset;

    setRotation(baseRotation + targetRotation);
    setSpinBalance(prev => prev - 1);

    setTimeout(() => {
      setIsSpinning(false);
      setLastPrize(prize);
    }, 4000); // Duração da animação
  };

  const handleConfirmPurchase = async () => {
    if (!selectedPackage) return;
    console.log("Confirmando compra:", selectedPackage);
    setSpinBalance(prev => prev + selectedPackage.spins);
    setIsModalOpen(false);
  };

  return (
    <div className="relative overflow-hidden pt-32 pb-16 bg-background">
      <div
        className="absolute inset-0 bg-repeat bg-center opacity-5"
        style={{ backgroundImage: 'url(/images/hero-bg.png)' }}
      />
      <div className="container mx-auto px-4 relative">
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-bold font-display text-golden drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">{t('title')}</h1>
          <p className="text-lg text-foreground/80 mt-3 max-w-2xl mx-auto">{t('description')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            <SpinWheel
              rotation={rotation}
              isSpinning={isSpinning}
              onSpin={handleSpin}
              disabled={spinBalance <= 0}
            />
          </div>

          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-card/80 backdrop-blur-sm border border-golden/20 rounded-xl p-6 text-center">
              <p className="text-lg text-foreground/80">{t('youHave')}</p>
              <p className="text-6xl font-bold text-golden drop-shadow-lg">{spinBalance}</p>
              <p className="text-lg text-foreground/80">{t('spinsLeft')}</p>
            </div>

            {lastPrize && (
              <div className="bg-golden/10 border border-golden/30 rounded-xl p-4 text-center animate-fade-in">
                <p className="text-sm text-golden/80">{t('lastPrize')}</p>
                <p className="text-xl font-bold text-golden">{lastPrize.name}</p>
                <p className="text-xs text-foreground/70">{lastPrize.description}</p>
              </div>
            )}

            <div className="bg-card/80 backdrop-blur-sm border border-golden/20 rounded-xl p-6">
              <h3 className="text-2xl font-bold font-display text-golden mb-4 text-center flex items-center justify-center gap-2"><Ticket /> {t('buySpins')}</h3>
              <div className="flex flex-col gap-3">
                {spinPackages.map((pkg) => (
                  <button
                    key={pkg.spins}
                    className="w-full bg-golden/80 hover:bg-golden text-background font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md"
                    onClick={() => handlePackageSelect(pkg)}
                  >
                    {pkg.spins} {pkg.spins > 1 ? t('spinsPlural') : t('spinSingular')} - {pkg.price.toFixed(2)} USDT
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <PaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedPackage={selectedPackage}
        onConfirm={handleConfirmPurchase}
      />
    </div>
  );
};

export default SpinPage;
