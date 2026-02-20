import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut } from 'lucide-react';

export const WalletLoginButton = () => {
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  if (connected && publicKey) {
    const base58 = publicKey.toBase58();
    const truncated = `${base58.slice(0, 4)}...${base58.slice(-4)}`;

    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-foreground">{truncated}</span>
        <Button variant="ghost" size="icon" onClick={() => disconnect()}>
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button variant="gold" onClick={() => setVisible(true)} className="gap-2">
      <Wallet className="w-4 h-4" />
      Login
    </Button>
  );
};
