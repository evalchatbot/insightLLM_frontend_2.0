import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "framer-motion";
import { afterEach, vi } from "vitest";

// Complete framer-motion animations (including AnimatePresence exits) on the next
// frame, so assertions never race an animation.
MotionGlobalConfig.skipAnimations = true;

/**
 * jsdom-only setup: Testing Library matchers/cleanup plus the browser APIs that
 * framer-motion, next-themes and the app code expect but jsdom lacks.
 */
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

if (!("IntersectionObserver" in window)) {
  (window as any).IntersectionObserver = NoopObserver;
  (globalThis as any).IntersectionObserver = NoopObserver;
}
if (!("ResizeObserver" in window)) {
  (window as any).ResizeObserver = NoopObserver;
  (globalThis as any).ResizeObserver = NoopObserver;
}

// jsdom does not implement scrolling or object URLs.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
Element.prototype.scrollIntoView = vi.fn();
if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => "blob:mock-object-url");
}
if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = vi.fn();
}
