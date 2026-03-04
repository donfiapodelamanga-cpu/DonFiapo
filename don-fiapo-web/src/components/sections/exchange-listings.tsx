"use client";

import { motion } from "framer-motion";

interface Exchange {
  name: string;
  logo: string;
  status: "Listed" | "Soon";
  bg: string;
  color: string;
}

const EXCHANGES: Exchange[] = [
  {
    name: "Binance",
    logo: "/exchanges/binance.svg",
    status: "Soon",
    bg: "#1A1000",
    color: "#F0B90B",
  },
  {
    name: "OKX",
    logo: "/exchanges/okx.svg",
    status: "Soon",
    bg: "#111111",
    color: "#ffffff",
  },
  {
    name: "Bybit",
    logo: "/exchanges/bybit.svg",
    status: "Soon",
    bg: "#1A1100",
    color: "#F7A600",
  },
  {
    name: "KuCoin",
    logo: "/exchanges/kucoin.svg",
    status: "Soon",
    bg: "#0A1F18",
    color: "#23AF91",
  },
  {
    name: "MEXC",
    logo: "/exchanges/mexc.svg",
    status: "Soon",
    bg: "#020D20",
    color: "#2B4ACB",
  },
  {
    name: "Bitget",
    logo: "/exchanges/bitget.svg",
    status: "Soon",
    bg: "#00151A",
    color: "#00F0FF",
  },
  {
    name: "Bitmart",
    logo: "/exchanges/bitmart.svg",
    status: "Soon",
    bg: "#111111",
    color: "#ffffff",
  },
  {
    name: "LBank",
    logo: "/exchanges/lbank.svg",
    status: "Soon",
    bg: "#1A1100",
    color: "#F7A600",
  },
  {
    name: "XT.COM",
    logo: "/exchanges/xt.svg",
    status: "Soon",
    bg: "#00151A",
    color: "#00F0FF",
  },
  {
    name: "BingX",
    logo: "/exchanges/bingx.svg",
    status: "Soon",
    bg: "#020D20",
    color: "#2B4ACB",
  },
  {
    name: "CoinEx",
    logo: "/exchanges/coinex.svg",
    status: "Soon",
    bg: "#0A1F18",
    color: "#23AF91",
  },
  {
    name: "DigiFinex",
    logo: "/exchanges/digifinex.svg",
    status: "Soon",
    bg: "#111111",
    color: "#ffffff",
  },
  {
    name: "CEX.IO",
    logo: "/exchanges/cexio.svg",
    status: "Soon",
    bg: "#1A1000",
    color: "#F0B90B",
  },
  {
    name: "Upbit",
    logo: "/exchanges/upbit.svg",
    status: "Soon",
    bg: "#050E2A",
    color: "#2354E6",
  },
  {
    name: "Dex-Trade",
    logo: "/exchanges/dextrade.svg",
    status: "Soon",
    bg: "#111111",
    color: "#ffffff",
  },
  {
    name: "Lunes DEX",
    logo: "/exchanges/lunes.svg",
    status: "Listed",
    bg: "#1A1200",
    color: "#D4AF37",
  },
];

const TRACK = [...EXCHANGES, ...EXCHANGES, ...EXCHANGES];

export function ExchangeListingsSection() {
  return (
    <section className="relative py-12 overflow-hidden border-y border-golden/10 bg-gradient-to-b from-black/60 to-black/30">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-golden/50 mb-1">
          Listed &amp; Coming Soon
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-golden">
          Royal Exchange Listings
        </h2>
      </motion.div>

      {/* Edge fade masks */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-32 z-10 bg-gradient-to-r from-black to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-32 z-10 bg-gradient-to-l from-black to-transparent" />

      {/* Marquee wrapper */}
      <div className="flex overflow-hidden select-none">
        <div
          className="flex gap-5 items-center animate-marquee"
          style={{ animationDuration: "40s" }}
        >
          {TRACK.map((ex, i) => (
            <div
              key={i}
              className="flex-shrink-0 flex flex-col items-center gap-3 w-32 group cursor-default"
            >
              {/* Card */}
              <div
                className="relative w-24 h-24 rounded-2xl flex items-center justify-center border border-white/[0.06] overflow-hidden transition-all duration-300 group-hover:scale-110 group-hover:border-golden/40"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${ex.color}22, ${ex.bg} 70%)`,
                  boxShadow: `0 0 0 0 ${ex.color}00`,
                }}
              >
                {/* Glow on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                  style={{ boxShadow: `inset 0 0 20px ${ex.color}33` }}
                />

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ex.logo}
                  alt={ex.name}
                  className={`${
                    ['Bitmart', 'BingX', 'Binance', 'LBank'].includes(ex.name)
                      ? 'w-14 h-14'
                      : 'w-12 h-12'
                  } object-contain relative z-10`}
                  loading="lazy"
                  onError={(e) => {
                    const el = e.currentTarget as HTMLImageElement;
                    el.style.display = "none";
                    const parent = el.parentElement;
                    if (parent && !parent.querySelector("span.fallback")) {
                      const span = document.createElement("span");
                      span.className = "fallback text-2xl font-black";
                      span.style.color = ex.color;
                      span.textContent = ex.name.slice(0, 2).toUpperCase();
                      parent.appendChild(span);
                    }
                  }}
                />

                {/* Live pulse dot */}
                {ex.status === "Listed" && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_3px_rgba(74,222,128,0.7)]" />
                )}
              </div>

              {/* Name */}
              <div className="text-center">
                <span className="text-[11px] font-semibold text-neutral-400 group-hover:text-white transition-colors">
                  {ex.name}
                </span>
                {ex.status === "Listed" ? (
                  <span className="block text-[9px] text-green-400 font-bold mt-0.5">● Live</span>
                ) : (
                  <span className="block text-[9px] text-golden/40 mt-0.5">Soon™</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
