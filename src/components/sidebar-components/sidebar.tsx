"use client";
import React, { useState } from "react";
import dynamic from "next/dynamic";
import { RiMenuFoldLine, RiMenuUnfoldLine } from "react-icons/ri";
import { IoMdAdd } from "react-icons/io";
import { useParams, useRouter, usePathname } from "next/navigation";
import { createPortal } from "react-dom";

// Dynamically load heavier client-only widgets so they don't ship on first paint
const DevButton = dynamic(() => import("../dev-components/dev-button"), {
  ssr: false,
  loading: () => <button className="opacity-0" />,
});
const ReactTooltip = dynamic(() => import("../dev-components/react-tooltip"), {
  ssr: false,
  loading: () => <span />,
});
const DevPopover = dynamic(() => import("../dev-components/dev-popover"), {
  ssr: false,
  loading: () => <div />,
});
const SidebarChatList = dynamic(() => import("./sidebar-chat-list"), {
  ssr: false,
  loading: () => <div className="p-3 text-xs opacity-70">Loading chats…</div>,
});
// InsightLogo (genre selector) removed - no longer needed

const SideBar = ({ sidebarList }: { sidebarList: any }) => {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const chat = params && typeof params === 'object' && 'chat' in params ? (params as Record<string, string | string[]>).chat : undefined;

  // Only show sidebar on home page (/app) and chat pages (/app/[chat])
  // Exclude OCR, help, quiz, and other non-chat pages
  const shouldShowSidebar = pathname === '/app' || (pathname?.match(/^\/app\/[^/]+$/) && chat && !pathname.includes('ocr') && !pathname.includes('help') && !pathname.includes('quiz') && !pathname.includes('prompt-gallery'));

  // Hide sidebar completely if not on allowed pages
  if (!shouldShowSidebar) {
    return null;
  }

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[9]"
          onClick={() => setOpen(false)}
        />
      )}

      <section
        className={`h-full md:flex-shrink-0 bg-white/90 dark:bg-zinc-900/95 backdrop-blur-xl border-r border-emerald-200/30 dark:border-emerald-800/30 transition-all duration-300 ease-in-out ${open ? " w-[280px] sm:w-[300px] " : " md:w-[80px] w-0 opacity-0 pointer-events-none md:pointer-events-auto md:opacity-100"} fixed inset-0 p-3 flex flex-col justify-between z-40 md:relative overflow-hidden md:z-0 shadow-xl shadow-emerald-500/5 md:shadow-none`}
      >
        <div className="mt-20 sm:mt-20 md:mt-14">
          {
            typeof document !== 'undefined' && createPortal(
              <>
                <div className="md:hidden fixed top-0 left-0 right-0 h-14 sm:h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md z-[999] border-b border-emerald-200/30 dark:border-emerald-800/30" />
                <div className="fixed z-[1000] top-3 sm:top-4 left-3 flex items-center gap-2 sm:gap-3">
                  <ReactTooltip place="bottom-start" tipData={open ? "Collapse menu" : "Expand menu"}>
                    <DevButton
                      onClick={() => setOpen(!open)}
                      asIcon
                      size="xl"
                      rounded="full"
                      variant="v3"
                      className="min-w-[44px] min-h-[44px] touch-manipulation active:scale-95"
                    >
                      {open ? <RiMenuFoldLine className="text-xl" /> : <RiMenuUnfoldLine className="text-xl" />}
                    </DevButton>
                  </ReactTooltip>
                  {/* Genre selector removed - no longer needed */}
                  {chat && <DevButton
                    size="lg"
                    href="/app"
                    className="!text-xl fixed md:hidden top-3 sm:top-4 right-28 sm:right-32 z-50 min-w-[44px] min-h-[44px] touch-manipulation active:scale-95"
                    rounded="full" variant="v1" asIcon>
                    <IoMdAdd />
                  </DevButton>}
                </div>
              </>
              , document.body)
          }
          <ReactTooltip place="bottom" tipData="New chat">
            <DevButton
              onClick={() => router.push(`/app`)}
              rounded="full"
              asIcon={open ? false : true}
              variant="v1"
              className="mt-5 text-sm gap-3 px-[13px] justify-between md:!flex !hidden bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0"
            >
              <IoMdAdd className="text-xl" /> {open && "New chat"}
            </DevButton>
          </ReactTooltip>
          {open && <h2 className="pl-3 mt-10 text-sm font-semibold text-emerald-700 dark:text-emerald-400">{sidebarList.success && sidebarList.message.length > 0 && "Recent Chats"}</h2>}
        </div>
        <div className={`${open ? "block" : "hidden"} flex-grow overflow-y-auto`}>
          {open ? <SidebarChatList sidebarList={sidebarList} /> : null}
        </div>
        <div>
          {/* Footer info removed - all functionality moved to right hamburger menu */}
        </div>
      </section>
    </>
  );
};

export default SideBar;

