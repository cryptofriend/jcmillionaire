import { supabase } from '@/integrations/supabase/client';

// Claim contract ABI (minimal for claiming)
export const CLAIM_CONTRACT_ABI = [
  {
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'expiry', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// Claim contract address on World Chain
export const CLAIM_CONTRACT_ADDRESS = '0x15E003d978400dA10Fc6B8B641E76533871aB49d';

export interface ClaimData {
  id: string;
  amount: number;
  nonce: string;
  expiry: number;
  signature: string;
  recipient: string;
}

export interface AuthorizeClaimResponse {
  success: boolean;
  claim?: ClaimData;
  domain?: {
    name: string;
    version: string;
    chainId: number;
  };
  error?: string;
}

/**
 * Request authorization for a claim from the backend
 */
export async function authorizeClaim(
  runId: string,
  userId: string,
  walletAddress: string
): Promise<AuthorizeClaimResponse> {
  const { data, error } = await supabase.functions.invoke('authorize-claim', {
    body: {
      run_id: runId,
      user_id: userId,
      wallet_address: walletAddress,
    },
  });

  if (error) {
    console.error('Error authorizing claim:', error);
    return { success: false, error: error.message };
  }

  return data as AuthorizeClaimResponse;
}

/**
 * Confirm a claim after transaction is submitted
 */
export async function confirmClaim(
  claimId: string,
  txHash: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('confirm-claim', {
    body: {
      claim_id: claimId,
      tx_hash: txHash,
    },
  });

  if (error) {
    console.error('Error confirming claim:', error);
    return { success: false, error: error.message };
  }

  return data;
}

/**
 * Encode the claim function call for the transaction
 */
export function encodeClaimCall(claim: ClaimData): string {
  // This would be used with MiniKit.commands.sendTransaction
  // The actual encoding depends on how MiniKit expects the data
  // For now, return the raw data that can be used to construct the tx
  return JSON.stringify({
    to: CLAIM_CONTRACT_ADDRESS,
    data: {
      functionName: 'claim',
      args: [claim.amount, claim.nonce, claim.expiry, claim.signature],
    },
  });
}

/**
 * Format amount for display (tokens have 18 decimals typically)
 */
export function formatTokenAmount(amount: number, decimals = 18): string {
  const value = amount / Math.pow(10, decimals);
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * World Chain explorer URL
 */
export const WORLD_CHAIN_EXPLORER = 'https://worldscan.org';

export function getExplorerTxUrl(txHash: string): string {
  return `${WORLD_CHAIN_EXPLORER}/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `${WORLD_CHAIN_EXPLORER}/address/${address}`;
}
