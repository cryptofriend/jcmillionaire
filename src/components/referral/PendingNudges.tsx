import React from 'react';
import { Button } from '@/components/ui/button';
import { Clock, MousePointer, MessageCircle, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns/format';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { getWorldAppLink } from '@/lib/constants';
import { toast } from 'sonner';
import { MiniKit } from '@worldcoin/minikit-js';

interface PendingReferral {
  id: string;
  status: 'clicked' | 'verified' | 'first_run_completed';
  created_at: string;
  username?: string;
}

interface PendingNudgesProps {
  referrals: PendingReferral[];
  inviteCode: string;
}

export const PendingNudges: React.FC<PendingNudgesProps> = ({ referrals, inviteCode }) => {
  const pendingReferrals = referrals.filter(
    r => r.status === 'clicked' || r.status === 'verified'
  );

  if (pendingReferrals.length === 0) return null;

  const clickedCount = pendingReferrals.filter(r => r.status === 'clicked').length;
  const verifiedCount = pendingReferrals.filter(r => r.status === 'verified').length;

  const handleRemindAll = async () => {
    const inviteLink = getWorldAppLink(`/?ref=${inviteCode}`);
    const message = `Hey! You signed up for JC Millionaire but haven't played yet. Come try it - answer 15 questions to win JC tokens! 🎮\n\n${inviteLink}`;
    
    if (MiniKit.isInstalled()) {
      try {
        // Use the share command to share the reminder
        await MiniKit.commandsAsync.share({
          title: 'Reminder: Play JC Millionaire!',
          text: message,
        });
        toast.success('Share opened to remind friends!');
      } catch (e) {
        // Fall back to clipboard
        await navigator.clipboard.writeText(message);
        toast.success('Reminder message copied! Share it with your friends.');
      }
    } else {
      await navigator.clipboard.writeText(message);
      toast.success('Reminder message copied! Share it with your friends.');
    }
  };

  return (
    <div className="bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/30 rounded-2xl p-4 space-y-3">
      {/* Header with alert */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 text-warning animate-pulse" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm">
            {pendingReferrals.length} friend{pendingReferrals.length !== 1 ? 's' : ''} waiting!
          </h4>
          <p className="text-xs text-muted-foreground">
            Remind them to play & you both get +1 extra life
          </p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="flex gap-2 text-xs">
        {clickedCount > 0 && (
          <div className="flex items-center gap-1 bg-muted/50 rounded-full px-2 py-1">
            <MousePointer className="w-3 h-3 text-muted-foreground" />
            <span>{clickedCount} clicked</span>
          </div>
        )}
        {verifiedCount > 0 && (
          <div className="flex items-center gap-1 bg-warning/20 rounded-full px-2 py-1">
            <Clock className="w-3 h-3 text-warning" />
            <span>{verifiedCount} verified, not played</span>
          </div>
        )}
      </div>

      {/* List of pending friends (max 3) */}
      <div className="space-y-2">
        {pendingReferrals.slice(0, 3).map((ref) => (
          <div
            key={ref.id}
            className="flex items-center justify-between bg-card/80 rounded-lg px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                ref.status === 'verified' ? 'bg-warning/20 text-warning' : 'bg-muted text-muted-foreground'
              )}>
                {ref.username ? ref.username.charAt(0).toUpperCase() : '?'}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {ref.username || 'Anonymous'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(ref.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            <span className={cn(
              'text-[10px] px-2 py-0.5 rounded-full',
              ref.status === 'verified' 
                ? 'bg-warning/20 text-warning' 
                : 'bg-muted text-muted-foreground'
            )}>
              {ref.status === 'verified' ? 'Needs to play' : 'Needs to verify'}
            </span>
          </div>
        ))}
        {pendingReferrals.length > 3 && (
          <p className="text-xs text-muted-foreground text-center">
            +{pendingReferrals.length - 3} more waiting...
          </p>
        )}
      </div>

      {/* CTA Button */}
      <Button
        variant="outline"
        className="w-full border-warning text-warning hover:bg-warning/10"
        onClick={handleRemindAll}
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        Send Reminder
      </Button>
    </div>
  );
};
