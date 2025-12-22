import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { JackieIcon } from '@/components/icons/JackieIcon';
import { PoolStats } from '@/components/game/PoolStats';
import { UserBalance } from '@/components/game/UserBalance';
import { AttemptsDisplay } from '@/components/game/AttemptsDisplay';
import { MiniLeaderboard } from '@/components/game/MiniLeaderboard';
import { useGame } from '@/contexts/GameContext';
import { Play, Share2, ChevronRight, MessageCircle, X, Users, Zap, Gift, UserCheck } from 'lucide-react';
import { inviteFriends } from '@/lib/worldShare';
import { isInWorldApp } from '@/lib/minikit';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const { isVerified, attempts, dayState } = state;
  const [activePopup, setActivePopup] = useState<string | null>(null);

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

  const handleShare = async () => {
    const result = await inviteFriends();
    
    if (result.success) {
      toast.success('Invite sent!');
    } else if (result.error !== 'Share cancelled') {
      navigate('/profile?tab=referrals');
    }
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
          
          {/* Attempts and Invite Section - Merged */}
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

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Invite Friend Row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Users className="w-4 h-4 text-success flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    <span className="text-foreground font-medium">Invite a friend</span> = +1 extra play
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="flex-shrink-0"
                >
                  {isInWorldApp() ? <MessageCircle className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
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
            <div className="text-center space-y-3">
              <p className="text-muted-foreground">
                No plays remaining today. Invite friends for more!
              </p>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleShare}
              >
                {isInWorldApp() ? <MessageCircle className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                Invite & Earn Plays
              </Button>
            </div>
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
