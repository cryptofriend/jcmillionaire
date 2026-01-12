import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { JackieIcon } from '@/components/icons/JackieIcon';
import { PoolStats } from '@/components/game/PoolStats';
import { UserBalance } from '@/components/game/UserBalance';
import { MiniLeaderboard } from '@/components/game/MiniLeaderboard';
import { ShareModal } from '@/components/referral/ShareModal';
import { TrailerCard } from '@/components/home/TrailerCard';
import { PlayButton } from '@/components/home/PlayButton';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useGame } from '@/contexts/GameContext';
import { X } from 'lucide-react';
import { generateReferralCode } from '@/lib/referralService';


interface InfoPopupProps {
  title: string;
  description: string;
  onClose: () => void;
}

const InfoPopup: React.FC<InfoPopupProps> = ({ title, description, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
    <div 
      className="bg-card rounded-xl border border-border p-5 shadow-lg max-w-xs w-full animate-scale-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-lg text-foreground">{title}</h3>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  </div>
);

const TRAILER_WATCHED_KEY = 'jc_trailer_watched';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { state } = useGame();
  const { isVerified, dayState, user } = state;
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  // Check if user has watched trailer before - default to referral if they have
  const hasWatchedTrailer = localStorage.getItem(TRAILER_WATCHED_KEY) === 'true';
  const [activeTab, setActiveTab] = useState<'story' | 'referral'>(hasWatchedTrailer ? 'referral' : 'story');

  const handleDismissTrailer = () => {
    localStorage.setItem(TRAILER_WATCHED_KEY, 'true');
    setActiveTab('referral');
  };

  const referralCode = user ? generateReferralCode(user.id) : '';

  const handleOpenShareModal = () => {
    setIsShareModalOpen(true);
  };

  const infoItems = [
    { 
      id: 'questions', 
      value: '15', 
      label: t('home.questions'),
      description: t('home.questions_desc')
    },
    { 
      id: 'lifelines', 
      value: '3', 
      label: t('home.lifelines'),
      description: t('home.lifelines_desc')
    },
    { 
      id: 'safehavens', 
      value: '2', 
      label: t('home.safe_havens'),
      description: t('home.safe_havens_desc')
    },
  ];

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        referralCode={referralCode}
      />

      {activePopup && (
        <InfoPopup
          title={infoItems.find(i => i.id === activePopup)?.label || ''}
          description={infoItems.find(i => i.id === activePopup)?.description || ''}
          onClose={() => setActivePopup(null)}
        />
      )}

      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <JackieIcon size={40} className="animate-float" />
          <div>
            <h1 className="text-lg font-display font-bold text-foreground">{t('app_name')}</h1>
            <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>
        <LanguageSwitcher />
      </header>

      <main className="flex-1 flex flex-col items-center justify-start px-4 pb-24 gap-5 overflow-y-auto">
        <div className="text-center space-y-3 animate-fade-in">
          <button 
            className="relative inline-block cursor-pointer active:scale-95 transition-transform"
            onClick={() => navigate('/profile')}
            aria-label="View balance"
          >
            <JackieIcon size={100} className="animate-float drop-shadow-lg" />
          </button>
          
          <h2 className="text-3xl font-display font-bold text-gradient-gold">
            {t('home.win_jackpot')}
          </h2>
          <p className="text-muted-foreground max-w-xs mx-auto text-sm">
            {t('home.description')}
          </p>
        </div>

        <div className="w-full max-w-sm space-y-3 animate-slide-up stagger-1">
          <UserBalance />
          
          {activeTab === 'story' ? (
            <TrailerCard 
              onDismiss={handleDismissTrailer} 
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          ) : null}
          
          <PoolStats dayState={dayState} />
        </div>

        <div className="w-full max-w-sm space-y-3 animate-slide-up stagger-2">
          <PlayButton onOpenShareModal={handleOpenShareModal} />
        </div>

        {isVerified && (
          <div className="flex gap-4 text-center animate-slide-up stagger-3">
            {infoItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActivePopup(item.id)}
                className="px-4 py-2 bg-card rounded-xl border border-border shadow-soft hover:border-primary/50 transition-colors active:scale-95"
              >
                <p className="text-2xl font-display font-bold text-primary">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </button>
            ))}
          </div>
        )}

        <div className="w-full max-w-sm animate-slide-up stagger-4">
          <MiniLeaderboard />
        </div>
      </main>

      <footer className="px-4 py-3 text-center">
        <p className="text-xs text-muted-foreground">
          {t('powered_by')}
        </p>
      </footer>
    </div>
  );
};

export default Home;