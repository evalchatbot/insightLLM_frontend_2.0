"use client";
import React, { useState } from "react";
import dynamic from "next/dynamic";
import { FiMenu } from "react-icons/fi";
import { IoMdAdd, IoMdHelpCircleOutline } from "react-icons/io";
import { MdOutlineDarkMode } from "react-icons/md";
import { RxCounterClockwiseClock } from "react-icons/rx";
import { AiOutlineFileText } from "react-icons/ai";
import { IoSettingsOutline } from "react-icons/io5";
import { GoDotFill } from "react-icons/go";
import ThemeSwitch from "./theme-switch";
import { useParams, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { FaBrain } from "react-icons/fa";

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
const InsightLogo = dynamic(() => import("../header-components/insight-logo"), {
  ssr: false,
  loading: () => <div />,
});

const SideBar = ({ sidebarList }: { sidebarList: any }) => {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const params = useParams();
  const chat = params && typeof params === 'object' && 'chat' in params ? (params as Record<string, string | string[]>).chat : undefined;

  return (
    <section
      className={`h-full md:flex-shrink-0 bg-card md:transform-none transition-[width] ${open ? " w-[300px] " : " md:w-[70px] w-0 opacity-0 pointer-events-none md:pointer-events-auto md:opacity-100"} fixed inset-0 p-3 w-[300px] flex flex-col justify-between z-10 md:relative overflow-hidden md:z-0`}
    >
      <div className="mt-14">
        {
          typeof document !== 'undefined' && createPortal(<div className="fixed z-[1000] top-3 left-3 flex items-center gap-3">
            <ReactTooltip place="bottom-start" tipData="Collapse menu">
              <DevButton
                onClick={() => setOpen(!open)}
                asIcon
                size="xl"
                rounded="full"
                variant="v3"
              >
                <FiMenu className="text-xl" />
              </DevButton>
            </ReactTooltip>
            <div className="block md:hidden"><InsightLogo />
            </div>
            {chat && <DevButton
              size="lg"
              href="/app"
              className="!text-xl fixed md:hidden top-3 right-32 z-50"
              rounded="full" variant="v1" asIcon>
              <IoMdAdd />
            </DevButton>}
          </div>
            , document.body)
        }
        <ReactTooltip place="bottom" tipData="New chat">
          <DevButton
            onClick={() => router.push(`/app`)}
            rounded="full"
            asIcon={open ? false : true}
            variant="v1"
            className=" mt-5 text-sm gap-3 px-[13px] justify-between md:!flex !hidden"
          >
            <IoMdAdd className="text-xl" /> {open && "New chat"}
          </DevButton>
        </ReactTooltip>
        {open && <h2 className="pl-3 mt-10">{sidebarList.success && sidebarList.message.length > 0 && "Recent"}</h2>}
      </div>
      <div className={`${open ? "block" : "hidden"} flex-grow overflow-y-auto`}>
        {open ? <SidebarChatList sidebarList={sidebarList} /> : null}
      </div>
      <div>
        <ul className="mt-5 space-y-1">
          <li>
            <ReactTooltip occupy={false} place="right" tipData="Quiz">
              <DevButton
                variant="v3"
                href="/quiz"
                className={`text-sm *:text-xl ${open ? " aspect-auto " : " aspect-square "} group !w-full !justify-start gap-3`}
                rounded="full"
              >
                <FaBrain />
                {open && "Quiz"}
              </DevButton>
            </ReactTooltip>
          </li>
          <li>
            {" "}
            <ReactTooltip occupy={false} place="right" tipData="Help">
              <DevButton
                variant="v3"
                href="/app/help"
                className={`text-sm *:text-xl ${open ? " aspect-auto " : " aspect-square "} group !w-full !justify-start gap-3`}
                rounded="full"
              >
                <IoMdHelpCircleOutline />
                {open && "Help"}
              </DevButton>
            </ReactTooltip>
          </li>
          <li>
            <ReactTooltip
              occupy={false}
              place="right"
              tipData="Document OCR Analysis"
            >
              <DevButton
                variant="v3"
                href="/app/ocr"
                className={`text-sm *:text-xl ${open ? " aspect-auto " : " aspect-square "} group !w-full !justify-start gap-3`}
                rounded="full"
              >
                <AiOutlineFileText />
                {open && "OCR Analysis"}
              </DevButton>
            </ReactTooltip>
          </li>
          <li>
            <ReactTooltip
              occupy={false}
              place="right"
              tipData="AI Apps Activity"
            >
              <DevButton
                variant="v3"
                className={`text-sm *:text-xl ${open ? " aspect-auto " : " aspect-square "} group !w-full !justify-start gap-3`}
                rounded="full"
              >
                <RxCounterClockwiseClock />
                {open && "Activity"}
              </DevButton>
            </ReactTooltip>
          </li>
          <li>
            <ReactTooltip occupy={false} place="right" tipData="Settings">
              <DevPopover
                contentClick={false}
                place="top-end"
                popButton={
                  <DevButton
                    variant="v3"
                    className={`text-sm *:text-xl ${open ? " aspect-auto " : " aspect-square "} group !w-full !justify-start gap-3`}
                    rounded="full"
                  >
                    <IoSettingsOutline />
                    {open && "Settings"}
                  </DevButton>
                }
              >
                <div className="w-52 py-2">
                  {/* <DevButton
                    variant="v3"
                    className="w-full !justify-start gap-3  group "
                    rounded="none"
                  >
                    <IoLinkSharp className="text-xl" />
                    Your public links
                  </DevButton> */}
                  <DevButton
                    variant="v3"
                    className="w-full !justify-start gap-3  group"
                    rounded="none"
                  >
                    <label
                      htmlFor="toggleBox"
                      className="flex cursor-pointer items-center gap-3"
                    >
                      <MdOutlineDarkMode className="text-xl" />
                      Dark theme
                      <ThemeSwitch />
                    </label>
                  </DevButton>
                </div>
              </DevPopover>
            </ReactTooltip>
          </li>
          
        </ul>
        <div
          className={`transform overflow-hidden ${open ? "block" : "hidden"}`}
        >
          <span className="flex items-center text-xs gap-2 ml-3 mt-5">
            <GoDotFill />
            <p>Location: http://localhost:3000</p>
          </span>
        </div>
      </div>
    </section>
  );
};

export default SideBar;

