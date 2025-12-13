"use client";
import React, { useState, useEffect } from "react";
import DevButton from "../dev-components/dev-button";
import DevInput from "../dev-components/dev-input";
import insightZustand from "@/utils/insight-zustand";
import Confetti from 'react-confetti';

interface ProAccessModalProps {
  onClose: () => void;
  onSuccess?: (data: { end_date: string }) => void;
}

const ProAccessModal = ({ onClose, onSuccess }: ProAccessModalProps) => {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiSize, setConfettiSize] = useState({ width: 0, height: 0 });
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

  const handleVerifyKey = async () => {
    if (!key.trim()) return;

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

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
        const message = "🎉 Pro access activated successfully!";
        setSuccessMessage(message);
        setShowConfetti(true);
        setToast(message);

        // Wait for confetti animation before closing
        setTimeout(() => {
          setShowConfetti(false);
          onClose();
          // Notify parent component of successful activation
          if (onSuccess) {
            onSuccess({ end_date: data.expiryDate });
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

      <h3 className="text-xl font-semibold mb-4">Get Pro Access</h3>

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
            {loading ? 'Activating...' : 'Activate'}
          </DevButton>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-800 dark:text-green-200 font-medium text-center">
              {successMessage}
            </p>
            <p className="text-green-600 dark:text-green-300 text-sm text-center mt-2">
              Redirecting...
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