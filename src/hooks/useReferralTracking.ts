import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const REFERRAL_STORAGE_KEY = 'jc_pending_referral';

interface PendingReferral {
  code: string;
  referralId: string;
  inviterUserId: string;
  clickedAt: string;
}

/**
 * Hook to track referral link clicks and manage pending referrals
 * 
 * Flow:
 * 1. User clicks referral link with ?ref=CODE
 * 2. We record the click in the referrals table with status='clicked'
 * 3. Store referral ID in localStorage for later attribution
 * 4. When user verifies, we upgrade status to 'verified' and set invited_user_id
 * 5. When user completes first run, status becomes 'first_run_completed'
 */
export function useReferralTracking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingReferral, setPendingReferral] = useState<PendingReferral | null>(null);

  // Load pending referral from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (stored) {
      try {
        setPendingReferral(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse pending referral:', e);
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
      }
    }
  }, []);

  // Track referral click when ?ref= parameter is present
  useEffect(() => {
    const refCode = searchParams.get('ref');
    
    if (!refCode || isProcessing) return;

    const trackReferralClick = async () => {
      setIsProcessing(true);
      const normalizedCode = refCode.trim().toLowerCase();
      
      try {
        // Check if we already have this referral tracked
        const existingReferral = localStorage.getItem(REFERRAL_STORAGE_KEY);
        if (existingReferral) {
          const parsed = JSON.parse(existingReferral) as PendingReferral;
          if (parsed.code === normalizedCode) {
            console.log('Referral already tracked:', normalizedCode);
            // Clear the URL param
            searchParams.delete('ref');
            setSearchParams(searchParams, { replace: true });
            setIsProcessing(false);
            return;
          }
        }

        // Find the inviter by their referral code
        const { data: inviter, error: inviterError } = await supabase
          .from('users')
          .select('id, referral_code')
          .ilike('referral_code', normalizedCode)
          .maybeSingle();

        if (inviterError) {
          console.error('Error finding inviter:', inviterError);
          setIsProcessing(false);
          return;
        }

        if (!inviter) {
          console.log('Invalid referral code:', normalizedCode);
          // Clear the URL param even if invalid
          searchParams.delete('ref');
          setSearchParams(searchParams, { replace: true });
          setIsProcessing(false);
          return;
        }

        // Create a referral record with status='clicked'
        const { data: referral, error: insertError } = await supabase
          .from('referrals')
          .insert({
            invite_code: normalizedCode,
            inviter_user_id: inviter.id,
            invited_user_id: null, // Will be set when user verifies
            status: 'clicked',
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error creating referral:', insertError);
          setIsProcessing(false);
          return;
        }

        // Store the pending referral for later attribution
        const pending: PendingReferral = {
          code: normalizedCode,
          referralId: referral.id,
          inviterUserId: inviter.id,
          clickedAt: new Date().toISOString(),
        };
        
        localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(pending));
        setPendingReferral(pending);
        
        console.log('Referral click tracked:', { code: normalizedCode, referralId: referral.id });

        // Clear the URL param
        searchParams.delete('ref');
        setSearchParams(searchParams, { replace: true });
        
      } catch (error) {
        console.error('Error tracking referral:', error);
      } finally {
        setIsProcessing(false);
      }
    };

    trackReferralClick();
  }, [searchParams, setSearchParams, isProcessing]);

  /**
   * Upgrade referral status when user verifies
   * Should be called after successful verification with the new user's ID
   */
  const linkReferralToUser = async (userId: string): Promise<boolean> => {
    const stored = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!stored) return false;

    try {
      const pending = JSON.parse(stored) as PendingReferral;
      
      // Don't allow self-referral
      if (pending.inviterUserId === userId) {
        console.log('Self-referral prevented');
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
        setPendingReferral(null);
        return false;
      }

      // Check if user already has a referral
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('id')
        .eq('invited_user_id', userId)
        .maybeSingle();

      if (existingReferral) {
        console.log('User already has a referral');
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
        setPendingReferral(null);
        return false;
      }

      // Update the referral with the user ID and status
      const { error } = await supabase
        .from('referrals')
        .update({
          invited_user_id: userId,
          status: 'verified',
        })
        .eq('id', pending.referralId);

      if (error) {
        console.error('Error linking referral to user:', error);
        return false;
      }

      console.log('Referral linked to user:', { referralId: pending.referralId, userId });
      
      // Keep the referral in storage until first run is completed
      // The trigger will handle upgrading to 'first_run_completed'
      return true;
      
    } catch (error) {
      console.error('Error in linkReferralToUser:', error);
      return false;
    }
  };

  /**
   * Clear the pending referral (called after first run completes)
   */
  const clearPendingReferral = () => {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
    setPendingReferral(null);
  };

  /**
   * Get the pending referral info (for display purposes)
   */
  const getPendingReferral = (): PendingReferral | null => {
    return pendingReferral;
  };

  return {
    pendingReferral,
    linkReferralToUser,
    clearPendingReferral,
    getPendingReferral,
    isProcessing,
  };
}

/**
 * Standalone function to link referral on verification
 * Can be called from Verify page
 */
export async function linkPendingReferralToUser(userId: string): Promise<boolean> {
  const stored = localStorage.getItem(REFERRAL_STORAGE_KEY);
  if (!stored) return false;

  try {
    const pending = JSON.parse(stored) as PendingReferral;
    
    // Don't allow self-referral
    if (pending.inviterUserId === userId) {
      console.log('Self-referral prevented');
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
      return false;
    }

    // Check if user already has a referral
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('invited_user_id', userId)
      .maybeSingle();

    if (existingReferral) {
      console.log('User already has a referral');
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
      return false;
    }

    // Update the referral with the user ID and status
    const { error } = await supabase
      .from('referrals')
      .update({
        invited_user_id: userId,
        status: 'verified',
      })
      .eq('id', pending.referralId);

    if (error) {
      console.error('Error linking referral to user:', error);
      return false;
    }

    console.log('Referral linked to user:', { referralId: pending.referralId, userId });
    return true;
    
  } catch (error) {
    console.error('Error in linkPendingReferralToUser:', error);
    return false;
  }
}

/**
 * Clear pending referral from storage
 */
export function clearPendingReferral(): void {
  localStorage.removeItem(REFERRAL_STORAGE_KEY);
}
