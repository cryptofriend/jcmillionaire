import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { JackieIcon } from '@/components/icons/JackieIcon';
import { PoolStats } from '@/components/game/PoolStats';
import { UserBalance } from '@/components/game/UserBalance';
import { MiniLeaderboard } from '@/components/game/MiniLeaderboard';
import { ShareModal } from '@/components/referral/ShareModal';
import { TrailerCard } from '@/components/home/TrailerCard';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { LoginButtons } from '@/components/LoginButtons';
import { useGame } from '@/contexts/GameContext';
import { Play, ChevronRight, X, Zap, Gift, Share2, Copy, MessageCircle } from 'lucide-react';
import { generateReferralCode } from '@/lib/referralService';
import { getWorldAppLink } from '@/lib/constants';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { isInWorldApp } from '@/lib/minikit';


interface InfoPopupProps {
  title: string;
  description: string;
  onClose: () => void;
}

const InfoPopup: React.FC<InfoPopupProps> = ({ title, description, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
    <div 
      className="bg-card rounded-xl border border-border p-5 shadow-lg max-w-xs w-full animate-scale-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-lg text-foreground">{title}</h3>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  </div>
);

const TRAILER_WATCHED_KEY = 'jc_trailer_watched';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const { isVerified, attempts, dayState, user } = state;
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSolanaLogging, setIsSolanaLogging] = useState(false);
  
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  
  // Check if user has watched trailer before - default to referral if they have
  const hasWatchedTrailer = localStorage.getItem(TRAILER_WATCHED_KEY) === 'true';
  const [activeTab, setActiveTab] = useState<'story' | 'referral'>(hasWatchedTrailer ? 'referral' : 'story');

  const handleDismissTrailer = () => {
    localStorage.setItem(TRAILER_WATCHED_KEY, 'true');
    setActiveTab('referral');
  };

  const referralCode = user ? generateReferralCode(user.id) : '';
  const canPlay = isVerified && (attempts?.remaining || 0) > 0;

  const handleStartRun = () => {
    if (!isVerified) {
      navigate('/verify');
      return;
    }
    if (canPlay) {
      navigate('/game');
    }
  };

  const handleOpenShareModal = () => {
    setIsShareModalOpen(true);
  };

  const handleSolanaLogin = async () => {
    if (!isPhantomAvailable()) {
      toast.error('Phantom wallet not found. Please install Phantom.');
      return;
    }
    setIsSolanaLogging(true);
    try {
      const result = await authenticateWithPhantom();
      if (!result.success || !result.user) {
        throw new Error(result.error || 'Phantom authentication failed');
      }
      const userData = {
        id: result.user.id,
        verification_level: result.user.verification_level,
        wallet_address: result.user.wallet_address,
        created_at: result.user.created_at,
      };
      // Check if returning user with username
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('id', result.user.id)
        .maybeSingle();

      const finishLogin = async (username?: string) => {
        localStorage.setItem('jc_wallet_address', userData.wallet_address);
        localStorage.setItem('jc_wallet_type', 'solana');
        const userObj = {
          id: userData.id,
          verificationLevel: userData.verification_level as 'device' | 'orb',
          nullifierHash: `solana_${userData.wallet_address}`,
          createdAt: userData.created_at,
          username,
        };
        persistUser(userObj);
        await linkPendingReferralToUser(userObj.id);
        dispatch({ type: 'SET_USER', payload: userObj });
      };

      if (existingUser?.username) {
        await finishLogin(existingUser.username);
      } else {
        setPendingUserId(result.user.id);
        localStorage.setItem('jc_wallet_address', userData.wallet_address);
        localStorage.setItem('jc_wallet_type', 'solana');
        localStorage.setItem('jc_pending_user_data', JSON.stringify(userData));
        setIsSolanaLogging(false);
        setShowUsernamePrompt(true);
      }
    } catch (error) {
      console.error('Solana login failed:', error);
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsSolanaLogging(false);
    }
  };

  

  const handleUsernameComplete = async (username: string) => {
    setShowUsernamePrompt(false);
    const pendingData = localStorage.getItem('jc_pending_user_data');
    if (pendingData) {
      const userData = JSON.parse(pendingData);
      localStorage.removeItem('jc_pending_user_data');
      const userObj = {
        id: userData.id,
        verificationLevel: userData.verification_level as 'device' | 'orb',
        nullifierHash: `solana_${userData.wallet_address}`,
        createdAt: userData.created_at,
        username,
      };
      persistUser(userObj);
      await linkPendingReferralToUser(userObj.id);
      dispatch({ type: 'SET_USER', payload: userObj });
    }
  };

  const handleUsernameSkip = async () => {
    setShowUsernamePrompt(false);
    const pendingData = localStorage.getItem('jc_pending_user_data');
    if (pendingData) {
      const userData = JSON.parse(pendingData);
      localStorage.removeItem('jc_pending_user_data');
      const userObj = {
        id: userData.id,
        verificationLevel: userData.verification_level as 'device' | 'orb',
        nullifierHash: `solana_${userData.wallet_address}`,
        createdAt: userData.created_at,
      };
      persistUser(userObj);
      await linkPendingReferralToUser(userObj.id);
      dispatch({ type: 'SET_USER', payload: userObj });
    }
  };

  const infoItems = [
    { 
      id: 'questions', 
      value: '15', 
      label: t('home.questions'),
      description: t('home.questions_desc')
    },
    { 
      id: 'lifelines', 
      value: '3', 
      label: t('home.lifelines'),
      description: t('home.lifelines_desc')
    },
    { 
      id: 'safehavens', 
      value: '2', 
      label: t('home.safe_havens'),
      description: t('home.safe_havens_desc')
    },
  ];

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        referralCode={referralCode}
      />

      {showUsernamePrompt && pendingUserId && (
        <UsernamePrompt
          open={showUsernamePrompt}
          userId={pendingUserId}
          onComplete={handleUsernameComplete}
          onSkip={handleUsernameSkip}
        />
      )}

      {activePopup && (
        <InfoPopup
          title={infoItems.find(i => i.id === activePopup)?.label || ''}
          description={infoItems.find(i => i.id === activePopup)?.description || ''}
          onClose={() => setActivePopup(null)}
        />
      )}

      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <JackieIcon size={40} className="animate-float" />
          <div>
            <h1 className="text-lg font-display font-bold text-foreground">{t('app_name')}</h1>
            <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>
        {(!user?.walletType || user.walletType !== 'solana') && <LanguageSwitcher />}
      </header>

      <main className="flex-1 flex flex-col items-center justify-start px-4 pb-24 gap-5 overflow-y-auto">
        <div className="text-center space-y-3 animate-fade-in">
          <a 
            href="https://x.com/iamjackiechain"
            target="_blank"
            rel="noopener noreferrer"
            className="relative inline-block cursor-pointer active:scale-95 transition-all duration-300 hover:drop-shadow-[0_0_20px_hsl(var(--primary)/0.6)] hover:scale-105"
            aria-label="Follow us on X"
          >
            <JackieIcon size={100} className="animate-float drop-shadow-lg transition-all duration-300" />
          </a>
          
          <h2 className="text-3xl font-display font-bold text-gradient-gold">
            {t('home.win_jackpot')}
          </h2>
          <p className="text-muted-foreground max-w-xs mx-auto text-sm">
            {t('home.description')}
          </p>
        </div>

        {/* Trailer visible to everyone */}
        <div className="w-full max-w-sm animate-slide-up stagger-1">
          <TrailerCard 
            onDismiss={handleDismissTrailer} 
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {!isVerified && (
          <div className="w-full max-w-sm space-y-3 animate-slide-up stagger-2">
            <div className="w-full space-y-3">
              <Button
                variant="gold"
                size="xl"
                className="w-full bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-[#8835EF] hover:to-[#0DE185] text-white border-0"
                onClick={handleSolanaLogin}
                disabled={isSolanaLogging}
              >
                {isSolanaLogging ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <SolanaIcon size={20} />
                    Login with Solana
                  </>
                )}
              </Button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <Button
                variant="outline"
                size="xl"
                className="w-full"
                onClick={() => navigate('/verify')}
              >
                <WorldIdIcon size={20} />
                {t('home.login_world_id')}
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {isVerified && (
          <div className="w-full max-w-sm space-y-3 animate-slide-up stagger-1">
            <UserBalance />
            
            <PoolStats dayState={dayState} />
            
            {attempts && (
              <div className="px-4 py-3 bg-card rounded-xl border border-border shadow-soft space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className={cn(
                      'w-5 h-5',
                      attempts.remaining > 0 ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    <span className="text-sm font-medium text-muted-foreground">{t('home.plays_today')}</span>
                  </div>
                  <span className={cn(
                    'text-lg font-bold',
                    attempts.remaining > 0 ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {attempts.remaining} / {attempts.cap}
                  </span>
                </div>

                {attempts.earnedFromReferrals > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-success">
                    <Gift className="w-3.5 h-3.5" />
                    <span className="font-medium">+{attempts.earnedFromReferrals} {t('home.from_referrals')}</span>
                  </div>
                )}

                <div className="flex gap-1 flex-wrap">
                  {Array.from({ length: Math.min(attempts.cap, 10) }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-2.5 h-2.5 rounded-full transition-colors',
                        i < attempts.remaining ? 'bg-primary' : 'bg-secondary'
                      )}
                    />
                  ))}
                </div>

                {activeTab === 'referral' && (
                  <div className="border-t border-border pt-3 space-y-3">
                    <h3 className="text-center font-display font-bold text-lg text-foreground">
                      {t('home.invite_friend')}
                    </h3>
                    
                    <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2">
                      <span className="flex-1 text-center text-lg font-mono font-bold tracking-widest text-foreground">
                        {user ? generateReferralCode(user.id) : '--------'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const { getReferralDeeplink } = require('@/lib/worldShare');
                          const link = user ? getReferralDeeplink(generateReferralCode(user.id)) : '';
                          navigator.clipboard.writeText(link);
                          toast.success(t('home.copied'));
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="gold"
                        size="sm"
                        onClick={handleOpenShareModal}
                        className="gap-1.5"
                      >
                        <Share2 className="w-4 h-4" />
                        {t('home.share')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {isVerified && (
          <div className="w-full max-w-sm space-y-3 animate-slide-up stagger-2">
            {canPlay ? (
              <Button
                variant="gold"
                size="xl"
                className="w-full animate-pulse-gold"
                onClick={handleStartRun}
              >
                <Play className="w-6 h-6" />
                {t('home.start_run')}
                <ChevronRight className="w-5 h-5" />
              </Button>
            ) : (
              <div className="flex flex-col gap-3 w-full">
                <Button
                  variant="gold"
                  size="xl"
                  className="w-full opacity-60"
                  disabled
                >
                  <Zap className="w-6 h-6" />
                  {t('home.no_plays_remaining', 'No Plays Remaining')}
                </Button>
                <a
                  href="https://t.me/jackiechainbot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full gap-2"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Chat with Jackie
                  </Button>
                </a>
              </div>
            )}
          </div>
        )}

        {isVerified && (
          <div className="flex gap-4 text-center animate-slide-up stagger-3">
            {infoItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActivePopup(item.id)}
                className="px-4 py-2 bg-card rounded-xl border border-border shadow-soft hover:border-primary/50 transition-colors active:scale-95"
              >
                <p className="text-2xl font-display font-bold text-primary">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </button>
            ))}
          </div>
        )}

        <div className="w-full max-w-sm animate-slide-up stagger-4">
          <MiniLeaderboard />
        </div>
      </main>

      <footer className="px-4 py-3 text-center">
        <p className="text-xs text-muted-foreground">
          {t('powered_by')}
        </p>
      </footer>
    </div>
  );
};

export default Home;