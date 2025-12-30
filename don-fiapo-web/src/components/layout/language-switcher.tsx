"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/lib/navigation";
import { locales, localeNames, localeFlags, type Locale } from "@/config/i18n";
import { useState, useTransition } from "react";
import { ChevronDown, Globe } from "lucide-react";

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (newLocale: Locale) => {
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card hover:bg-muted transition-colors text-sm"
      >
        <Globe className="w-4 h-4 text-golden" />
        <span className="hidden sm:inline">{localeFlags[locale]}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
            {locales.map((loc) => (
              <button
                key={loc}
                onClick={() => handleLocaleChange(loc)}
                className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 hover:bg-muted transition-colors ${
                  locale === loc ? "text-golden bg-muted" : "text-foreground"
                }`}
              >
                <span className="text-lg">{localeFlags[loc]}</span>
                <span>{localeNames[loc]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
