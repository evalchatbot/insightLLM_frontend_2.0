'use client'
import insightZustand from '@/utils/insight-zustand'
import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { nanoid } from 'nanoid'
import { FaBalanceScale, FaUniversity, FaGavel, FaFlag } from "react-icons/fa";
import { IoIosBook, IoMdPaper } from "react-icons/io";
import { MdOutlineGavel, MdOutlinePolicy, MdOutlineHowToVote, MdOutlineAccountBalance } from "react-icons/md";
import { RiGovernmentLine, RiBookReadLine } from "react-icons/ri";
import { GiCapitol, GiScales, GiVote, GiTakeMyMoney } from "react-icons/gi";
import { BsShieldCheck, BsGlobe, BsFileEarmarkText, BsBuildingDown } from "react-icons/bs";
import { HiOutlineDocumentText, HiOutlineScale } from "react-icons/hi";
import { TbGavel } from "react-icons/tb";

const promptArray = [
  {
    icon: FaBalanceScale,
    prompt: "Explain the key differences between the US Constitution and Pakistan's Constitution of 1973",
  },
  {
    icon: FaUniversity,
    prompt: "What are the fundamental principles of constitutional democracy and how do they protect minority rights?",
  },
  {
    icon: RiGovernmentLine,
    prompt: "Compare the federal systems of the United States, Germany, and India - what are their unique features?",
  },
  {
    icon: MdOutlineGavel,
    prompt: "How does judicial review work in different constitutional systems around the world?",
  },
  {
    icon: GiCapitol,
    prompt: "Analyze the separation of powers doctrine - why did the founding fathers consider it essential?",
  },
  {
    icon: BsShieldCheck,
    prompt: "What are the key differences between a written constitution like the US and an unwritten one like the UK?",
  },
  {
    icon: MdOutlinePolicy,
    prompt: "Examine the concept of constitutional sovereignty versus parliamentary sovereignty",
  },
  {
    icon: IoIosBook,
    prompt: "How do constitutional amendments work in Pakistan compared to the United States?",
  },
  {
    icon: GiScales,
    prompt: "What role do constitutional courts play in protecting fundamental rights?",
  },
  {
    icon: MdOutlineHowToVote,
    prompt: "Compare different electoral systems - FPTP, proportional representation, and mixed systems",
  },
  {
    icon: BsFileEarmarkText,
    prompt: "What is the significance of the Bill of Rights in the US Constitution?",
  },
  {
    icon: HiOutlineDocumentText,
    prompt: "Analyze the concept of constitutional supremacy and its implications for governance",
  },
  {
    icon: FaGavel,
    prompt: "How do emergency powers provisions differ across various constitutions?",
  },
  {
    icon: GiVote,
    prompt: "What are the constitutional requirements for citizenship and naturalization in different countries?",
  },
  {
    icon: BsGlobe,
    prompt: "Examine the role of international law in domestic constitutional interpretation",
  },
  {
    icon: MdOutlineAccountBalance,
    prompt: "How do constitutional provisions for economic rights differ between countries?",
  },
  {
    icon: RiBookReadLine,
    prompt: "What is the doctrine of basic structure in constitutional law and why is it important?",
  },
  {
    icon: FaFlag,
    prompt: "Compare the constitutional frameworks for freedom of speech in different democracies",
  },
  {
    icon: TbGavel,
    prompt: "How do constitutional conventions and customs supplement written constitutional law?",
  },
  {
    icon: HiOutlineScale,
    prompt: "What are the constitutional challenges facing modern democracies in the digital age?",
  },
  {
    icon: IoMdPaper,
    prompt: "Analyze the constitutional basis for federalism and state rights in federal systems",
  },
  {
    icon: GiTakeMyMoney,
    prompt: "How do constitutional provisions regulate taxation and fiscal federalism?",
  },
  {
    icon: BsBuildingDown,
    prompt: "What constitutional mechanisms exist for impeachment and removal of government officials?",
  },
];

const HomeCards = () => {
  const { setCurrChat, setAutoSend } = insightZustand()
  const router = useRouter()
  
  const randomPrompts = useMemo(() => {
    const shuffled = [...promptArray].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 4);
  }, []);

  const handleCardClick = (prompt: string) => {
    // Generate a new chat ID
    const chatID = nanoid();
    
    // Set the prompt in the store
    setCurrChat('userPrompt', prompt);
    
    // Set autoSend flag so the message gets sent automatically after navigation
    setAutoSend(true);
    
    // Navigate to the new chat page
    router.push(`/app/${chatID}`);
  };

  return (
    <div className="w-full h-auto grid md:grid-cols-4 grid-cols-1 overflow-hidden gap-2 mt-5 md:mt-16">
      {randomPrompts.map((item, index) => (
        <div
          key={index}
          onClick={() => handleCardClick(item.prompt)}
          className="dark:bg-rtlDark md:aspect-square bg-rtlLight hover:!bg-accentGray/20 cursor-pointer rounded-xl relative p-4 font-light"
        >
          <p>{item.prompt}</p>
          <item.icon className="absolute text-4xl bottom-2 right-2 rounded-full p-2 aspect-square bg-white dark:bg-black" />
        </div>
      ))}
    </div>
  )
}

export default HomeCards
