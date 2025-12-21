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

export interface SendTransactionParams {
  contractAddress: string;
  abi: readonly object[];
  functionName: string;
  args: readonly unknown[];
}

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

/**
 * Send a transaction via World App's MiniKit
 */
export async function sendTransaction(
  params: SendTransactionParams
): Promise<TransactionResult> {
  if (!MiniKit.isInstalled()) {
    return { success: false, error: 'World App not detected' };
  }

  try {
    console.log('Sending transaction via MiniKit:', params);

    const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
      transaction: [
        {
          address: params.contractAddress as `0x${string}`,
          abi: params.abi as any,
          functionName: params.functionName,
          args: params.args as any[],
        },
      ],
    });

    console.log('MiniKit transaction response:', finalPayload);

    if (finalPayload.status === 'error') {
      return {
        success: false,
        error: (finalPayload as any).error_code || 'Transaction failed',
      };
    }

    // Extract transaction hash from the response
    const txHash = (finalPayload as any).transaction_id || 
                   (finalPayload as any).transactionHash ||
                   (finalPayload as any).hash;

    return {
      success: true,
      transactionHash: txHash,
    };
  } catch (error) {
    console.error('MiniKit transaction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transaction failed',
    };
  }
}

export { MiniKit };
