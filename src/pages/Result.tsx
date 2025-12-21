import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { JackieIcon, CoinIcon } from '@/components/icons/JackieIcon';
import { formatJC, JC_TOKEN_ADDRESS } from '@/lib/constants';
import { authorizeClaim, confirmClaim, getExplorerTxUrl, ClaimData, CLAIM_CONTRACT_ADDRESS } from '@/lib/claiming';
import { Share2, Trophy, Home, Loader2, CheckCircle, ExternalLink, Wallet, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGame } from '@/contexts/GameContext';

type ClaimStep = 'idle' | 'authorizing' | 'authorized' | 'submitting' | 'confirming' | 'success' | 'error';

const Result: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state: gameState } = useGame();
  const { earnedAmount = 0, reachedQuestion = 1, isWinner = false, runId } = location.state || {};
  
  const [claimStep, setClaimStep] = useState<ClaimStep>('idle');
  const [claimData, setClaimData] = useState<ClaimData | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mock wallet address - in production this comes from World ID/MiniKit
  const walletAddress = '0x1234567890123456789012345678901234567890';
  const userId = 'mock-user-id'; // In production, from auth context

  const handleStartClaim = async () => {
    if (earnedAmount <= 0) return;
    
    setClaimStep('authorizing');
    setErrorMessage(null);

    try {
      // If we have a real runId, use the backend authorization
      if (runId && gameState.user) {
        const response = await authorizeClaim(runId, gameState.user.id, walletAddress);
        
        if (!response.success || !response.claim) {
          throw new Error(response.error || 'Failed to authorize claim');
        }

        setClaimData(response.claim);
        setClaimStep('authorized');
      } else {
        // Fallback for demo/testing: create mock claim data
        console.log('No runId - using demo mode for claiming');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const mockNonce = '0x' + Array.from({ length: 64 }, () => 
          Math.floor(Math.random() * 16).toString(16)
        ).join('');
        
        const mockSignature = '0x' + Array.from({ length: 130 }, () => 
          Math.floor(Math.random() * 16).toString(16)
        ).join('');

        const mockClaimData: ClaimData = {
          id: 'demo-claim-' + Date.now(),
          amount: earnedAmount,
          nonce: mockNonce,
          expiry: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
          signature: mockSignature,
          recipient: walletAddress,
        };

        setClaimData(mockClaimData);
        setClaimStep('authorized');
      }
    } catch (error) {
      console.error('Claim authorization failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Authorization failed');
      setClaimStep('error');
    }
  };

  const handleSubmitTransaction = async () => {
    if (!claimData) return;

    setClaimStep('submitting');

    try {
      // In production, use MiniKit.commands.sendTransaction
      // For demo, simulate transaction
      console.log('Submitting claim transaction:', {
        to: CLAIM_CONTRACT_ADDRESS,
        amount: claimData.amount,
        nonce: claimData.nonce,
        expiry: claimData.expiry,
        signature: claimData.signature,
      });

      // Simulate transaction submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock transaction hash
      const mockTxHash = '0x' + Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      
      setTxHash(mockTxHash);
      setClaimStep('confirming');

      // Step 3: Confirm the claim in backend
      const confirmResponse = await confirmClaim(claimData.id, mockTxHash);
      
      if (!confirmResponse.success) {
        console.warn('Failed to confirm claim in backend:', confirmResponse.error);
        // Continue anyway - tx was submitted
      }

      setClaimStep('success');

    } catch (error) {
      console.error('Transaction submission failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Transaction failed');
      setClaimStep('error');
    }
  };

  const handleShare = () => {
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

  const renderClaimSection = () => {
    if (earnedAmount <= 0) return null;

    switch (claimStep) {
      case 'idle':
        return (
          <div className="w-full max-w-sm space-y-4">
            <Button
              variant="gold"
              size="xl"
              className="w-full"
              onClick={handleStartClaim}
            >
              <Wallet className="w-5 h-5" />
              Claim {formatJC(earnedAmount)} JC
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Claim expires in 24 hours. You'll sign a transaction to receive tokens.
            </p>
          </div>
        );

      case 'authorizing':
        return (
          <div className="w-full max-w-sm space-y-4">
            <div className="flex items-center justify-center gap-3 py-4 bg-card rounded-xl border border-border">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm">Preparing your claim...</span>
            </div>
            <ClaimProgress step={1} />
          </div>
        );

      case 'authorized':
        return (
          <div className="w-full max-w-sm space-y-4">
            <div className="p-4 bg-card rounded-xl border border-primary/30 space-y-3">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Claim Authorized!</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Amount: <span className="text-foreground font-medium">{formatJC(earnedAmount)} JC</span></p>
                <p>Expires: <span className="text-foreground">{new Date(claimData!.expiry * 1000).toLocaleString()}</span></p>
              </div>
            </div>
            <Button
              variant="gold"
              size="xl"
              className="w-full"
              onClick={handleSubmitTransaction}
            >
              <ArrowRight className="w-5 h-5" />
              Sign & Submit Transaction
            </Button>
            <ClaimProgress step={2} />
          </div>
        );

      case 'submitting':
        return (
          <div className="w-full max-w-sm space-y-4">
            <div className="flex items-center justify-center gap-3 py-4 bg-card rounded-xl border border-border">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm">Submitting transaction...</span>
            </div>
            <ClaimProgress step={2} active />
          </div>
        );

      case 'confirming':
        return (
          <div className="w-full max-w-sm space-y-4">
            <div className="flex items-center justify-center gap-3 py-4 bg-card rounded-xl border border-border">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm">Confirming on chain...</span>
            </div>
            <ClaimProgress step={3} active />
          </div>
        );

      case 'success':
        return (
          <div className="w-full max-w-sm space-y-4">
            <div className="p-4 bg-success/10 rounded-xl border border-success/30 space-y-3">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle className="w-6 h-6" />
                <span className="font-bold">Claimed Successfully!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatJC(earnedAmount)} JC tokens have been sent to your wallet.
              </p>
            </div>
            
            {txHash && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(getExplorerTxUrl(txHash), '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
                View on Explorer
              </Button>
            )}
            <ClaimProgress step={3} complete />
          </div>
        );

      case 'error':
        return (
          <div className="w-full max-w-sm space-y-4">
            <div className="p-4 bg-destructive/10 rounded-xl border border-destructive/30 space-y-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Claim Failed</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {errorMessage || 'Something went wrong. Please try again.'}
              </p>
            </div>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => {
                setClaimStep('idle');
                setErrorMessage(null);
                setClaimData(null);
              }}
            >
              Try Again
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4 gap-6">
      {/* Result Icon */}
      <div className={cn('relative animate-bounce-in')}>
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
      <div className="animate-slide-up stagger-2">
        {renderClaimSection()}
      </div>

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
    </div>
  );
};

// Progress indicator component
const ClaimProgress: React.FC<{ step: number; active?: boolean; complete?: boolean }> = ({ 
  step, 
  active = false,
  complete = false 
}) => {
  const steps = [
    { label: 'Authorize', icon: CheckCircle },
    { label: 'Sign Tx', icon: Wallet },
    { label: 'Confirm', icon: Clock },
  ];

  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((s, index) => {
        const stepNum = index + 1;
        const isComplete = complete || stepNum < step;
        const isActive = active && stepNum === step;
        const isCurrent = !complete && stepNum === step;

        return (
          <React.Fragment key={s.label}>
            <div className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors',
              isComplete && 'bg-success/20 text-success',
              isActive && 'bg-primary/20 text-primary',
              isCurrent && !isActive && 'bg-primary/20 text-primary',
              !isComplete && !isCurrent && !isActive && 'bg-muted text-muted-foreground'
            )}>
              {isComplete ? (
                <CheckCircle className="w-3 h-3" />
              ) : isActive ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <span className="w-3 h-3 flex items-center justify-center text-[10px] font-bold">
                  {stepNum}
                </span>
              )}
              <span>{s.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                'w-4 h-0.5',
                isComplete ? 'bg-success' : 'bg-muted'
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Result;
