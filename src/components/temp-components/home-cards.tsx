'use client'
import insightZustand from '@/utils/insight-zustand'
import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { nanoid } from 'nanoid'
import { motion } from 'framer-motion'
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

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemAnim = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full max-w-4xl mx-auto flex flex-wrap justify-center gap-2.5"
    >
      {randomPrompts.map((item, index) => (
        <motion.div
          key={index}
          variants={itemAnim}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleCardClick(item.prompt)}
          className="group relative px-4 py-2.5 rounded-full cursor-pointer touch-manipulation bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-emerald-200/50 dark:border-emerald-800/50 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/50 transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-2.5"
        >
          <item.icon className="text-base text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-foreground/80 font-medium group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors duration-300 line-clamp-1">
            {item.prompt}
          </p>
        </motion.div>
      ))}
    </motion.div>
  )
}

export default HomeCards
