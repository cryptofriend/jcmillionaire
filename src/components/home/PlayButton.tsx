import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useGame } from '@/contexts/GameContext';
import { Play, ChevronRight, UserCheck, Clock, ChevronDown, Zap, Gift, Copy, Share2 } from 'lucide-react';
import { generateReferralCode } from '@/lib/referralService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { hapticTap } from '@/lib/haptics';

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

export const PlayButton: React.FC<PlayButtonProps> = ({ onOpenShareModal }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { state } = useGame();
  const { isVerified, attempts, user } = state;
  const [isExpanded, setIsExpanded] = useState(false);
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

  const handleToggle = () => {
    hapticTap();
    setIsExpanded(!isExpanded);
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

  // Can play - show expandable play button
  if (canPlay) {
    return (
      <div className="w-full">
        <motion.div
          className="bg-card rounded-xl border border-border shadow-soft overflow-hidden"
          initial={false}
          animate={{ 
            borderColor: isExpanded ? 'hsl(var(--primary) / 0.3)' : 'hsl(var(--border))'
          }}
        >
          {/* Collapsed Header / Play Button */}
          <button
            onClick={handleToggle}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
          >
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
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            </motion.div>
          </button>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                  {/* Play dots */}
                  <div className="flex gap-1 flex-wrap">
                    {Array.from({ length: Math.min(attempts?.cap || 1, 10) }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'w-2.5 h-2.5 rounded-full transition-colors',
                          i < (attempts?.remaining || 0) ? 'bg-primary' : 'bg-secondary'
                        )}
                      />
                    ))}
                  </div>

                  {/* Earned from referrals */}
                  {attempts && attempts.earnedFromReferrals > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-success">
                      <Gift className="w-3.5 h-3.5" />
                      <span className="font-medium">+{attempts.earnedFromReferrals} {t('home.from_referrals')}</span>
                    </div>
                  )}

                  {/* Invite section */}
                  <div className="border-t border-border pt-3 space-y-3">
                    <h3 className="text-center font-display font-bold text-sm text-foreground">
                      {t('home.invite_friend')}
                    </h3>
                    
                    <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2">
                      <span className="flex-1 text-center text-sm font-mono font-bold tracking-widest text-foreground">
                        {user ? generateReferralCode(user.id) : '--------'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const { getReferralDeeplink } = require('@/lib/worldShare');
                          const link = user ? getReferralDeeplink(generateReferralCode(user.id)) : '';
                          navigator.clipboard.writeText(link);
                          toast.success(t('home.copied'));
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="gold"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenShareModal();
                        }}
                        className="gap-1.5"
                      >
                        <Share2 className="w-4 h-4" />
                        {t('home.share')}
                      </Button>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
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
