import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { locales, type Locale, defaultLocale } from '@/config/i18n';

export default getRequestConfig(async ({ requestLocale }) => {
  // Get the locale from the request or use default
  let locale = await requestLocale;
  
  // Validate that the incoming locale is valid
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
