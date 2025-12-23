import { supabase } from '@/integrations/supabase/client';

/**
 * Generate a unique referral code for a user
 * Uses the user's ID as the base to ensure uniqueness
 */
export function generateReferralCode(userId: string): string {
  // Use first 8 characters of user ID as referral code
  return userId.slice(0, 8);
}

/**
 * Create a referral record when a user clicks a referral link
 * This is called when the invited user first visits with a ref param
 */
export async function createReferralFromCode(
  inviteCode: string
): Promise<{ success: boolean; inviterUserId: string | null; error: string | null }> {
  try {
    // Find the inviter by their referral code (first 8 chars of their user ID)
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .ilike('id', `${inviteCode}%`)
      .limit(1);

    if (fetchError) {
      console.error('Error finding inviter:', fetchError);
      return { success: false, inviterUserId: null, error: fetchError.message };
    }

    if (!users || users.length === 0) {
      console.log('No inviter found for code:', inviteCode);
      return { success: false, inviterUserId: null, error: 'Invalid referral code' };
    }

    const inviterUserId = users[0].id;
    console.log('Found inviter:', inviterUserId);

    return { success: true, inviterUserId, error: null };
  } catch (err) {
    console.error('Error in createReferralFromCode:', err);
    return { success: false, inviterUserId: null, error: 'Failed to process referral' };
  }
}

/**
 * Link an invited user to a referral when they complete verification
 */
export async function linkInvitedUserToReferral(
  inviteCode: string,
  invitedUserId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Find the inviter by their referral code
    const { inviterUserId, error: findError } = await createReferralFromCode(inviteCode);

    if (findError || !inviterUserId) {
      return { success: false, error: findError || 'Inviter not found' };
    }

    // Don't allow self-referral
    if (inviterUserId === invitedUserId) {
      console.log('Self-referral attempted, ignoring');
      return { success: false, error: 'Cannot refer yourself' };
    }

    // Check if this invited user already has a referral record
    const { data: existingReferral, error: checkError } = await supabase
      .from('referrals')
      .select('id')
      .eq('invited_user_id', invitedUserId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing referral:', checkError);
      return { success: false, error: checkError.message };
    }

    if (existingReferral) {
      console.log('User already has a referral record');
      return { success: true, error: null }; // Already linked, not an error
    }

    // Create the referral record with status 'verified'
    const { error: insertError } = await supabase
      .from('referrals')
      .insert({
        invite_code: inviteCode,
        inviter_user_id: inviterUserId,
        invited_user_id: invitedUserId,
        status: 'verified',
      });

    if (insertError) {
      console.error('Error creating referral:', insertError);
      return { success: false, error: insertError.message };
    }

    console.log('Referral created:', { inviterUserId, invitedUserId });
    return { success: true, error: null };
  } catch (err) {
    console.error('Error in linkInvitedUserToReferral:', err);
    return { success: false, error: 'Failed to link referral' };
  }
}

/**
 * Get referral stats for a user
 */
export async function getReferralStats(userId: string): Promise<{
  totalInvited: number;
  completedRuns: number;
  pendingReferrals: number;
  error: string | null;
}> {
  try {
    const { data: referrals, error } = await supabase
      .from('referrals')
      .select('status')
      .eq('inviter_user_id', userId);

    if (error) {
      return { totalInvited: 0, completedRuns: 0, pendingReferrals: 0, error: error.message };
    }

    const totalInvited = referrals?.length || 0;
    const completedRuns = referrals?.filter(r => r.status === 'first_run_completed').length || 0;
    const pendingReferrals = referrals?.filter(r => r.status === 'verified').length || 0;

    return { totalInvited, completedRuns, pendingReferrals, error: null };
  } catch (err) {
    console.error('Error getting referral stats:', err);
    return { totalInvited: 0, completedRuns: 0, pendingReferrals: 0, error: 'Failed to get stats' };
  }
}
