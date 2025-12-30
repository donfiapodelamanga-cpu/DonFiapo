export const locales = ['en', 'es', 'fr', 'pt', 'ru', 'zh'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  pt: 'Português',
  ru: 'Русский',
  zh: '中文',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  pt: '🇧🇷',
  ru: '🇷🇺',
  zh: '🇨🇳',
};

export const defaultLocale: Locale = 'en';
