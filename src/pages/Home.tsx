import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { JackieIcon } from '@/components/icons/JackieIcon';
import { PoolStats } from '@/components/game/PoolStats';
import { UserBalance } from '@/components/game/UserBalance';
import { MiniLeaderboard } from '@/components/game/MiniLeaderboard';
import { ShareModal } from '@/components/referral/ShareModal';
import { TrailerCard } from '@/components/home/TrailerCard';
import { useGame } from '@/contexts/GameContext';
import { Play, ChevronRight, X, Zap, Gift, UserCheck, Share2, Copy, Clock } from 'lucide-react';
import { generateReferralCode } from '@/lib/referralService';
import { getWorldAppLink } from '@/lib/constants';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TRAILER_DISMISSED_KEY = 'jc_trailer_dismissed';

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

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useGame();
  const { isVerified, attempts, dayState, user } = state;
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(getTimeUntilMidnight());
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showTrailer, setShowTrailer] = useState(() => {
    return !localStorage.getItem(TRAILER_DISMISSED_KEY);
  });

  const handleDismissTrailer = () => {
    localStorage.setItem(TRAILER_DISMISSED_KEY, 'true');
    setShowTrailer(false);
  };

  // Referral code for sharing
  const referralCode = user ? generateReferralCode(user.id) : '';

  // Countdown timer for next attempt
  useEffect(() => {
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

  const handleOpenShareModal = () => {
    setIsShareModalOpen(true);
  };

  const infoItems = [
    { 
      id: 'questions', 
      value: '15', 
      label: 'Questions',
      description: 'Answer 15 trivia questions of increasing difficulty. Each correct answer moves you up the prize ladder. Get them all right to win the jackpot!'
    },
    { 
      id: 'lifelines', 
      value: '3', 
      label: 'Lifelines',
      description: 'You have 3 lifelines per run: 50/50 removes two wrong answers, Hint gives you a clue, and Chain Scan shows what the community answered.'
    },
    { 
      id: 'safehavens', 
      value: '2', 
      label: 'Safe Havens',
      description: 'Questions 5 and 10 are safe havens. If you answer wrong after reaching a safe haven, you keep the prize from that level instead of losing everything!'
    },
  ];

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        referralCode={referralCode}
      />

      {/* Popup */}
      {activePopup && (
        <InfoPopup
          title={infoItems.find(i => i.id === activePopup)?.label || ''}
          description={infoItems.find(i => i.id === activePopup)?.description || ''}
          onClose={() => setActivePopup(null)}
        />
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <JackieIcon size={40} className="animate-float" />
          <div>
            <h1 className="text-lg font-display font-bold text-foreground">Jackie Chain</h1>
            <p className="text-xs text-muted-foreground">Millionaire</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 pb-24 gap-5 overflow-y-auto">
        {/* Hero Section */}
        <div className="text-center space-y-3 animate-fade-in">
          <div className="relative inline-block">
            <JackieIcon size={100} className="animate-float drop-shadow-lg" />
          </div>
          
          <h2 className="text-3xl font-display font-bold text-gradient-gold">
            Win 1M $JC!
          </h2>
          <p className="text-muted-foreground max-w-xs mx-auto text-sm">
            Answer 15 questions to climb the prize ladder. Use lifelines wisely!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="w-full max-w-sm space-y-3 animate-slide-up stagger-1">
          <UserBalance />
          <PoolStats dayState={dayState} />
          
          {/* Attempts and Invite/Trailer Section */}
          {isVerified && attempts && (
            <div className="px-4 py-3 bg-card rounded-xl border border-border shadow-soft space-y-3">
              {/* Attempts Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className={cn(
                    'w-5 h-5',
                    attempts.remaining > 0 ? 'text-primary' : 'text-muted-foreground'
                  )} />
                  <span className="text-sm font-medium text-muted-foreground">Plays Today</span>
                </div>
                <span className={cn(
                  'text-lg font-bold',
                  attempts.remaining > 0 ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {attempts.remaining} / {attempts.cap}
                </span>
              </div>

              {/* Earned from referrals indicator */}
              {attempts.earnedFromReferrals > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-success">
                  <Gift className="w-3.5 h-3.5" />
                  <span className="font-medium">+{attempts.earnedFromReferrals} from referrals</span>
                </div>
              )}

              {/* Visual dots for attempts */}
              <div className="flex gap-1 flex-wrap">
                {Array.from({ length: Math.min(attempts.cap, 10) }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-2.5 h-2.5 rounded-full transition-colors',
                      i < attempts.remaining ? 'bg-primary' : 'bg-secondary'
                    )}
                  />
                ))}
              </div>

              {/* Invite Section */}
              <div className="border-t border-border pt-3 space-y-3">
                <h3 className="text-center font-display font-bold text-lg text-foreground">
                  Invite a friend = <span className="text-success">+1 extra play</span>
                </h3>
                
                {/* Referral Code Display */}
                <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2">
                  <span className="flex-1 text-center text-lg font-mono font-bold tracking-widest text-foreground">
                    {user ? generateReferralCode(user.id) : '--------'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const { getReferralDeeplink } = require('@/lib/worldShare');
                      const link = user ? getReferralDeeplink(generateReferralCode(user.id)) : '';
                      navigator.clipboard.writeText(link);
                      toast.success('Invite link copied!');
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={handleOpenShareModal}
                    className="gap-1.5"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                </div>
              </div>

            </div>
          )}

          {/* Trailer Card - Show for first time visitors */}
          {showTrailer && (
            <TrailerCard onDismiss={handleDismissTrailer} />
          )}
        </div>

        {/* CTA Button */}
        <div className="w-full max-w-sm space-y-3 animate-slide-up stagger-2">
          {!isVerified ? (
            <Button
              variant="gold"
              size="xl"
              className="w-full"
              onClick={() => navigate('/verify')}
            >
              <UserCheck className="w-6 h-6" />
              Verify to Play
              <ChevronRight className="w-5 h-5" />
            </Button>
          ) : canPlay ? (
            <Button
              variant="gold"
              size="xl"
              className="w-full animate-pulse-gold"
              onClick={handleStartRun}
            >
              <Play className="w-6 h-6" />
              Start Run
              <ChevronRight className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="xl"
              className="w-full opacity-60 cursor-not-allowed"
              disabled
            >
              <Clock className="w-5 h-5" />
              Next play in {countdown}
            </Button>
          )}
        </div>

        {/* Quick Stats - Clickable */}
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

        {/* Mini Leaderboard */}
        <div className="w-full max-w-sm animate-slide-up stagger-4">
          <MiniLeaderboard />
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-3 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by World ID • Rewards on World Chain
        </p>
      </footer>
    </div>
  );
};

export default Home;
