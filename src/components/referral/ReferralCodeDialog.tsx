import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { redeemReferralCode } from '@/lib/referralService';
import { useGame } from '@/contexts/GameContext';
import { cn } from '@/lib/utils';

interface ReferralCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReferralCodeDialog: React.FC<ReferralCodeDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { state, fetchAttempts } = useGame();
  const { user } = state;
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !code.trim()) return;

    setIsSubmitting(true);
    setResult(null);
    setErrorMessage('');

    const { success, error } = await redeemReferralCode(code.trim(), user.id);

    setIsSubmitting(false);

    if (success) {
      setResult('success');
      // Refresh attempts to show the new extra life
      await fetchAttempts();
      // Close dialog after a short delay
      setTimeout(() => {
        onOpenChange(false);
        setCode('');
        setResult(null);
      }, 2000);
    } else {
      setResult('error');
      setErrorMessage(error || 'Invalid referral code');
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      setCode('');
      setResult(null);
      setErrorMessage('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xs mx-auto">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Gift className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="font-display">Enter Referral Code</DialogTitle>
          <DialogDescription>
            Enter a friend's code to get +1 extra life for both of you!
          </DialogDescription>
        </DialogHeader>

        {result === 'success' ? (
          <div className="text-center py-4 space-y-3 animate-scale-in">
            <div className="w-16 h-16 mx-auto rounded-full bg-success/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <div>
              <p className="font-bold text-success">+1 Extra Life!</p>
              <p className="text-sm text-muted-foreground">Your friend also got +1 life</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Enter referral code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setResult(null);
                  setErrorMessage('');
                }}
                className={cn(
                  "text-center text-lg font-mono tracking-widest uppercase",
                  result === 'error' && "border-destructive focus-visible:ring-destructive"
                )}
                maxLength={8}
                disabled={isSubmitting}
              />
              {result === 'error' && (
                <div className="flex items-center gap-1.5 text-destructive text-sm justify-center">
                  <XCircle className="w-4 h-4" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              variant="gold"
              className="w-full"
              disabled={isSubmitting || code.trim().length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4" />
                  Redeem Code
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
