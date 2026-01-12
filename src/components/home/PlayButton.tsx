import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useGame } from '@/contexts/GameContext';
import { Play, ChevronRight, UserCheck, Clock, Gift, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { generateReferralCode } from '@/lib/referralService';
import { inviteFriends } from '@/lib/worldShare';
import { toast } from '@/hooks/use-toast';

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
  const { isVerified, attempts, user } = state;
  const [countdown, setCountdown] = React.useState(getTimeUntilMidnight());
  const [showReferralDialog, setShowReferralDialog] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getTimeUntilMidnight());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const canPlay = isVerified && (attempts?.remaining || 0) > 0;
  const referralCode = user ? generateReferralCode(user.id) : '';

  const handleStartRun = () => {
    if (!isVerified) {
      navigate('/verify');
      return;
    }
    if (canPlay) {
      navigate('/game');
    }
  };

  const handleShareReferral = async () => {
    const result = await inviteFriends(referralCode);
    if (result.success) {
      setCopied(true);
      toast({
        title: t('referral.link_copied'),
        description: t('referral.share_description'),
      });
      setTimeout(() => setCopied(false), 2000);
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

  // Can play - show play button
  if (canPlay) {
    return (
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
    );
  }

  // No plays remaining - show countdown with referral popup on click
  return (
    <>
      <Button
        variant="outline"
        size="xl"
        className="w-full opacity-80 cursor-pointer hover:opacity-100 transition-opacity"
        onClick={() => setShowReferralDialog(true)}
      >
        <Clock className="w-5 h-5" />
        {t('home.next_play_in')} {countdown}
      </Button>

      <Dialog open={showReferralDialog} onOpenChange={setShowReferralDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 justify-center">
              <Gift className="w-5 h-5 text-primary" />
              {t('referral.get_extra_play')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 text-center py-4">
            <p className="text-muted-foreground">
              {t('referral.invite_friend_extra_play')}
            </p>
            
            <Button
              variant="gold"
              size="lg"
              className="w-full"
              onClick={handleShareReferral}
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" />
                  {t('referral.copied')}
                </>
              ) : (
                <>
                  <Gift className="w-5 h-5" />
                  {t('referral.share_invite')}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
