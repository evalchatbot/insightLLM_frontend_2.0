"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { X, AlertCircle, Clock } from "lucide-react";
import ProAccessModal from "./pro-access-modal";

interface ProStatus {
  hasAccess: boolean;
  daysLeft?: number;
  endDate?: string;
}

const RenewalNotificationBanner = () => {
  const { user, isLoaded } = useUser();
  const [proStatus, setProStatus] = useState<ProStatus>({ hasAccess: false });
  const [isDismissed, setIsDismissed] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if notification should be shown
  const shouldShowNotification = () => {
    if (!proStatus.hasAccess || !proStatus.daysLeft) return false;
    if (isDismissed) return false;

    // Show notification at 7, 3, and 1 days before expiration
    const daysLeft = proStatus.daysLeft;
    return daysLeft === 7 || daysLeft === 3 || daysLeft === 1;
  };

  // Check dismissal status from localStorage
  useEffect(() => {
    if (!proStatus.hasAccess || !proStatus.daysLeft) return;

    const daysLeft = proStatus.daysLeft;
    const dismissalKey = `renewal_notification_dismissed_${daysLeft}`;
    const dismissedDate = localStorage.getItem(dismissalKey);

    if (dismissedDate) {
      const today = new Date().toDateString();
      const dismissedDay = new Date(dismissedDate).toDateString();
      
      // If dismissed today, don't show. Otherwise, show again
      if (dismissedDay === today) {
        setIsDismissed(true);
      } else {
        // Clear old dismissal to show again
        localStorage.removeItem(dismissalKey);
        setIsDismissed(false);
      }
    } else {
      setIsDismissed(false);
    }
  }, [proStatus.hasAccess, proStatus.daysLeft]);

  // Fetch pro status
  useEffect(() => {
    if (!isLoaded || !user) {
      setIsLoading(false);
      return;
    }

    const checkProStatus = async () => {
      try {
        const res = await fetch('/api/pro/status', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-cache'
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.success) {
            setProStatus({
              hasAccess: data.hasAccess || false,
              daysLeft: data.daysLeft,
              endDate: data.end_date
            });
          }
        }
      } catch (error) {
        console.error("Failed to check pro status for renewal notification:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkProStatus();

    // Listen for pro status updates (e.g., after renewal)
    const handleRefresh = () => checkProStatus();
    window.addEventListener('refreshProStatus', handleRefresh);
    
    // Also listen for custom event when subscription is renewed
    window.addEventListener('subscriptionRenewed', handleRefresh);

    return () => {
      window.removeEventListener('refreshProStatus', handleRefresh);
      window.removeEventListener('subscriptionRenewed', handleRefresh);
    };
  }, [isLoaded, user]);

  // Handle dismissal
  const handleDismiss = () => {
    if (!proStatus.daysLeft) return;

    const daysLeft = proStatus.daysLeft;
    const dismissalKey = `renewal_notification_dismissed_${daysLeft}`;
    
    // Store dismissal with current date
    localStorage.setItem(dismissalKey, new Date().toISOString());
    setIsDismissed(true);
  };

  // Handle renew button click
  const handleRenewClick = () => {
    setShowProModal(true);
  };

  // Handle modal success (subscription renewed)
  const handleModalSuccess = (data: { end_date: string }) => {
    // Close modal
    setShowProModal(false);
    
    // Refresh pro status
    const checkProStatus = async () => {
      try {
        const res = await fetch('/api/pro/status', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-cache'
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.success) {
            setProStatus({
              hasAccess: data.hasAccess || false,
              daysLeft: data.daysLeft,
              endDate: data.end_date
            });
            
            // Clear any dismissals since subscription was renewed
            if (data.hasAccess && data.daysLeft) {
              // Clear dismissals for all notification thresholds
              localStorage.removeItem('renewal_notification_dismissed_7');
              localStorage.removeItem('renewal_notification_dismissed_3');
              localStorage.removeItem('renewal_notification_dismissed_1');
            }
          }
        }
      } catch (error) {
        console.error("Failed to refresh pro status:", error);
      }
    };

    checkProStatus();
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('subscriptionRenewed'));
  };

  // Don't show if loading, not loaded, no user, or shouldn't show
  if (isLoading || !isLoaded || !user || !shouldShowNotification()) {
    return null;
  }

  const daysLeft = proStatus.daysLeft || 0;
  const isUrgent = daysLeft === 1;

  return (
    <>
      <div className={`fixed top-0 left-0 right-0 z-50 ${
        isUrgent 
          ? 'bg-gradient-to-r from-orange-500 to-red-500' 
          : 'bg-gradient-to-r from-blue-600 to-indigo-600'
      } text-white shadow-lg`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {isUrgent ? (
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-white" />
              ) : (
                <Clock className="w-5 h-5 flex-shrink-0 text-white" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {isUrgent 
                    ? "⚠️ Your Pro subscription expires tomorrow!"
                    : `Your Pro subscription expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`
                  }
                </p>
                <p className="text-xs opacity-90 mt-0.5">
                  Renew now to continue enjoying Pro features without interruption.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-4 flex-shrink-0">
              <button
                onClick={handleRenewClick}
                className="px-4 py-1.5 bg-white text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-50 rounded-lg font-semibold text-sm transition-colors shadow-sm hover:shadow-md"
              >
                Renew Now
              </button>
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showProModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <ProAccessModal
            onClose={() => setShowProModal(false)}
            onSuccess={handleModalSuccess}
          />
        </div>
      )}
    </>
  );
};

export default RenewalNotificationBanner;

