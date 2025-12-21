import { MiniKit } from '@worldcoin/minikit-js';

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
