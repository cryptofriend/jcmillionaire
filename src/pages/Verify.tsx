import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { JackieIcon } from '@/components/icons/JackieIcon';
import { useGame } from '@/contexts/GameContext';
import { Shield, ArrowLeft, CheckCircle, Loader2, AlertCircle, Gift } from 'lucide-react';
import { persistUser } from '@/lib/userService';
import { isInWorldApp, authenticateWithWallet } from '@/lib/minikit';
import { linkPendingReferralToUser } from '@/hooks/useReferralTracking';
import { toast } from 'sonner';

const Verify: React.FC = () => {
  const navigate = useNavigate();
  const { dispatch } = useGame();
  const [isVerifying, setIsVerifying] = useState(false);
  const verificationLevel: 'device' | 'orb' = 'device';
  const [isSuccess, setIsSuccess] = useState(false);
  const [inWorldApp, setInWorldApp] = useState(false);
  const [isCheckingEnv, setIsCheckingEnv] = useState(true);

  // Check if there's a pending referral
  const hasPendingReferral = !!localStorage.getItem('jc_pending_referral');

  // Check if we're in World App on mount
  useEffect(() => {
    // Small delay to allow MiniKit to initialize
    const checkEnv = setTimeout(() => {
      const isInstalled = isInWorldApp();
      console.log('World App check:', isInstalled);
      setInWorldApp(isInstalled);
      setIsCheckingEnv(false);
    }, 500);
    
    return () => clearTimeout(checkEnv);
  }, []);

  const handleVerify = async () => {
    // Only allow verification inside World App
    if (!inWorldApp) {
      toast.error('Please open this app in World App to verify');
      return;
    }

    setIsVerifying(true);
    
    try {
      // Use MiniKit wallet auth in World App
      console.log('Authenticating with World App wallet...');
      const result = await authenticateWithWallet(verificationLevel);
      
      if (!result.success || !result.user) {
        throw new Error(result.error || 'Wallet authentication failed');
      }
      
      // Store the wallet address for later use
      localStorage.setItem('jc_wallet_address', result.user.wallet_address);
      
      // Create the user object matching our type
      const user = {
        id: result.user.id,
        verificationLevel: result.user.verification_level as 'device' | 'orb',
        nullifierHash: `wallet_${result.user.wallet_address}`,
        createdAt: result.user.created_at,
        username: result.user.username,
        profilePictureUrl: result.user.profile_picture_url,
      };
      
      // Persist user to localStorage
      persistUser(user);
      
      console.log('User verified:', user.id);
      
      // Link pending referral if exists
      const wasLinked = await linkPendingReferralToUser(user.id);
      if (wasLinked) {
        console.log('Referral linked successfully');
      }
      
      dispatch({ type: 'SET_USER', payload: user });
      setIsSuccess(true);
      
      // Navigate to home after short delay
      setTimeout(() => {
        navigate('/');
      }, 1500);
      
    } catch (error) {
      console.error('Verification failed:', error);
      toast.error(error instanceof Error ? error.message : 'Verification failed');
      setIsVerifying(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-6 animate-bounce-in">
          <div className="relative inline-block">
            <div className="w-24 h-24 rounded-full gradient-success flex items-center justify-center shadow-glow">
              <CheckCircle className="w-12 h-12 text-success-foreground" />
            </div>
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground">Verified!</h2>
          <p className="text-muted-foreground">Welcome to Jackie Chain: Millionaire</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <header className="flex items-center px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="text-muted-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-8 gap-8">
        {/* Hero */}
        <div className="text-center space-y-4 animate-fade-in">
          <JackieIcon size={80} className="mx-auto animate-float" />
          <h1 className="text-2xl font-display font-bold text-foreground">
            Login with World ID
          </h1>
          <p className="text-muted-foreground max-w-xs mx-auto">
            Prove you're human to play and earn $JC tokens. One account per person.
          </p>
        </div>

        {/* Environment Check */}
        {isCheckingEnv ? (
          <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 rounded-lg animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Checking environment...</span>
          </div>
        ) : !inWorldApp ? (
          <div className="flex flex-col items-center gap-3 px-4 py-4 bg-destructive/10 border border-destructive/30 rounded-lg animate-slide-up max-w-sm">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <p className="text-sm text-center text-foreground">
              <span className="font-bold">World App Required</span>
            </p>
            <p className="text-xs text-center text-muted-foreground">
              This app must be opened inside World App to verify your identity and play.
            </p>
            <a 
              href="https://world.org/download"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline hover:no-underline"
            >
              Download World App →
            </a>
          </div>
        ) : null}

        {/* Pending Referral Indicator */}
        {hasPendingReferral && inWorldApp && (
          <div className="flex items-center gap-2 px-4 py-3 bg-success/10 border border-success/30 rounded-lg text-sm animate-slide-up">
            <Gift className="w-5 h-5 text-success" />
            <span className="text-foreground">
              <span className="font-medium text-success">Referral bonus ready!</span> Login to claim your extra play.
            </span>
          </div>
        )}

        {/* Verify Button */}
        <div className="w-full max-w-sm animate-slide-up stagger-2">
          <Button
            variant="gold"
            size="xl"
            className="w-full"
            onClick={handleVerify}
            disabled={isVerifying || isCheckingEnv || !inWorldApp}
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="w-6 h-6" />
                Login with World ID
              </>
            )}
          </Button>
        </div>

        {/* Info */}
        <div className="w-full max-w-sm space-y-2 text-center animate-slide-up stagger-3">
          <p className="text-xs text-muted-foreground">
            By verifying, you confirm you are a unique human.
          </p>
          <p className="text-xs text-muted-foreground">
            Your privacy is protected by zero-knowledge proofs.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Verify;
