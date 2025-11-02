"use client";
import React, { useState } from "react";
import DevButton from "../dev-components/dev-button";
import DevInput from "../dev-components/dev-input";
import insightZustand from "@/utils/insight-zustand";

interface ProAccessModalProps {
  onClose: () => void;
  onSubscriptionChange?: (subscription: { end_date: string }) => void;
}

const ProAccessModal = ({ onClose, onSubscriptionChange }: ProAccessModalProps) => {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const { setToast } = insightZustand();

  const handleVerifyKey = async () => {
    if (!key.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch("/api/pro/verify-key", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ key })
      });

      const data = await response.json();
      
      if (data.success) {
        // We don't need localStorage anymore as we're using the database
        setToast("Pro access activated successfully!");
        onClose();
        // Trigger parent component to refresh subscription status
        if (onSubscriptionChange) {
          onSubscriptionChange({ end_date: data.expiryDate });
        }
      } else {
        setToast(data.message || "Invalid key");
      }
    } catch (error) {
      setToast("Failed to verify key");
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
            <p><span className="font-medium">Bank:</span> [Bank Name]</p>
            <p><span className="font-medium">Account:</span> [Account Number]</p>
            <p><span className="font-medium">Title:</span> [Account Title]</p>
          </div>
        </div>

        <div className="space-y-1">
          <p>After payment:</p>
          <p>1. Share your transaction screenshot on WhatsApp</p>
          <p className="font-medium">[Admin WhatsApp Number]</p>
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
            disabled={loading}
          />
          <DevButton
            onClick={handleVerifyKey}
            disabled={!key.trim() || loading}
            aria-busy={loading}
          >
            {loading ? 'Activating...' : 'Activate'}
          </DevButton>
        </div>
      </div>
    </div>
  );
};

export default ProAccessModal;