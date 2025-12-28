import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, CheckCircle, Share2, MessageCircle, X, Users } from 'lucide-react';
import { JackieIcon, CoinIcon } from '@/components/icons/JackieIcon';
import { toast } from 'sonner';
import { shareViaWorldApp, sendToWorldChat, getReferralDeeplink, shareViaNative } from '@/lib/worldShare';
import { isInWorldApp } from '@/lib/minikit';
import { cn } from '@/lib/utils';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCode: string;
  username?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  referralCode,
  username,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const inviteLink = getReferralDeeplink(referralCode);
  const displayCode = referralCode.toUpperCase();

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Invite link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error('Failed to copy');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success('Link copied!');
    } catch (e) {
      toast.error('Failed to copy');
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    const shareText = `🎮 Join me on Jackie Chain: Millionaire!\n\nAnswer trivia questions and earn $JC tokens. Use my code: ${displayCode}`;

    try {
      if (isInWorldApp()) {
        const result = await shareViaWorldApp({
          title: 'Jackie Chain: Millionaire',
          text: shareText,
          url: inviteLink,
        });
        if (result.success) {
          toast.success('Shared!');
          onClose();
        } else if (result.error !== 'Share cancelled') {
          toast.error(result.error || 'Failed to share');
        }
      } else {
        const result = await shareViaNative({
          title: 'Jackie Chain: Millionaire',
          text: shareText,
          url: inviteLink,
        });
        if (result.success) {
          toast.success('Shared!');
          onClose();
        } else if (result.error !== 'Share cancelled') {
          // Fallback to copy
          handleCopyLink();
        }
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleSendWorldChat = async () => {
    setIsSharing(true);
    const message = `🎮 Join me on Jackie Chain: Millionaire!\n\nAnswer trivia questions and earn $JC tokens.\n\n${inviteLink}`;

    try {
      if (isInWorldApp()) {
        const result = await sendToWorldChat({ message });
        if (result.success) {
          toast.success('Sent to World Chat!');
          onClose();
        } else if (result.error !== 'Share cancelled') {
          toast.error(result.error || 'Failed to send');
        }
      } else {
        // Fallback to native share
        const result = await shareViaNative({
          title: 'Jackie Chain: Millionaire',
          text: message,
          url: inviteLink,
        });
        if (result.success) {
          toast.success('Shared!');
          onClose();
        } else if (result.error !== 'Share cancelled') {
          // Fallback to copy if share not available
          handleCopyLink();
        }
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm mx-4 p-0 gap-0 overflow-hidden bg-card border-border">
        {/* Header with preview */}
        <div className="relative bg-gradient-to-br from-primary/20 to-accent/20 p-6 border-b border-border">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 hover:bg-background/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-background/50 flex items-center justify-center shadow-soft">
              <JackieIcon size={48} />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg">Invite Friends</h3>
              <p className="text-sm text-muted-foreground">
                Get +1 extra play when they complete a run
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Preview Card */}
          <div className="bg-secondary/50 rounded-xl p-4 border border-border/50 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <JackieIcon size={28} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Jackie Chain: Millionaire</p>
                <p className="text-xs text-muted-foreground">Answer trivia, earn $JC tokens</p>
              </div>
              <CoinIcon size={20} />
            </div>
            
            {/* Mini preview of what friend will see */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/50 rounded-lg px-3 py-2">
              <Users className="w-3.5 h-3.5" />
              <span>{username || 'Your friend'} invited you to play</span>
            </div>
          </div>

          {/* Referral Code */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Your referral code</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-secondary rounded-lg px-4 py-3 text-center">
                <span className="text-xl font-mono font-bold tracking-[0.2em]">
                  {displayCode}
                </span>
              </div>
              <Button
                variant={copied ? 'default' : 'outline'}
                size="icon"
                onClick={handleCopyCode}
                className="h-12 w-12"
              >
                {copied ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Share Actions */}
          <div className="space-y-2">
            <Button
              variant="gold"
              className="w-full gap-2"
              onClick={handleShare}
              disabled={isSharing}
            >
              <Share2 className="w-5 h-5" />
              Share Invite Link
            </Button>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleSendWorldChat}
              disabled={isSharing}
            >
              <MessageCircle className="w-5 h-5" />
              Send in World Chat
            </Button>

            <button
              onClick={handleCopyLink}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Or copy the full invite link
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
