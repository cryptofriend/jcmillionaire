import React, { useEffect, useState, useRef } from 'react';
import { Trophy, Crown, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUserBalance, formatJC, getUserLeaderboardPosition, LeaderboardPosition } from '@/lib/rewardsService';
import { useGame } from '@/contexts/GameContext';
import { cn } from '@/lib/utils';
import { CoinIcon } from '@/components/icons/JackieIcon';
import { hapticTap } from '@/lib/haptics';

interface UserBalanceProps {
  className?: string;
}

export const UserBalance: React.FC<UserBalanceProps> = ({ className }) => {
  const { state } = useGame();
  const [balance, setBalance] = useState<number>(0);
  const [prevBalance, setPrevBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [leaderboardPos, setLeaderboardPos] = useState<LeaderboardPosition | null>(null);
  const [progressAnimated, setProgressAnimated] = useState(false);
  const [showCrownAnimation, setShowCrownAnimation] = useState(false);
  const [showCoinShimmer, setShowCoinShimmer] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      if (state.user?.id) {
        setLoading(true);
        const [userBalance, position] = await Promise.all([
          getUserBalance(state.user.id),
          getUserLeaderboardPosition(state.user.id),
        ]);
        
        // Detect balance increase and trigger shimmer
        if (!loading && userBalance > balance) {
          setShowCoinShimmer(true);
          setTimeout(() => setShowCoinShimmer(false), 1000);
        }
        
        setPrevBalance(balance);
        setBalance(userBalance);
        setLeaderboardPos(position);
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [state.user?.id]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
        setProgressAnimated(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  // Trigger progress animation when expanded
  useEffect(() => {
    if (isExpanded && !progressAnimated) {
      const timer = setTimeout(() => setProgressAnimated(true), 100);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, progressAnimated]);

  // Crown animation for #1 (once per day)
  useEffect(() => {
    if (leaderboardPos?.isLeader && isExpanded) {
      const lastCrownDate = localStorage.getItem('jc_crown_anim_date');
      const today = new Date().toDateString();
      if (lastCrownDate !== today) {
        setShowCrownAnimation(true);
        localStorage.setItem('jc_crown_anim_date', today);
        setTimeout(() => setShowCrownAnimation(false), 2000);
      }
    }
  }, [leaderboardPos?.isLeader, isExpanded]);

  const handleCardClick = () => {
    hapticTap();
    setIsExpanded(!isExpanded);
    if (isExpanded) {
      setProgressAnimated(false);
    }
  };

  if (!state.isVerified) {
    return null;
  }

  const isNearNextRank = leaderboardPos && leaderboardPos.progressPercent >= 80;

  return (
    <motion.div
      ref={cardRef}
      layout
      onClick={handleCardClick}
      className={cn(
        'relative overflow-hidden cursor-pointer',
        'bg-card rounded-xl border shadow-soft transition-colors',
        isExpanded ? 'border-primary/40' : 'border-primary/20 hover:border-primary/30',
        className
      )}
      initial={false}
      animate={{
        boxShadow: isExpanded 
          ? '0 8px 32px -8px hsl(var(--primary) / 0.3)' 
          : '0 2px 8px -2px hsl(var(--primary) / 0.1)',
      }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* Main Balance Row */}
      <motion.div 
        layout="position"
        className="flex items-center gap-2 px-4 py-3"
      >
        <motion.div
          className="relative"
          animate={{ 
            scale: isExpanded ? 1.1 : 1,
            rotate: isExpanded ? [0, -10, 10, 0] : 0,
          }}
          transition={{ duration: 0.3 }}
        >
          <CoinIcon size={24} className="drop-shadow-sm" />
          
          {/* Shimmer overlay on balance increase */}
          <AnimatePresence>
            {showCoinShimmer && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: [0, 1, 1, 0],
                  scale: [0.8, 1.2, 1.4, 1.6],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400/60 via-white/80 to-yellow-400/60 blur-sm" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Your Balance</p>
          <p className="text-lg font-display font-bold text-gradient-gold">
            {loading ? '...' : `${balance.toLocaleString()} JC`}
          </p>
        </div>
        
        {/* Subtle tap hint when collapsed */}
        <AnimatePresence>
          {!isExpanded && leaderboardPos && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-1 text-xs text-muted-foreground"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>#{leaderboardPos.rank}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Expanded Leaderboard Progress Panel */}
      <AnimatePresence>
        {isExpanded && leaderboardPos && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/50">
              {/* Status Line */}
              <div className="flex items-center gap-2">
                {leaderboardPos.isLeader ? (
                  <>
                    <motion.div
                      animate={showCrownAnimation ? {
                        scale: [1, 1.3, 1],
                        rotate: [0, -15, 15, 0],
                      } : {}}
                      transition={{ duration: 0.6 }}
                    >
                      <Crown className="w-5 h-5 text-yellow-400" />
                    </motion.div>
                    <span className="font-display font-bold text-foreground">
                      You're leading. Stay sharp.
                    </span>
                  </>
                ) : (
                  <>
                    <Trophy className="w-5 h-5 text-primary" />
                    <span className="font-display font-bold text-foreground">
                      You're #{leaderboardPos.rank} on the leaderboard
                    </span>
                  </>
                )}
              </div>

              {/* Next Rank Progress */}
              {!leaderboardPos.isLeader && leaderboardPos.nextRank && (
                <>
                  {/* Progress Text */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span>
                      Climb to <span className="font-bold text-foreground">#{leaderboardPos.nextRank.rank}</span> in{' '}
                      <span className="font-bold text-primary">{leaderboardPos.nextRank.jcNeeded.toLocaleString()} JC</span>
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className={cn(
                        'absolute inset-y-0 left-0 rounded-full',
                        isNearNextRank 
                          ? 'bg-gradient-to-r from-primary to-yellow-400' 
                          : 'bg-primary'
                      )}
                      initial={{ width: 0 }}
                      animate={{ 
                        width: progressAnimated ? `${leaderboardPos.progressPercent}%` : 0 
                      }}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                    />
                    
                    {/* Glow effect at 80%+ */}
                    {isNearNextRank && progressAnimated && (
                      <motion.div
                        className="absolute inset-y-0 right-0 w-4 bg-gradient-to-r from-transparent to-yellow-400/50 rounded-full blur-sm"
                        style={{ left: `${leaderboardPos.progressPercent - 5}%` }}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                  </div>
                </>
              )}

              {/* Leader Lock State */}
              {leaderboardPos.isLeader && (
                <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-primary to-yellow-400 rounded-full"
                    animate={{
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    style={{ backgroundSize: '200% 100%' }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
