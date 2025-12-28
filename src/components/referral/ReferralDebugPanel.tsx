import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Bug, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearPendingReferral, getPendingReferral } from '@/hooks/useReferralTracking';
import { supabase } from '@/integrations/supabase/client';

interface PendingReferral {
  code: string;
  referralId: string;
  inviterUserId: string;
  clickedAt: string;
}

export const ReferralDebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingReferral, setPendingReferral] = useState<PendingReferral | null>(null);
  const [recentReferrals, setRecentReferrals] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = async () => {
    setIsRefreshing(true);
    
    // Read from localStorage using the helper function
    setPendingReferral(getPendingReferral());

    // Fetch recent referrals from DB
    try {
      const { data } = await supabase
        .from('referrals')
        .select('id, invite_code, status, created_at, invited_user_id, inviter_user_id')
        .order('created_at', { ascending: false })
        .limit(5);
      
      setRecentReferrals(data || []);
    } catch (e) {
      console.error('Failed to fetch referrals:', e);
    }

    setIsRefreshing(false);
  };

  useEffect(() => {
    if (isOpen) {
      refresh();
    }
  }, [isOpen]);

  const handleClear = () => {
    clearPendingReferral();
    setPendingReferral(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-50 p-2 bg-card border border-border rounded-full shadow-lg hover:bg-secondary transition-colors"
        title="Open Referral Debug Panel"
      >
        <Bug className="w-5 h-5 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 w-80 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-secondary/50 border-b border-border">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Referral Debug</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={refresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto text-xs">
        {/* Pending Referral */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-muted-foreground uppercase tracking-wide">
              Pending Referral (localStorage)
            </h4>
            {pendingReferral && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-destructive hover:text-destructive"
                onClick={handleClear}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
          
          {pendingReferral ? (
            <div className="bg-secondary/50 rounded-lg p-3 space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">code:</span>
                <span className="text-foreground">{pendingReferral.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">referralId:</span>
                <span className="text-foreground truncate max-w-[140px]">{pendingReferral.referralId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">inviterUserId:</span>
                <span className="text-foreground truncate max-w-[140px]">{pendingReferral.inviterUserId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">clickedAt:</span>
                <span className="text-foreground">{new Date(pendingReferral.clickedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          ) : (
            <div className="bg-secondary/50 rounded-lg p-3 text-center text-muted-foreground">
              No pending referral
            </div>
          )}
        </div>

        {/* Recent Referrals from DB */}
        <div>
          <h4 className="font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Recent Referrals (Database)
          </h4>
          
          {recentReferrals.length > 0 ? (
            <div className="space-y-2">
              {recentReferrals.map((ref) => (
                <div key={ref.id} className="bg-secondary/50 rounded-lg p-2 font-mono">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{ref.invite_code}</span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-medium",
                      ref.status === 'clicked' && "bg-yellow-500/20 text-yellow-600",
                      ref.status === 'verified' && "bg-blue-500/20 text-blue-600",
                      ref.status === 'first_run_completed' && "bg-green-500/20 text-green-600"
                    )}>
                      {ref.status}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-1">
                    {new Date(ref.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-secondary/50 rounded-lg p-3 text-center text-muted-foreground">
              No referrals in database
            </div>
          )}
        </div>

        {/* Test Link */}
        <div className="pt-2 border-t border-border">
          <p className="text-muted-foreground mb-2">Test referral tracking:</p>
          <a
            href="/?ref=5bb146d5"
            className="text-primary hover:underline font-mono"
          >
            /?ref=5bb146d5
          </a>
        </div>
      </div>
    </div>
  );
};
