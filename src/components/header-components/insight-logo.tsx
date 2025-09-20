
import { FaCaretDown, FaRegCheckCircle } from "react-icons/fa";
import { FaBrain } from "react-icons/fa";
import DevButton from "../dev-components/dev-button";
import DevPopover from "../dev-components/dev-popover";

const InsightLogo = () => {
    return (
      <DevPopover
        popButton={
          <DevButton size="sm" rounded="sm" className="text-lg gap-2">
            Insight LLM
            <FaCaretDown />
          </DevButton>
        }
      >
        <div className=" py-2">
          <DevButton
            variant="v3"
            className="w-full !justify-between gap-3 group"
            rounded="none"
          >
            <span className="flex items-center gap-2">
              <FaBrain className="text-lg text-[#4E82EE]" />
              Insight LLM
            </span>
            <FaRegCheckCircle className="text-xl" />
          </DevButton>
          <DevButton
            ripple={false}
            className="cursor-auto w-full !justify-start gap-3 group"
            rounded="none"
          >
            <span className="flex items-center gap-2 opacity-50">
              <FaBrain className="text-lg text-[#D96570]" />
              Insight LLM Pro
            </span>
  
            <DevButton variant="v1" rounded="sm">
              Upgrade
            </DevButton>
          </DevButton>
        </div>
      </DevPopover>
    );
  };

  export default InsightLogo
  
