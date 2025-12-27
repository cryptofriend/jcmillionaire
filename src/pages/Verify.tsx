import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { JackieIcon } from '@/components/icons/JackieIcon';
import { useGame } from '@/contexts/GameContext';
import { Shield, Fingerprint, Eye, ArrowLeft, CheckCircle, Loader2, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createOrGetUser, persistUser } from '@/lib/userService';
import { linkInvitedUserToReferral } from '@/lib/referralService';
import { isInWorldApp, authenticateWithWallet } from '@/lib/minikit';
import { toast } from 'sonner';

const Verify: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { dispatch } = useGame();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationLevel, setVerificationLevel] = useState<'device' | 'orb'>('device');
  const [isSuccess, setIsSuccess] = useState(false);
  const [inWorldApp, setInWorldApp] = useState(false);

  const referralCodeFromUrl = searchParams.get('ref');
  const referralCode = referralCodeFromUrl || localStorage.getItem('jc_referral_code');

  // Check if we're in World App on mount
  useEffect(() => {
    setInWorldApp(isInWorldApp());

    // Persist referral code if it exists in the URL
    if (referralCodeFromUrl) {
      localStorage.setItem('jc_referral_code', referralCodeFromUrl);
    }
  }, [referralCodeFromUrl]);

  const handleVerify = async () => {
    setIsVerifying(true);
    
    try {
      let user;

      if (inWorldApp) {
        // Use MiniKit wallet auth in World App
        console.log('Authenticating with World App wallet...');
        const result = await authenticateWithWallet(verificationLevel);
        
        if (!result.success || !result.user) {
          throw new Error(result.error || 'Wallet authentication failed');
        }
        
        // Store the wallet address for later use
        localStorage.setItem('jc_wallet_address', result.user.wallet_address);
        
        // Create the user object matching our type
        user = {
          id: result.user.id,
          verification_level: result.user.verification_level as 'device' | 'orb',
          nullifier_hash: `wallet_${result.user.wallet_address}`,
          created_at: result.user.created_at,
          updated_at: result.user.created_at,
        };
        
        // Persist user to localStorage
        persistUser(user);
        
      } else {
        // Demo mode - simulate World ID verification
        console.log('Demo mode - simulating verification...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Generate a mock nullifier hash
        const mockNullifierHash = `world_id_nullifier_${verificationLevel}_test_user`;
        
        // Create or get user in database
        const { user: dbUser, error } = await createOrGetUser(mockNullifierHash, verificationLevel);
        
        if (error || !dbUser) {
          throw new Error(error || 'Failed to create user');
        }
        
        user = dbUser;
      }
      
      console.log('User verified:', user.id);
      
      // If user came from a referral link, link them to the referral
      if (referralCode) {
        console.log('Processing referral code:', referralCode);
        const { success, error } = await linkInvitedUserToReferral(referralCode, user.id);
        if (success) {
          console.log('Referral linked successfully');
          localStorage.removeItem('jc_referral_code');
        } else if (error) {
          console.log('Referral linking failed:', error);
        }
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

        {/* World App / Demo Mode Indicator */}
        {!inWorldApp && (
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg text-xs text-muted-foreground animate-slide-up">
            <Smartphone className="w-4 h-4" />
            <span>Demo mode — open in World App for wallet authentication</span>
          </div>
        )}

        {referralCode && (
          <div className="bg-success/10 border border-success/30 rounded-xl px-4 py-3 animate-slide-up">
            <p className="text-sm text-center">
              🎉 <span className="font-medium">You were invited!</span> Complete verification and your first run to both earn +1 play.
            </p>
          </div>
        )}

        {/* Verification Level Selection */}
        <div className="w-full max-w-sm space-y-3 animate-slide-up stagger-1">
          <p className="text-sm font-medium text-muted-foreground text-center">
            Choose verification level:
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setVerificationLevel('device')}
              disabled={isVerifying}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                verificationLevel === 'device'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-primary/50'
              )}
            >
              <Fingerprint className={cn(
                'w-8 h-8',
                verificationLevel === 'device' ? 'text-primary' : 'text-muted-foreground'
              )} />
              <span className="font-medium text-sm">Device</span>
              <span className="text-xs text-muted-foreground">Quick verify</span>
            </button>
            
            <button
              onClick={() => setVerificationLevel('orb')}
              disabled={isVerifying}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                verificationLevel === 'orb'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-primary/50'
              )}
            >
              <Eye className={cn(
                'w-8 h-8',
                verificationLevel === 'orb' ? 'text-primary' : 'text-muted-foreground'
              )} />
              <span className="font-medium text-sm">Orb</span>
              <span className="text-xs text-muted-foreground">Biometric</span>
            </button>
          </div>
        </div>

        {/* Verify Button */}
        <div className="w-full max-w-sm animate-slide-up stagger-2">
          <Button
            variant="gold"
            size="xl"
            className="w-full"
            onClick={handleVerify}
            disabled={isVerifying}
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
