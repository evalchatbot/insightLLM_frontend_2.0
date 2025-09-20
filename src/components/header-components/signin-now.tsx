"use client";
import DevButton from "@/components/dev-components/dev-button";
import Image from "next/image";
import { GoSignOut } from "react-icons/go";
import { 
  SignInButton, 
  SignOutButton, 
  UserButton, 
  useUser 
} from '@clerk/nextjs';
import DevPopover from "../dev-components/dev-popover";
import ReactTooltip from "../dev-components/react-tooltip";
import CustomApiKey from "./custom-apikey";

export default function SignInNow() {
  const { user, isLoaded } = useUser();

  return (
    <div className="flex items-center gap-2">
    <CustomApiKey/>
      <div>
        {
          isLoaded ? (
            user ? (
              <DevPopover contentClick={false} place="bottom-start" popButton={<Image src={user.imageUrl} alt={"img"} width={35} height={35} className="rounded-full cursor-pointer" />}>
                <div className="py-2 w-48">
                  <SignOutButton>
                    <DevButton rounded="none" variant="v3" className="!justify-start  w-full" >
                      <GoSignOut className="text-lg" />
                      Sign Out
                    </DevButton>
                  </SignOutButton>
                </div>
              </DevPopover>
            ) : (
              <SignInButton mode="modal">
                <DevButton
                  className="text-sm !bg-accentBlue/50"
                >
                  Sign In
                </DevButton>
              </SignInButton>
            )
          ) : (
            <div className="animate-pulse">
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            </div>
          )
        }
      </div>
    </div>
  );
}
