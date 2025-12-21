import { MiniKit } from '@worldcoin/minikit-js';
import { supabase } from '@/integrations/supabase/client';

// Initialize MiniKit (call this once at app start)
export function initMiniKit() {
  try {
    MiniKit.install();
    console.log('MiniKit initialized, isInstalled:', MiniKit.isInstalled());
  } catch (error) {
    console.log('MiniKit not available (not in World App):', error);
  }
}

// Check if running inside World App
export function isInWorldApp(): boolean {
  try {
    return MiniKit.isInstalled();
  } catch {
    return false;
  }
}

// Get the user's wallet address from World App
export function getWalletAddress(): string | null {
  try {
    if (!MiniKit.isInstalled()) return null;
    // MiniKit provides the wallet address after wallet auth
    return (MiniKit as any).walletAddress || null;
  } catch {
    return null;
  }
}

// Generate a random nonce for SIWE
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export interface WalletAuthResult {
  success: boolean;
  user?: {
    id: string;
    verification_level: string;
    wallet_address: string;
    created_at: string;
  };
  error?: string;
}

/**
 * Authenticate user with World App wallet
 */
export async function authenticateWithWallet(
  verificationLevel: 'device' | 'orb' = 'device'
): Promise<WalletAuthResult> {
  if (!MiniKit.isInstalled()) {
    return { success: false, error: 'World App not detected' };
  }

  try {
    const nonce = generateNonce();
    console.log('Starting wallet auth with nonce:', nonce);

    // Request wallet authentication
    const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
      nonce,
      expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      notBefore: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      statement: 'Sign in to Jackie Chain: Millionaire to verify your identity and claim tokens.',
    });

    console.log('Wallet auth response:', finalPayload);

    if (finalPayload.status === 'error') {
      return {
        success: false,
        error: (finalPayload as any).error_code || 'Wallet authentication failed',
      };
    }

    // Verify with backend
    const { data, error } = await supabase.functions.invoke('verify-wallet', {
      body: {
        payload: finalPayload,
        nonce,
        verification_level: verificationLevel,
      },
    });

    if (error) {
      console.error('Backend verification failed:', error);
      return { success: false, error: error.message };
    }

    if (!data.success) {
      return { success: false, error: data.error || 'Verification failed' };
    }

    console.log('Wallet auth successful:', data.user);
    return {
      success: true,
      user: data.user,
    };

  } catch (error) {
    console.error('Wallet auth error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Wallet authentication failed',
    };
  }
}

export { MiniKit };
