import React from 'react';
import { useTranslation } from 'react-i18next';
import { setLanguage, getCurrentLanguage, languageOptions, type Language } from '@/lib/i18n';
import { ChevronDown, Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = getCurrentLanguage();

  const currentOption = languageOptions.find(opt => opt.code === currentLang) || languageOptions[0];

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 gap-1 bg-secondary/50 hover:bg-secondary"
        >
          <Globe className="w-4 h-4" />
          <span className="text-xs font-medium uppercase">{currentLang}</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="min-w-[140px] bg-background border border-border shadow-lg z-50"
      >
        {languageOptions.map((option) => (
          <DropdownMenuItem
            key={option.code}
            onClick={() => handleLanguageChange(option.code)}
            className={cn(
              'flex items-center justify-between gap-2 cursor-pointer',
              currentLang === option.code && 'bg-primary/10 text-primary'
            )}
          >
            <span className="text-sm">{option.nativeLabel}</span>
            <span className="text-xs text-muted-foreground uppercase">{option.code}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
