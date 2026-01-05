import { useEffect, ReactNode } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';

/**
 * MiniKitProvider - Initializes MiniKit SDK for World App integration
 * This must wrap the app to enable wallet auth and other MiniKit features
 */
export const MiniKitProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    // Install MiniKit on mount
    MiniKit.install();
    console.log('MiniKit installed, isInstalled:', MiniKit.isInstalled());
  }, []);

  return <>{children}</>;
};
