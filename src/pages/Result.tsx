import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { JackieIcon, CoinIcon } from '@/components/icons/JackieIcon';
import { formatJC } from '@/lib/constants';
import { Share2, Trophy, Home, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

const Result: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { earnedAmount = 0, reachedQuestion = 1, isWinner = false } = location.state || {};
  
  const [claimStatus, setClaimStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleClaim = async () => {
    if (earnedAmount <= 0) return;
    
    setClaimStatus('loading');
    
    // Simulate claim process
    // In production, this calls backend to get EIP-712 signature, then uses MiniKit.commands.sendTransaction
    try {
      await new Promise(resolve => setTimeout(resolve, 2500));
      setTxHash('0x1234...abcd');
      setClaimStatus('success');
    } catch (error) {
      console.error('Claim failed:', error);
      setClaimStatus('error');
    }
  };

  const handleShare = () => {
    // In production, use MiniKit share
    const message = isWinner 
      ? `🎉 I just won ${formatJC(earnedAmount)} JC in Jackie Chain: Millionaire! Can you beat that?`
      : `I reached question ${reachedQuestion} and won ${formatJC(earnedAmount)} JC! Try to beat my score!`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Jackie Chain: Millionaire',
        text: message,
      });
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4 gap-6">
      {/* Result Icon */}
      <div className={cn(
        'relative animate-bounce-in',
      )}>
        {isWinner ? (
          <div className="relative">
            <JackieIcon size={120} className="animate-float" />
            <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full gradient-gold flex items-center justify-center shadow-glow animate-wiggle">
              <Trophy className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
        ) : earnedAmount > 0 ? (
          <div className="w-28 h-28 rounded-full gradient-success flex items-center justify-center shadow-glow">
            <Trophy className="w-14 h-14 text-success-foreground" />
          </div>
        ) : (
          <JackieIcon size={100} />
        )}
      </div>

      {/* Result Text */}
      <div className="text-center space-y-2 animate-slide-up">
        <h1 className="text-3xl font-display font-bold">
          {isWinner ? '🎉 JACKPOT!' : earnedAmount > 0 ? 'Great Run!' : 'Better Luck Next Time!'}
        </h1>
        <p className="text-muted-foreground">
          You reached question {reachedQuestion} of 15
        </p>
      </div>

      {/* Earned Amount */}
      <div className={cn(
        'flex items-center gap-3 px-8 py-5 rounded-2xl border shadow-card animate-slide-up stagger-1',
        earnedAmount > 0 
          ? 'bg-card border-primary/30' 
          : 'bg-secondary border-border'
      )}>
        <CoinIcon size={40} className={earnedAmount > 0 ? 'animate-coin-flip' : ''} />
        <div className="text-left">
          <p className="text-sm text-muted-foreground">You earned</p>
          <p className="text-3xl font-display font-bold text-gradient-gold">
            {formatJC(earnedAmount)} JC
          </p>
        </div>
      </div>

      {/* Claim Section */}
      {earnedAmount > 0 && (
        <div className="w-full max-w-sm space-y-3 animate-slide-up stagger-2">
          {claimStatus === 'idle' && (
            <Button
              variant="gold"
              size="xl"
              className="w-full"
              onClick={handleClaim}
            >
              <CoinIcon size={24} />
              Claim {formatJC(earnedAmount)} JC
            </Button>
          )}

          {claimStatus === 'loading' && (
            <Button
              variant="secondary"
              size="xl"
              className="w-full"
              disabled
            >
              <Loader2 className="w-6 h-6 animate-spin" />
              Claiming...
            </Button>
          )}

          {claimStatus === 'success' && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-success">
                <CheckCircle className="w-6 h-6" />
                <span className="font-bold">Claimed Successfully!</span>
              </div>
              
              {txHash && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => window.open(`https://worldchain-mainnet.explorer.alchemy.com/tx/${txHash}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                  View Transaction
                </Button>
              )}
            </div>
          )}

          {claimStatus === 'error' && (
            <div className="space-y-3">
              <p className="text-destructive text-center text-sm">
                Claim failed. Please try again.
              </p>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => setClaimStatus('idle')}
              >
                Retry Claim
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 animate-slide-up stagger-3">
        <Button
          variant="outline"
          size="lg"
          onClick={handleShare}
        >
          <Share2 className="w-5 h-5" />
          Share
        </Button>
        
        <Button
          variant="secondary"
          size="lg"
          onClick={() => navigate('/')}
        >
          <Home className="w-5 h-5" />
          Home
        </Button>
      </div>

      {/* Pool Status Note */}
      {earnedAmount > 0 && claimStatus === 'idle' && (
        <p className="text-xs text-muted-foreground text-center animate-slide-up stagger-4">
          Claim expires in 24 hours. Rewards are subject to daily pool availability.
        </p>
      )}
    </div>
  );
};

export default Result;
