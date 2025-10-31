"use client";
import { useEffect, useState } from "react";
import { ProAccessState } from "@/types/types";

export const useProAccess = () => {
  const [proAccess, setProAccess] = useState<ProAccessState | null>(null);

  useEffect(() => {
    const storedAccess = localStorage.getItem("proAccess");
    if (storedAccess) {
      const access = JSON.parse(storedAccess);
      if (access.active && new Date(access.expiryDate) > new Date()) {
        setProAccess(access);
      } else {
        localStorage.removeItem("proAccess");
        setProAccess(null);
      }
    }
  }, []);

  const checkProAccess = () => {
    if (!proAccess?.active) return false;
    return new Date(proAccess.expiryDate!) > new Date();
  };

  const clearProAccess = () => {
    localStorage.removeItem("proAccess");
    setProAccess(null);
  };

  return {
    proAccess,
    isProUser: checkProAccess(),
    clearProAccess
  };
};