"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { Crown, Twitter, Send, MessageCircle, Github } from "lucide-react";
import { siteConfig } from "@/config/site";

export function Footer() {
  const t = useTranslations("footer");

  const socialLinks = [
    { icon: Twitter, href: siteConfig.links.twitter, label: "Twitter" },
    { icon: Send, href: siteConfig.links.telegram, label: "Telegram" },
    { icon: MessageCircle, href: siteConfig.links.discord, label: "Discord" },
    { icon: Github, href: siteConfig.links.github, label: "GitHub" },
  ];

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-golden flex items-center justify-center">
                <Crown className="w-7 h-7 text-background" />
              </div>
              <div>
                <span className="text-2xl font-bold font-display text-golden">
                  Don Fiapo
                </span>
                <p className="text-sm text-muted-foreground">de Manga</p>
              </div>
            </Link>
            <p className="text-muted-foreground italic mb-6">
              &ldquo;{t("tagline")}&rdquo;
            </p>
            
            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-golden hover:text-background transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-golden mb-4">Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/docs/whitepaper" className="text-muted-foreground hover:text-golden transition-colors">
                  {t("links.whitepaper")}
                </Link>
              </li>
              <li>
                <Link href="/docs/faq" className="text-muted-foreground hover:text-golden transition-colors">
                  {t("links.faq")}
                </Link>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-golden transition-colors">
                  {t("links.contract")}
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-golden transition-colors">
                  {t("links.contact")}
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-bold text-golden mb-4">Ecosystem</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/staking" className="text-muted-foreground hover:text-golden transition-colors">
                  Staking
                </Link>
              </li>
              <li>
                <Link href="/ico" className="text-muted-foreground hover:text-golden transition-colors">
                  NFTs
                </Link>
              </li>
              <li>
                <Link href="/airdrop" className="text-muted-foreground hover:text-golden transition-colors">
                  Airdrop
                </Link>
              </li>
              <li>
                <Link href="/governance" className="text-muted-foreground hover:text-golden transition-colors">
                  Governance
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-border text-center text-muted-foreground text-sm">
          <p>{t("copyright")}</p>
        </div>
      </div>
    </footer>
  );
}
