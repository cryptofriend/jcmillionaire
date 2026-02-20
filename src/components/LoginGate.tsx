import { ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';

interface LoginGateProps {
  children: ReactNode;
}

export const LoginGate = ({ children }: LoginGateProps) => {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();

  if (connected) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4 gap-6">
      <Wallet className="w-16 h-16 text-primary" />
      <h1 className="text-2xl font-display font-bold text-foreground text-center">
        Connect Your Wallet
      </h1>
      <p className="text-muted-foreground text-center max-w-xs">
        Connect a Solana wallet to play and earn $JC tokens.
      </p>
      <Button variant="gold" size="xl" onClick={() => setVisible(true)}>
        Connect Wallet
      </Button>
    </div>
  );
};
