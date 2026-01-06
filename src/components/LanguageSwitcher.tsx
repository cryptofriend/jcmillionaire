import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { setLanguage, getCurrentLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = getCurrentLanguage();

  const handleLanguageChange = (lang: 'en' | 'es') => {
    setLanguage(lang);
  };

  return (
    <div className="flex items-center gap-1 bg-secondary/50 rounded-full p-0.5">
      <button
        onClick={() => handleLanguageChange('en')}
        className={cn(
          'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
          currentLang === 'en'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        EN
      </button>
      <button
        onClick={() => handleLanguageChange('es')}
        className={cn(
          'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
          currentLang === 'es'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        ES
      </button>
    </div>
  );
};
