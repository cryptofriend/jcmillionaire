import { useEffect, ReactNode } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { APP_ID } from '@/lib/constants';

/**
 * MiniKitProvider - Initializes MiniKit SDK for World App integration
 * This must wrap the app to enable wallet auth and other MiniKit features
 */
export const MiniKitProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    // Install MiniKit with app_id so World ID popup shows "Jackie Chain"
    MiniKit.install(APP_ID);
    console.log('MiniKit installed with app_id:', APP_ID, 'isInstalled:', MiniKit.isInstalled());
  }, []);

  return <>{children}</>;
};
