import React from 'react';
import { useTranslation } from 'react-i18next';
import { isInWorldApp } from '@/lib/minikit';

const XBanner: React.FC = () => {
  const { t } = useTranslation();

  // Hide entirely in World Mini App — external link would redirect to Safari.
  if (isInWorldApp()) return null;

  return (
    <a
      href="https://x.com/iamjackiechain"
      target="_blank"
      rel="noopener noreferrer"
      className="sticky top-0 z-50 block w-full bg-foreground text-background px-4 py-2 text-center text-sm font-medium hover:opacity-90 transition-opacity"
    >
      <span className="inline-flex items-center gap-2">
        {t('banner_friends')}
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-label="X">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        @iamjackiechain
      </span>
    </a>
  );
};

export default XBanner;
