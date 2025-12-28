import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const REFERRAL_STORAGE_KEY = 'jc_pending_referral';
const REFERRAL_SHOWN_KEY = 'jc_referral_popup_shown';

interface PendingReferral {
  code: string;
  referralId: string;
  inviterUserId: string;
  clickedAt: string;
}

export type ReferralStatus = 
  | 'new_referral'      // New user, referral tracked successfully
  | 'already_tracked'   // Referral already in localStorage
  | 'invalid_code'      // Code doesn't exist
  | 'already_played'    // User already has an account/played before
  | null;

/**
 * Hook to track referral link clicks and manage pending referrals
 */
export function useReferralTracking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingReferral, setPendingReferral] = useState<PendingReferral | null>(null);
  const [referralStatus, setReferralStatus] = useState<ReferralStatus>(null);

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

  // Show toast notification based on referral status
  useEffect(() => {
    if (!referralStatus) return;

    // Check if we've already shown a popup for this session
    const shownKey = sessionStorage.getItem(REFERRAL_SHOWN_KEY);
    if (shownKey) return;

    // Mark as shown for this session
    sessionStorage.setItem(REFERRAL_SHOWN_KEY, 'true');

    switch (referralStatus) {
      case 'new_referral':
        toast.success('🎁 Referral Bonus Ready! Login to claim +1 extra play', {
          duration: 5000,
        });
        break;
      case 'already_tracked':
        // Don't show anything if already tracked
        break;
      case 'invalid_code':
        toast.error('Invalid referral code - this code doesn\'t exist', {
          duration: 4000,
        });
        break;
      case 'already_played':
        toast.error('Referral can\'t be used - you already have an account', {
          duration: 4000,
        });
        break;
    }
  }, [referralStatus]);

  // Track referral click when ?ref= parameter is present
  useEffect(() => {
    const refCode = searchParams.get('ref');
    
    if (!refCode || isProcessing) return;

    const trackReferralClick = async () => {
      setIsProcessing(true);
      const normalizedCode = refCode.trim().toLowerCase();
      
      try {
        // Check if user already has a stored user (already played)
        const storedUser = localStorage.getItem('jc_user');
        if (storedUser) {
          console.log('User already has an account, referral cannot be applied');
          setReferralStatus('already_played');
          searchParams.delete('ref');
          setSearchParams(searchParams, { replace: true });
          setIsProcessing(false);
          return;
        }

        // Check if we already have this referral tracked
        const existingReferral = localStorage.getItem(REFERRAL_STORAGE_KEY);
        if (existingReferral) {
          const parsed = JSON.parse(existingReferral) as PendingReferral;
          if (parsed.code === normalizedCode) {
            console.log('Referral already tracked:', normalizedCode);
            setReferralStatus('already_tracked');
            searchParams.delete('ref');
            setSearchParams(searchParams, { replace: true });
            setIsProcessing(false);
            return;
          }
        }

        // Find the inviter by their referral code
        const { data: inviter, error: inviterError } = await supabase
          .from('users')
          .select('id, referral_code, username')
          .ilike('referral_code', normalizedCode)
          .maybeSingle();

        if (inviterError) {
          console.error('Error finding inviter:', inviterError);
          setIsProcessing(false);
          return;
        }

        if (!inviter) {
          console.log('Invalid referral code:', normalizedCode);
          setReferralStatus('invalid_code');
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
            invited_user_id: null,
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
        setReferralStatus('new_referral');
        
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
      return true;
      
    } catch (error) {
      console.error('Error in linkReferralToUser:', error);
      return false;
    }
  };

  /**
   * Clear the pending referral
   */
  const clearPendingReferral = () => {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
    setPendingReferral(null);
  };

  /**
   * Get the pending referral info
   */
  const getPendingReferral = (): PendingReferral | null => {
    return pendingReferral;
  };

  return {
    pendingReferral,
    referralStatus,
    linkReferralToUser,
    clearPendingReferral,
    getPendingReferral,
    isProcessing,
  };
}

/**
 * Standalone function to link referral on verification
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
