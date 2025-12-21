import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { JackieIcon, CoinIcon } from '@/components/icons/JackieIcon';
import { PoolStats } from '@/components/game/PoolStats';
import { UserBalance } from '@/components/game/UserBalance';
import { useGame } from '@/contexts/GameContext';
import { formatJC } from '@/lib/constants';
import { Play, UserCheck, Share2, Trophy, ChevronRight } from 'lucide-react';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { state, isLoading } = useGame();
  const { isVerified, attempts, dayState, prizeLadder } = state;

  const maxPrize = prizeLadder[prizeLadder.length - 1]?.prizeAmount || 20000;
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

  const handleShare = () => {
    navigate('/profile?tab=referrals');
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <JackieIcon size={40} className="animate-float" />
          <div>
            <h1 className="text-lg font-display font-bold text-foreground">Jackie Chain</h1>
            <p className="text-xs text-muted-foreground">Millionaire</p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/profile')}
          className="text-muted-foreground"
        >
          <Trophy className="w-5 h-5" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-8 gap-6">
        {/* Hero Section */}
        <div className="text-center space-y-3 animate-fade-in">
          <div className="relative inline-block">
            <JackieIcon size={120} className="animate-float drop-shadow-lg" />
          </div>
          
          <h2 className="text-3xl font-display font-bold text-gradient-gold">
            Win 1M $JC!
          </h2>
          <p className="text-muted-foreground max-w-xs mx-auto">
            Answer 15 questions to climb the prize ladder. Use lifelines wisely!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="w-full max-w-sm space-y-3 animate-slide-up stagger-1">
          <UserBalance />
          <PoolStats dayState={dayState} />
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
                <Share2 className="w-5 h-5" />
                Invite & Earn Plays
              </Button>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {isVerified && (
          <div className="flex gap-4 text-center animate-slide-up stagger-3">
            <div className="px-4 py-2 bg-card rounded-xl border border-border shadow-soft">
              <p className="text-2xl font-display font-bold text-primary">15</p>
              <p className="text-xs text-muted-foreground">Questions</p>
            </div>
            <div className="px-4 py-2 bg-card rounded-xl border border-border shadow-soft">
              <p className="text-2xl font-display font-bold text-primary">3</p>
              <p className="text-xs text-muted-foreground">Lifelines</p>
            </div>
            <div className="px-4 py-2 bg-card rounded-xl border border-border shadow-soft">
              <p className="text-2xl font-display font-bold text-primary">2</p>
              <p className="text-xs text-muted-foreground">Safe Havens</p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-4 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by World ID • Rewards on World Chain
        </p>
      </footer>
    </div>
  );
};

export default Home;
