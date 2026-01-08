'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

export default function UnderConstructionNotice() {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 w-full bg-gradient-to-r from-amber-400 via-red-400 to-red-400 dark:from-amber-600 dark:via-red-600 dark:to-red-600 py-0.3 shadow-lg z-50">
      <div className="max-w-full mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Moving text */}
          <div className="flex-1 overflow-hidden min-w-0">
            <div className="marquee">
              <div className="marquee-track whitespace-nowrap inline-flex">
                <span className="text-xs sm:text-xs md:text-sm font-bold text-white dark:text-white inline-block">
                  ✨ We are finalizing our Essay and Precis modules and will make them available very soon. Thank you for your patience. ✨
                </span>
                <span className="text-xs sm:text-xs md:text-sm font-bold text-white dark:text-white inline-block ml-16">
                  ✨ We are finalizing our Essay and Precis modules and will make them available very soon. Thank you for your patience. ✨
                </span>
                 <span className="text-xs sm:text-xs md:text-sm font-bold text-white dark:text-white inline-block ml-16">
                  ✨ We are finalizing our Essay and Precis modules and will make them available very soon. Thank you for your patience. ✨
                </span>
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => setIsDismissed(true)}
            className="flex-shrink-0 inline-flex p-0.5 text-white hover:text-white/80 transition-colors hover:bg-white/20 rounded-full"
            aria-label="Dismiss notice"
          >
            <X className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .marquee {
          position: relative;
          overflow: hidden;
        }
        .marquee-track {
          will-change: transform;
          animation: marquee 18s linear infinite;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
