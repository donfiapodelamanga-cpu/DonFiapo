"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/navigation";
import Image from "next/image";
import { Menu, X, Crown, Loader2 } from "lucide-react";
import { LanguageSwitcher } from "./language-switcher";
import { WalletButton } from "@/components/wallet";

const navItems = [
  { href: "/", key: "home" },
  { href: "/ico", key: "ico" },
  { href: "/staking", key: "staking" },
  { href: "/simulations", key: "simulations" },
  { href: "/tokenomics", key: "tokenomics" },
  { href: "/airdrop", key: "airdrop" },
  { href: "/affiliate", key: "affiliate" },
  { href: "/ranking", key: "ranking" },
  { href: "/docs", key: "docs" },
];

export function Header() {
  const t = useTranslations("nav");
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleNavClick = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
    setIsOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      {/* Loading indicator */}
      {isPending && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-golden/20 overflow-hidden">
          <div className="h-full bg-golden animate-pulse w-1/3" style={{ animation: 'loading 1s ease-in-out infinite' }} />
        </div>
      )}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative w-12 h-12 rounded-full overflow-hidden border border-golden/20">
              <Image
                src="/images/logo-round.png"
                alt="Don Fiapo Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-xl font-bold font-display text-golden hidden sm:block">
              Don Fiapo
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="px-4 py-2 text-sm font-medium text-foreground/80 hover:text-golden transition-colors rounded-lg hover:bg-card"
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <div className="hidden sm:block">
              <WalletButton />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 text-foreground hover:text-golden"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden bg-card border-t border-border animate-in slide-in-from-top duration-200">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => handleNavClick(item.href)}
                className="px-4 py-3 text-left text-foreground hover:text-golden hover:bg-background rounded-lg transition-colors"
              >
                {t(item.key)}
              </button>
            ))}
            <div className="mt-4">
              <WalletButton />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
