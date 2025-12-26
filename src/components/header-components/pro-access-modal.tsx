"use client";
import React, { useState, useEffect } from "react";
import DevButton from "../dev-components/dev-button";
import DevInput from "../dev-components/dev-input";
import insightZustand from "@/utils/insight-zustand";
import Confetti from 'react-confetti';
import { Calendar, Clock, ArrowRight, Info } from "lucide-react";

interface ProAccessModalProps {
  onClose: () => void;
  onSuccess?: (data: { end_date: string }) => void;
}

interface ProStatus {
  hasAccess: boolean;
  daysLeft?: number;
  endDate?: string;
}

const ProAccessModal = ({ onClose, onSuccess }: ProAccessModalProps) => {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiSize, setConfettiSize] = useState({ width: 0, height: 0 });
  const [proStatus, setProStatus] = useState<ProStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [renewalDetails, setRenewalDetails] = useState<{
    isRenewal?: boolean;
    oldExpiryDate?: string;
    newExpiryDate?: string;
    daysAdded?: number;
    wasCapped?: boolean;
  } | null>(null);
  const { setToast } = insightZustand();

  // Update confetti size on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setConfettiSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }
  }, []);

  // =====================================================
  // STEP 4: Check if user has active subscription
  // =====================================================
  // This determines if this is a renewal or new activation
  useEffect(() => {
    const checkProStatus = async () => {
      try {
        const response = await fetch('/api/pro/status', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-cache'
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.success) {
            setProStatus({
              hasAccess: data.hasAccess || false,
              daysLeft: data.daysLeft,
              endDate: data.end_date
            });
          }
        }
      } catch (error) {
        console.warn('Failed to check pro status:', error);
        // Continue with modal - assume no active subscription
      } finally {
        setCheckingStatus(false);
      }
    };

    checkProStatus();
  }, []);

  const handleVerifyKey = async () => {
    if (!key.trim()) return;

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    setRenewalDetails(null);

    try {
      const response = await fetch("/api/pro/verify-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ key })
      });

      // Handle 503 Service Unavailable (transient Clerk API errors)
      if (response.status === 503) {
        const data = await response.json();
        // For transient errors, show a message that suggests retrying
        const message = data?.retry
          ? "Temporary authentication issue. Please try again in a moment."
          : data.message || "Service temporarily unavailable. Please try again.";
        setErrorMessage(message);
        setToast(message);
        return;
      }

      const data = await response.json();

      if (data.success) {
        // =====================================================
        // STEP 6: Handle renewal vs new activation success messages
        // =====================================================
        let message: string;
        let detailedMessage: string | null = null;
        
        if (data.isRenewal) {
          // This was a renewal - show detailed renewal information
          const oldDate = data.oldExpiryDate 
            ? new Date(data.oldExpiryDate).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })
            : 'current date';
          const newDate = data.expiryDate || data.newExpiryDate
            ? new Date(data.expiryDate || data.newExpiryDate).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })
            : 'extended date';
          const daysAdded = data.durationAddedDays || 0;
          
          // Main success message
          message = `🎉 Subscription extended successfully!`;
          
          // Detailed message with expiry information
          detailedMessage = `Your subscription has been extended from ${oldDate} to ${newDate}.`;
          if (daysAdded > 0) {
            detailedMessage += ` ${daysAdded} day${daysAdded !== 1 ? 's' : ''} added to your subscription.`;
          }
          
          // Add cap warning if applicable
          if (data.wasCapped) {
            detailedMessage += ` Note: Your subscription has been capped at ${data.maxExpiryMonths || 12} months maximum.`;
          }
          
          // Store renewal details for display in success message
          setRenewalDetails({
            isRenewal: true,
            oldExpiryDate: data.oldExpiryDate,
            newExpiryDate: data.expiryDate || data.newExpiryDate,
            daysAdded: data.durationAddedDays,
            wasCapped: data.wasCapped
          });
          setSuccessMessage(message);
          
          // Show detailed renewal info in toast
          if (detailedMessage) {
            setToast(detailedMessage);
          }
          
          // Also show cap warning if provided
          if (data.expiryCapWarning) {
            // Show cap warning after a short delay so both messages are visible
            setTimeout(() => {
              setToast(data.expiryCapWarning);
            }, 2000);
          }
        } else {
          // This was a new activation
          const expiryDate = data.expiryDate 
            ? new Date(data.expiryDate).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })
            : null;
          const durationDays = data.durationDays || 0;
          
          message = "🎉 Pro access activated successfully!";
          
          // Detailed message for new activation
          if (expiryDate) {
            detailedMessage = `Your Pro subscription is active until ${expiryDate}.`;
            if (durationDays > 0) {
              detailedMessage += ` (${durationDays} day${durationDays !== 1 ? 's' : ''})`;
            }
          }
          
          // Store activation details
          setRenewalDetails({
            isRenewal: false,
            newExpiryDate: data.expiryDate
          });
          setSuccessMessage(message);
          
          // Show detailed activation info
          if (detailedMessage) {
            setToast(detailedMessage);
          }
        }
        
        setShowConfetti(true);
        // Show main message in toast as well (after detailed message if present)
        if (detailedMessage) {
          setTimeout(() => {
            setToast(message);
          }, 2000);
        } else {
          setToast(message);
        }

        // Wait for confetti animation before closing
        setTimeout(() => {
          setShowConfetti(false);
          onClose();
          // Notify parent component of successful activation/renewal
          if (onSuccess) {
            onSuccess({ end_date: data.expiryDate || data.newExpiryDate });
          }
          // Trigger pro status refresh
          window.dispatchEvent(new CustomEvent('refreshProStatus'));
          if (typeof window !== 'undefined') {
            localStorage.setItem('proStatusRefresh', Date.now().toString());
          }
        }, 3500);
      } else {
        const message = data.message || "Invalid key";
        setErrorMessage(message);
        setToast(message);
      }
    } catch (error) {
      // Network errors are also transient - show appropriate message
      console.warn('Failed to verify key (will retry):', error);
      const message = "Network error. Please check your connection and try again.";
      setErrorMessage(message);
      setToast(message);
    } finally {
      setLoading(false);
    }
  };

  // Determine if this is a renewal or new activation
  const isRenewal = proStatus?.hasAccess && proStatus.endDate && new Date(proStatus.endDate) > new Date();
  const currentExpiryDate = proStatus?.endDate ? new Date(proStatus.endDate) : null;
  const daysRemaining = proStatus?.daysLeft ?? 0;

  if (checkingStatus) {
    return (
      <div className="w-full max-w-md p-6 bg-background border rounded-lg shadow-lg space-y-4 relative">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-6 bg-background border rounded-lg shadow-lg space-y-4 relative">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Close modal"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <h3 className="text-xl font-semibold mb-4">
        {isRenewal ? "Renew Subscription" : "Get Pro Access"}
      </h3>

      {/* ===================================================== */}
      {/* RENEWAL CONFIRMATION UI */}
      {/* ===================================================== */}
      {isRenewal && currentExpiryDate && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3 mb-4">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Renewing Your Active Subscription
              </p>
              <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    <span className="font-medium">Current Expiry:</span>{" "}
                    {currentExpiryDate.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    <span className="font-medium">Days Remaining:</span> {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                  </span>
                </div>
                {key.trim() && (
                  <div className="flex items-center gap-2 pt-1 border-t border-blue-200 dark:border-blue-700">
                    <ArrowRight className="w-4 h-4" />
                    <span className="text-xs">
                      Enter your renewal key to see the new expiry date. Your subscription will be extended from the current expiry date.
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300 pt-2 border-t border-blue-200 dark:border-blue-700">
                Renewing will extend your subscription. Your current usage will be preserved.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Payment Instructions:</p>

        <div className="bg-muted/30 p-4 rounded-lg space-y-2">
          <p>Please send payment to:</p>
          <div className="space-y-1">
            <p><span className="font-medium">Bank:</span> Alfalah Bank</p>
            <p><span className="font-medium">Account:</span> 83581009212063</p>
            <p><span className="font-medium">IBAN:</span> PK83ALFH8358001009812063</p>
            <p><span className="font-medium">Title:</span> Hamza Tahir Ghaury</p>
          </div>
        </div>

        <div className="space-y-1">
          <p>After payment:</p>
          <p>1. Share your transaction screenshot on WhatsApp</p>
          <p className="font-medium">+92 3332296022</p>
          <p>2. Enter the provided access key below</p>
        </div>
      </div>

      <div className="pt-4 border-t">
        <p className="text-sm mb-3">Have a key? Enter it below:</p>
        <div className="flex gap-2">
          <DevInput
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter your Pro key"
            onKeyDown={(e) => e.key === "Enter" && handleVerifyKey()}
            disabled={loading || !!successMessage}
          />
          <DevButton
            onClick={handleVerifyKey}
            disabled={!key.trim() || loading || !!successMessage}
            aria-busy={loading}
          >
            {loading 
              ? (isRenewal ? 'Renewing...' : 'Activating...') 
              : (isRenewal ? 'Renew Subscription' : 'Activate')
            }
          </DevButton>
        </div>

        {/* ===================================================== */}
        {/* STEP 6: Enhanced Success Message Display */}
        {/* ===================================================== */}
        {successMessage && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
            <p className="text-green-800 dark:text-green-200 font-medium text-center">
              {successMessage}
            </p>
            
            {/* Show detailed renewal information */}
            {renewalDetails?.isRenewal && renewalDetails.oldExpiryDate && renewalDetails.newExpiryDate && (
              <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3 space-y-2 border border-green-300 dark:border-green-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-700 dark:text-green-300 font-medium">Previous Expiry:</span>
                  <span className="text-green-800 dark:text-green-200">
                    {new Date(renewalDetails.oldExpiryDate).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-700 dark:text-green-300 font-medium">New Expiry:</span>
                  <span className="text-green-800 dark:text-green-200 font-semibold">
                    {new Date(renewalDetails.newExpiryDate).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
                {renewalDetails.daysAdded && renewalDetails.daysAdded > 0 && (
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-green-300 dark:border-green-700">
                    <span className="text-green-700 dark:text-green-300 font-medium">Days Added:</span>
                    <span className="text-green-800 dark:text-green-200 font-semibold">
                      +{renewalDetails.daysAdded} day{renewalDetails.daysAdded !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {renewalDetails.wasCapped && (
                  <div className="mt-2 pt-2 border-t border-green-300 dark:border-green-700">
                    <p className="text-xs text-green-600 dark:text-green-400 text-center">
                      ⚠️ Subscription capped at 12 months maximum
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Show new activation information */}
            {renewalDetails && !renewalDetails.isRenewal && renewalDetails.newExpiryDate && (
              <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3 border border-green-300 dark:border-green-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-700 dark:text-green-300 font-medium">Expires:</span>
                  <span className="text-green-800 dark:text-green-200 font-semibold">
                    {new Date(renewalDetails.newExpiryDate).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
            )}
            
            <p className="text-green-600 dark:text-green-300 text-sm text-center mt-2">
              Updating your subscription...
            </p>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 font-medium text-center">
              ❌ {errorMessage}
            </p>
          </div>
        )}
      </div>

      {/* Celebration confetti */}
      {showConfetti && (
        <Confetti
          width={confettiSize.width}
          height={confettiSize.height}
          recycle={false}
          numberOfPieces={600}
          gravity={0.25}
          initialVelocityY={25}
          initialVelocityX={15}
          wind={0.08}
          friction={0.99}
          colors={['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#FFD93D', '#6BCF7F']}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 9999,
            pointerEvents: 'none',
            willChange: 'transform'
          }}
        />
      )}
    </div>
  );
};

export default ProAccessModal;