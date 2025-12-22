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
    username?: string;
    profile_picture_url?: string;
  };
  error?: string;
}

export interface WorldIdUserInfo {
  walletAddress: string;
  username?: string;
  profilePictureUrl?: string;
}

/**
 * Get user info by wallet address from World ID
 */
export async function getUserInfoByAddress(address: string): Promise<WorldIdUserInfo | null> {
  if (!MiniKit.isInstalled()) return null;
  
  try {
    const userInfo = await MiniKit.getUserByAddress(address);
    return {
      walletAddress: userInfo?.walletAddress || address,
      username: userInfo?.username,
      profilePictureUrl: userInfo?.profilePictureUrl,
    };
  } catch (error) {
    console.log('Could not get user info by address:', error);
    return null;
  }
}

/**
 * Get current user info from MiniKit
 */
export function getCurrentUserInfo(): WorldIdUserInfo | null {
  if (!MiniKit.isInstalled()) return null;
  
  try {
    const user = (MiniKit as any).user;
    if (user) {
      return {
        walletAddress: user.walletAddress || '',
        username: user.username,
        profilePictureUrl: user.profilePictureUrl,
      };
    }
    return null;
  } catch {
    return null;
  }
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

    // Try to get World ID username and profile picture before backend call
    let username: string | undefined;
    let profilePictureUrl: string | undefined;
    
    try {
      // First try to get current user info
      const currentUser = getCurrentUserInfo();
      if (currentUser) {
        username = currentUser.username;
        profilePictureUrl = currentUser.profilePictureUrl;
      }
      
      // If not available, try to fetch by address
      if (!username && !profilePictureUrl && (finalPayload as any).address) {
        const userInfo = await getUserInfoByAddress((finalPayload as any).address);
        if (userInfo) {
          username = userInfo.username;
          profilePictureUrl = userInfo.profilePictureUrl;
        }
      }
    } catch (e) {
      console.log('Could not fetch World ID user info before verification:', e);
    }

    // Verify with backend and pass World ID info
    const { data, error } = await supabase.functions.invoke('verify-wallet', {
      body: {
        payload: finalPayload,
        nonce,
        verification_level: verificationLevel,
        username,
        profile_picture_url: profilePictureUrl,
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
      user: {
        ...data.user,
        username: data.user.username || username,
        profile_picture_url: data.user.profile_picture_url || profilePictureUrl,
      },
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
