import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JackieIcon, CoinIcon } from '@/components/icons/JackieIcon';
import { AttemptsDisplay } from '@/components/game/AttemptsDisplay';
import { useGame } from '@/contexts/GameContext';
import { formatJC, getWorldAppLink } from '@/lib/constants';
import { ArrowLeft, Copy, Share2, Trophy, History, Users, CheckCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Mock data
const mockRunHistory = [
  { id: '1', date: '2024-01-20', reachedQ: 8, earnedAmount: 1000, claimed: true },
  { id: '2', date: '2024-01-19', reachedQ: 15, earnedAmount: 20000, claimed: true },
  { id: '3', date: '2024-01-18', reachedQ: 3, earnedAmount: 0, claimed: false },
];

const mockReferrals = [
  { id: '1', status: 'first_run_completed', earnedPlays: 1 },
  { id: '2', status: 'verified', earnedPlays: 0 },
  { id: '3', status: 'clicked', earnedPlays: 0 },
];

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state } = useGame();
  const { user, attempts, isVerified } = state;
  
  const defaultTab = searchParams.get('tab') || 'stats';
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Mock invite code
  const inviteCode = user?.id.slice(0, 8).toUpperCase() || 'JACKIE';
  const inviteLink = getWorldAppLink(`/welcome?ref=${inviteCode}`);

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success('Invite link copied!');
  };

  const shareInvite = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join Jackie Chain: Millionaire',
        text: 'Play trivia, win $JC tokens! Use my invite link:',
        url: inviteLink,
      });
    } else {
      copyInviteLink();
    }
  };

  const totalEarned = mockRunHistory.reduce((sum, run) => sum + run.earnedAmount, 0);
  const completedReferrals = mockReferrals.filter(r => r.status === 'first_run_completed').length;

  if (!isVerified) {
    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4 gap-6">
        <JackieIcon size={80} className="animate-float" />
        <h2 className="text-xl font-display font-bold">Verify to View Profile</h2>
        <Button variant="gold" onClick={() => navigate('/verify')}>
          Get Verified
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <header className="flex items-center px-4 py-3 border-b border-border bg-card/50 backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="flex-1 text-center font-display font-bold">Profile</h1>
        <div className="w-10" />
      </header>

      {/* Profile Header */}
      <div className="px-4 py-6 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <JackieIcon size={60} />
          <div className="flex-1">
            <p className="text-lg font-bold">Player</p>
            <p className="text-xs text-muted-foreground font-mono">
              {user?.nullifierHash.slice(0, 16)}...
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Earned</p>
            <div className="flex items-center gap-1 justify-end">
              <CoinIcon size={20} />
              <span className="text-lg font-bold">{formatJC(totalEarned)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="px-4 py-4">
        <AttemptsDisplay attempts={attempts} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-3 mx-4">
          <TabsTrigger value="stats" className="gap-1">
            <Trophy className="w-4 h-4" />
            Stats
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1">
            <History className="w-4 h-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="referrals" className="gap-1">
            <Users className="w-4 h-4" />
            Referrals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="flex-1 px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-xl p-4 border border-border shadow-soft">
              <p className="text-3xl font-display font-bold text-primary">{mockRunHistory.length}</p>
              <p className="text-sm text-muted-foreground">Total Runs</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border shadow-soft">
              <p className="text-3xl font-display font-bold text-primary">15</p>
              <p className="text-sm text-muted-foreground">Best Question</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border shadow-soft">
              <p className="text-3xl font-display font-bold text-success">{completedReferrals}</p>
              <p className="text-sm text-muted-foreground">Referrals</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border shadow-soft">
              <div className="flex items-center gap-1">
                <CoinIcon size={24} />
                <p className="text-2xl font-display font-bold">{formatJC(20000)}</p>
              </div>
              <p className="text-sm text-muted-foreground">Best Win</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="flex-1 px-4 py-4 space-y-3 overflow-y-auto hide-scrollbar">
          {mockRunHistory.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No games played yet.</p>
              <Button variant="gold" className="mt-4" onClick={() => navigate('/')}>
                Start Playing
              </Button>
            </div>
          ) : (
            mockRunHistory.map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between bg-card rounded-xl p-4 border border-border shadow-soft"
              >
                <div>
                  <p className="font-medium">Question {run.reachedQ}/15</p>
                  <p className="text-xs text-muted-foreground">{run.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  {run.earnedAmount > 0 && (
                    <div className="flex items-center gap-1">
                      <CoinIcon size={16} />
                      <span className="font-bold">{formatJC(run.earnedAmount)}</span>
                    </div>
                  )}
                  {run.claimed && (
                    <CheckCircle className="w-4 h-4 text-success" />
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="referrals" className="flex-1 px-4 py-4 space-y-4 overflow-y-auto hide-scrollbar">
          {/* Invite Card */}
          <div className="bg-card rounded-2xl p-5 border border-border shadow-card space-y-4">
            <div className="text-center">
              <h3 className="font-display font-bold text-lg">Invite Friends</h3>
              <p className="text-sm text-muted-foreground">
                Get +1 play when they complete their first run!
              </p>
            </div>

            <div className="flex items-center gap-2 bg-secondary rounded-lg p-3">
              <span className="flex-1 text-sm font-mono truncate">{inviteCode}</span>
              <Button variant="ghost" size="sm" onClick={copyInviteLink}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <Button variant="gold" className="w-full" onClick={shareInvite}>
              <Share2 className="w-5 h-5" />
              Share Invite Link
            </Button>
          </div>

          {/* Referral List */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Your Referrals</h4>
            {mockReferrals.map((ref) => (
              <div
                key={ref.id}
                className="flex items-center justify-between bg-card rounded-xl p-4 border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    ref.status === 'first_run_completed' ? 'bg-success/20' : 'bg-secondary'
                  )}>
                    <Users className={cn(
                      'w-4 h-4',
                      ref.status === 'first_run_completed' ? 'text-success' : 'text-muted-foreground'
                    )} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Invited User</p>
                    <p className={cn(
                      'text-xs',
                      ref.status === 'first_run_completed' ? 'text-success' : 'text-muted-foreground'
                    )}>
                      {ref.status === 'first_run_completed' && '✓ Completed first run'}
                      {ref.status === 'verified' && 'Verified, awaiting first run'}
                      {ref.status === 'clicked' && 'Link clicked, not verified'}
                    </p>
                  </div>
                </div>
                {ref.earnedPlays > 0 && (
                  <span className="text-sm font-bold text-success">+{ref.earnedPlays}</span>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
