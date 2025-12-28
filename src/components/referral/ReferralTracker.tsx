import React from 'react';
import { useReferralTracking } from '@/hooks/useReferralTracking';

/**
 * Component that handles referral tracking on app load
 * Place this inside the Router to have access to useSearchParams
 */
export const ReferralTracker: React.FC = () => {
  // This hook automatically tracks referral clicks from ?ref= param
  useReferralTracking();
  
  // This component doesn't render anything
  return null;
};
