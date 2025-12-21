import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { JackieIcon } from '@/components/icons/JackieIcon';
import { useGame } from '@/contexts/GameContext';
import { Shield, Fingerprint, Eye, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const Verify: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { dispatch } = useGame();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationLevel, setVerificationLevel] = useState<'device' | 'orb'>('device');
  const [isSuccess, setIsSuccess] = useState(false);

  const referralCode = searchParams.get('ref');

  const handleVerify = async () => {
    setIsVerifying(true);
    
    // Simulate World ID verification flow
    // In production, this would use MiniKit.commands.verify()
    try {
      // Simulated delay for demo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock user creation - in production this calls backend with World ID proof
      const mockUser = {
        id: crypto.randomUUID(),
        nullifierHash: `mock_nullifier_${Date.now()}`,
        verificationLevel,
        createdAt: new Date().toISOString(),
      };
      
      dispatch({ type: 'SET_USER', payload: mockUser });
      setIsSuccess(true);
      
      // Navigate to home after short delay
      setTimeout(() => {
        navigate('/');
      }, 1500);
      
    } catch (error) {
      console.error('Verification failed:', error);
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
            Verify with World ID
          </h1>
          <p className="text-muted-foreground max-w-xs mx-auto">
            Prove you're human to play and earn $JC tokens. One account per person.
          </p>
        </div>

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
                Verify with World ID
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
