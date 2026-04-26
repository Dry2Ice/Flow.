"use client";

import { useI18n } from '@/lib/i18n';

interface AppearanceTabProps {
  locale: string;
  onLocaleChange: (locale: 'en' | 'ru') => void;
}

export function AppearanceTab({ locale, onLocaleChange }: AppearanceTabProps) {
  const { t } = useI18n();

  return (
    <div className="mt-3 flex items-center gap-2">
      <label className="text-xs text-neutral-300 light:text-neutral-700 text-neutral-700">{t('settings.language')}</label>
      <button
        type="button"
        onClick={() => onLocaleChange('en')}
        className={`rounded px-2 py-1 text-xs ${locale === 'en' ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-neutral-300 light:text-neutral-700 text-neutral-700'}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => onLocaleChange('ru')}
        className={`rounded px-2 py-1 text-xs ${locale === 'ru' ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-neutral-300 light:text-neutral-700 text-neutral-700'}`}
      >
        RU
      </button>
    </div>
  );
}
