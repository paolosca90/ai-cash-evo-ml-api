import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import TrialExpiryPopup from '@/components/TrialExpiryPopup';

interface UseTrialExpiryProps {
  user: any;
}

export const useTrialExpiry = ({ user }: UseTrialExpiryProps) => {
  const [showPopup, setShowPopup] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    if (!user) return;

    // Check immediately on mount
    checkTrialStatus();

    // Then check every hour
    const interval = setInterval(checkTrialStatus, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const checkTrialStatus = async () => {
    if (!user) return;

    try {
      // Avoid spamming checks
      const now = new Date();
      if (lastChecked && now.getTime() - lastChecked.getTime() < 5 * 60 * 1000) {
        return; // Don't check more than once every 5 minutes
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) return;

      setUserProfile(profile);
      setLastChecked(now);

      // Check if we should show popup
      const shouldShow = shouldShowPopup(profile);

      if (shouldShow) {
        setShowPopup(true);
      }
    } catch (error) {
      console.error('Error checking trial status:', error);
    }
  };

  const shouldShowPopup = (profile: any): boolean => {
    if (!profile) return false;

    const { subscription_status, subscription_expires_at, subscription_plan } = profile;

    // NEVER show if user has Professional or Enterprise plan (regardless of status)
    if (subscription_plan === 'professional' || subscription_plan === 'enterprise') {
      return false;
    }

    // Don't show if user has active paid subscription
    if (subscription_status === 'active') {
      return false;
    }

    // Don't show if no expiry date
    if (!subscription_expires_at) return false;

    const expiryDate = new Date(subscription_expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Show popup ONLY if:
    // 1. subscription_status === 'trial' AND expires in 3 days or less
    // 2. subscription_status === 'expired'
    if (subscription_status === 'trial') {
      return daysUntilExpiry <= 3 || daysUntilExpiry < 0;
    }

    if (subscription_status === 'expired' || daysUntilExpiry < 0) {
      return true;
    }

    return false;
  };

  const handleClosePopup = () => {
    setShowPopup(false);

    // Store that user closed popup, don't show again for 24 hours
    localStorage.setItem('trial-popup-dismissed', new Date().toISOString());
  };

  const shouldSuppressPopup = (): boolean => {
    const dismissed = localStorage.getItem('trial-popup-dismissed');
    if (!dismissed) return false;

    const dismissedTime = new Date(dismissed);
    const now = new Date();
    const hoursSinceDismissed = (now.getTime() - dismissedTime.getTime()) / (1000 * 60 * 60);

    return hoursSinceDismissed < 24; // Suppress for 24 hours
  };

  // Override shouldShowPopup to check suppression
  const enhancedShouldShowPopup = (profile: any): boolean => {
    if (!profile) return false;

    // Don't show if recently dismissed
    if (shouldSuppressPopup()) return false;

    return shouldShowPopup(profile);
  };

  const shouldShow = showPopup && !shouldSuppressPopup();

  return {
    showPopup: shouldShow,
    userProfile,
    checkTrialStatus,
    handleClosePopup,
    forceShowPopup: () => setShowPopup(true)
  };
};