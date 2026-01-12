import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useGame } from '@/contexts/GameContext';
import { Play, ChevronRight, UserCheck, Clock, Zap } from 'lucide-react';

interface PlayButtonProps {
  onOpenShareModal: () => void;
}

// Helper to get time until midnight
const getTimeUntilMidnight = (): string => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const PlayButton: React.FC<PlayButtonProps> = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { state } = useGame();
  const { isVerified, attempts } = state;
  const [countdown, setCountdown] = React.useState(getTimeUntilMidnight());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getTimeUntilMidnight());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const canPlay = isVerified && (attempts?.remaining || 0) > 0;

  const handleStartRun = () => {
    if (!isVerified) {
      navigate('/verify');
      return;
    }
    if (canPlay) {
      navigate('/game');
    }
  };

  // Not verified - show verify button
  if (!isVerified) {
    return (
      <Button
        variant="gold"
        size="xl"
        className="w-full"
        onClick={() => navigate('/verify')}
      >
        <UserCheck className="w-6 h-6" />
        {t('home.verify_to_play')}
        <ChevronRight className="w-5 h-5" />
      </Button>
    );
  }

  // Can play - show play button with plays info
  if (canPlay) {
    return (
      <div className="w-full space-y-3">
        <div className="bg-card rounded-xl border border-border shadow-soft px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Play className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="text-left">
              <p className="font-display font-bold text-foreground">{t('home.start_run')}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Zap className="w-3 h-3 text-primary" />
                <span>{attempts?.remaining} / {attempts?.cap} {t('home.plays_today')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Play Now Button */}
        <Button
          variant="gold"
          size="lg"
          className="w-full animate-pulse-gold"
          onClick={handleStartRun}
        >
          <Play className="w-5 h-5" />
          {t('home.play_now')}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // No plays remaining - show countdown
  return (
    <Button
      variant="outline"
      size="xl"
      className="w-full opacity-60 cursor-not-allowed"
      disabled
    >
      <Clock className="w-5 h-5" />
      {t('home.next_play_in')} {countdown}
    </Button>
  );
};
