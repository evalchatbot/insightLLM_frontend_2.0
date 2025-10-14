"use client";
import insightZustand from "@/utils/insight-zustand";
import React, { useEffect } from "react";

const DevToast = () => {
  const { devToast, setToast } = insightZustand();

  useEffect(() => {
    if (devToast) {
      setTimeout(() => {
        setToast(null);
      }, 2000);
    }
  }, [devToast]);
  return (
    devToast && (
      <div className="dev-toast fixed top-6 left-1/2 transform -translate-x-1/2 text-center dark:text-black text-white max-w-md w-[min(90%,28rem)] text-sm font-light p-3 z-50 dark:bg-rtlLight bg-rtlDark rounded shadow-md backdrop-blur-sm">
        {devToast}
      </div>
    )
  );
};

export default DevToast;

