import React, { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { getUserBalance, formatJC } from '@/lib/rewardsService';
import { useGame } from '@/contexts/GameContext';
import { cn } from '@/lib/utils';

interface UserBalanceProps {
  className?: string;
}

export const UserBalance: React.FC<UserBalanceProps> = ({ className }) => {
  const { state } = useGame();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      if (state.user?.id) {
        setLoading(true);
        const userBalance = await getUserBalance(state.user.id);
        setBalance(userBalance);
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [state.user?.id]);

  if (!state.isVerified) {
    return null;
  }

  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-3 bg-card rounded-xl border border-primary/20 shadow-soft',
      className
    )}>
      <Coins className="w-5 h-5 text-primary" />
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">Your Balance</p>
        <p className="text-lg font-display font-bold text-gradient-gold">
          {loading ? '...' : `${formatJC(balance)} JC`}
        </p>
      </div>
    </div>
  );
};
