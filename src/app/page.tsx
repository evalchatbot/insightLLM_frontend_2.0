"use client";
import React, { useState, useEffect, useRef } from "react";
import { useUser, SignInButton, SignOutButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import DevButton from "@/components/dev-components/dev-button";
import DevPopover from "@/components/dev-components/dev-popover";
import { GoSignOut } from "react-icons/go";
import { FaCheckCircle, FaStar, FaMoon, FaSun } from "react-icons/fa";
import { HiArrowRight } from "react-icons/hi";

export default function LandingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [showArrow, setShowArrow] = useState(false);
  const [currentCard, setCurrentCard] = useState(0);
   const [isDarkMode, setIsDarkMode] = useState(false);
  // Rotating color step for the three feature cards
  const [colorStep, setColorStep] = useState(0);
  const signinButtonRef = useRef<HTMLDivElement>(null);

  const handleGetStarted = () => {
    if (!user) {
      setShowArrow(true);
      setTimeout(() => {
        signinButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return;
    }
    router.push("/app");
  };

  useEffect(() => {
    if (user) {
      setShowArrow(false);
    }
  }, [user]);

  // Auto-rotate cards every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCard((prev) => (prev + 1) % 3);
     }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Cycle feature card colors every 3 seconds
  useEffect(() => {
    const t = setInterval(() => setColorStep((s) => s + 1), 3000);
    return () => clearInterval(t);
  }, []);

  const features = [
    "Instant, accurate marking tailored to CSS exam standards",
    "See exactly where you gained or missed out on marks",
    "AI-Chatbot to answer your CSS preparation questions"
  ];

  const cardData = [
    {
      badge: "Question Answer Evaluation",
      score: "15",
      total: "20",
      percentage: 85,
      title: "Analyze the role of political institutions in democratic governance",
      content: "Political institutions are fundamental to democratic governance as they",
      highlight: "ensure accountability and representation",
      subtext: "This answer demonstrates strong understanding of political theory and institutional frameworks...",
      feedbacks: [
        { text: "Add specific examples", icon: "💡", color: "from-orange-500 to-orange-600" },
        { text: "Strong analysis", icon: "✓", color: "from-green-500 to-green-600" }
      ]
    },
    {
      badge: "OCR Evaluation",
      score: "✓",
      total: "",
      percentage: 100,
      title: "How can I improve my essay structure for CSS exams?",
      content: "Start with a clear thesis statement, followed by",
      highlight: "well-structured paragraphs with evidence",
      subtext: "Each paragraph should focus on a single idea with proper citations and analysis...",
      feedbacks: [
        { text: "Comprehensive answer", icon: "✓", color: "from-blue-500 to-blue-600" },
        { text: "Actionable advice", icon: "📚", color: "from-purple-500 to-purple-600" }
      ]
    },
    {
      badge: "AI Chatbot Response",
      score: "",
      total: "💡",
      percentage: 80,
      title: "What are the key principles of international relations?",
      content: "The key principles include sovereignty, diplomacy, and",
      highlight: "balance of power among nations",
      subtext: "Your understanding of realist and liberal theories shows good conceptual knowledge...",
      feedbacks: [
        { text: "Great score!", icon: "🎯", color: "from-green-500 to-green-600" },
        { text: "Review missed questions", icon: "📖", color: "from-yellow-500 to-yellow-600" }
      ]
    }
  ];

  // Subtle gradient and ring color themes used by the three feature cards
  const colorSchemes = [
    {
      gradient: 'from-rose-500/15 via-orange-500/10 to-amber-500/15',
      ring: 'ring-rose-400/30',
    },
    {
      gradient: 'from-sky-500/15 via-blue-500/10 to-indigo-500/15',
      ring: 'ring-sky-400/30',
    },
    {
      gradient: 'from-emerald-500/15 via-green-500/10 to-teal-500/15',
      ring: 'ring-emerald-400/30',
    },
    {
      gradient: 'from-fuchsia-500/15 via-purple-500/10 to-pink-500/15',
      ring: 'ring-fuchsia-400/30',
    },
  ];

  return (
     <div className={`min-h-screen w-full relative overflow-x-hidden transition-colors duration-300 ${
       isDarkMode 
         ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
         : 'bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50'
     }`}>
      {/* Decorative stars scattered throughout */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              top: `${10 + Math.random() * 80}%`,
              left: `${5 + Math.random() * 90}%`,
            }}
            animate={{
              rotate: [0, 360],
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 3 + Math.random() * 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <FaStar className={`text-yellow-400 ${i % 3 === 0 ? 'text-3xl' : i % 3 === 1 ? 'text-2xl' : 'text-xl'} drop-shadow-md`} />
          </motion.div>
        ))}
      </div>

      {/* Header */}
       <header className={`fixed inset-x-0 top-0 w-full h-fit flex-shrink-0 flex items-center p-3 md:px-10 px-5 md:justify-between justify-end backdrop-blur-xl z-50 border-b shadow-sm transition-colors duration-300 ${
         isDarkMode 
           ? 'bg-gray-900/90 border-gray-700' 
           : 'bg-white/90 border-gray-200'
       }`}>
        <div className="md:flex hidden items-center gap-3">
          <motion.div 
             className="w-8 h-8 flex items-center justify-center overflow-hidden"
            whileHover={{ scale: 1.1, rotate: 360 }}
            transition={{ duration: 0.5 }}
          >
            <Image 
              src="/favicon.ico" 
              alt="InsightLLM Logo" 
               width={32} 
               height={32}
              className="object-contain"
            />
          </motion.div>
           <span className={`font-bold text-xl tracking-tight transition-colors ${
             isDarkMode ? 'text-white' : 'text-gray-900'
           }`}>InsightLLM</span>
        </div>
         <div className="flex items-center gap-4">
           {/* Dark Mode Toggle */}
           <motion.button
             whileHover={{ scale: 1.1 }}
             whileTap={{ scale: 0.9 }}
             onClick={() => setIsDarkMode(!isDarkMode)}
             className={`p-2 rounded-full transition-colors ${
               isDarkMode 
                 ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                 : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
             }`}
           >
             {isDarkMode ? <FaSun className="text-lg" /> : <FaMoon className="text-lg" />}
           </motion.button>
         
          <div ref={signinButtonRef} className="relative">
            {isLoaded ? (
              user ? (
                <DevPopover contentClick={false} place="bottom-start" popButton={<Image src={user.imageUrl} alt={"img"} width={40} height={40} className="rounded-full cursor-pointer border-2 border-gray-300 hover:border-gray-400 transition-colors" />}>
                  <div className="py-2 w-48">
                    <SignOutButton>
                      <DevButton rounded="none" variant="v3" className="!justify-start w-full">
                        <GoSignOut className="text-lg" />
                        Sign Out
                      </DevButton>
                    </SignOutButton>
                  </div>
                </DevPopover>
              ) : (
                <SignInButton mode="modal">
                  <DevButton className="text-base !bg-gray-900 hover:!bg-gray-800 text-white border-0 shadow-lg transition-all rounded-full px-8 py-3 font-semibold">
                    Get Started
                  </DevButton>
                </SignInButton>
              )
            ) : (
              <div className="animate-pulse">
                <div className="w-28 h-11 bg-gray-200 rounded-full"></div>
              </div>
            )}
            {showArrow && !user && (
              <div
                className="absolute -left-44 md:-left-52 top-1/2 -translate-y-1/2 pointer-events-none z-50 bg-gray-900 backdrop-blur-md px-4 py-2.5 rounded-lg border border-gray-700 shadow-xl"
              >
                <div className="flex items-center gap-2.5 text-white">
                  <span className="text-sm font-medium whitespace-nowrap">Sign in to continue</span>
                  <HiArrowRight className="text-xl" />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
       <section className="relative pt-28 pb-20 px-5 md:px-10 z-10">
        <div className="max-w-7xl mx-auto">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Column - Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
               className="space-y-8"
            >
               <h1 className={`text-3xl md:text-4xl lg:text-5xl font-bold leading-[1.1] transition-colors ${
                 isDarkMode ? 'text-white' : 'text-gray-900'
               }`
               }>
              
                Master CSS Exams with your{' '}
                <span className="relative inline-block">
                  <span className="relative z-10">CSS Ai tutor</span>
                  <motion.span
                     className={`absolute bottom-2 left-0 right-0 h-3 -z-0 rounded transition-colors ${
                       isDarkMode ? 'bg-green-500/40' : 'bg-green-300'
                     }`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    style={{ originX: 0 }}
                  />
                </span>
                {' '}and excel to serve the nation !!
              </h1>

              {/* Feature List */}
               <ul className="space-y-3">
                {features.map((feature, idx) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.8 + idx * 0.15 }}
                    className="flex items-start gap-4"
                  >
                     <FaCheckCircle className={`mt-1 flex-shrink-0 text-lg transition-colors ${
                       isDarkMode ? 'text-green-400' : 'text-green-500'
                     }`} />
                     <span className={`text-base font-medium leading-relaxed transition-colors ${
                       isDarkMode ? 'text-gray-300' : 'text-gray-700'
                     }`}>{feature}</span>
                  </motion.li>
                ))}
              </ul>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.4 }}
                 className="space-y-3"
              >
                <SignInButton mode="modal">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                     className={`text-white px-8 py-4 rounded-full text-lg font-bold shadow-xl transition-all ${
                       isDarkMode 
                         ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/50' 
                         : 'bg-gray-900 hover:bg-gray-800 hover:shadow-2xl'
                     }`}
                  >
                    Get Started - for free!
                  </motion.button>
                </SignInButton>
                 <p className={`text-sm font-semibold flex items-center gap-2 ml-2 transition-colors ${
                   isDarkMode ? 'text-purple-400' : 'text-purple-600'
                 }`}>
                  <span className="inline-block transform">→</span>
                  <span>For CSS students!</span>
                </p>
              </motion.div>
            </motion.div>

            {/* Right Column - Example Card with Auto-rotation */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative"
            >
              {/* Decorative stars around the card */}
              <div className="absolute -top-12 -left-12 pointer-events-none z-20">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                >
                   <FaStar className="text-yellow-400 text-3xl opacity-90 drop-shadow-lg" />
                </motion.div>
              </div>
              <div className="absolute -bottom-8 -right-8 pointer-events-none z-20">
                <motion.div
                  animate={{ rotate: [360, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                >
                   <FaStar className="text-yellow-400 text-2xl opacity-80 drop-shadow-lg" />
                </motion.div>
              </div>
              <div className="absolute top-1/4 -left-6 pointer-events-none z-20">
                <motion.div
                  animate={{ 
                    rotate: [0, 360],
                    scale: [1, 1.3, 1]
                  }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                >
                   <FaStar className="text-yellow-400 text-xl opacity-70 drop-shadow-md" />
                </motion.div>
              </div>
              <div className="absolute bottom-1/3 -right-4 pointer-events-none z-20">
                <motion.div
                  animate={{ 
                    rotate: [0, -360],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                >
                   <FaStar className="text-yellow-400 text-lg opacity-75 drop-shadow-md" />
                </motion.div>
              </div>

              {/* Card Container with AnimatePresence for smooth transitions */}
               <div className="relative h-[520px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentCard}
                    initial={{ opacity: 0, x: 100, rotateY: -15 }}
                    animate={{ opacity: 1, x: 0, rotateY: 0 }}
                    exit={{ opacity: 0, x: -100, rotateY: 15 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="absolute inset-0"
                  >
                    {/* White Card */}
                     <div className="bg-white rounded-3xl shadow-2xl p-8 h-full overflow-hidden">
                      {/* Subtle lined paper effect */}
                       <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
                        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 32px, #000 32px, #000 33px)`,
                      }}></div>

                      {/* Content */}
                      <div className="relative z-10 h-full flex flex-col">
                        {/* Badge */}
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.4, delay: 0.2, type: "spring" }}
                           className="inline-block bg-blue-500 text-white px-5 py-2 rounded-full text-sm font-bold mb-5 shadow-lg w-fit"
                        >
                          {cardData[currentCard].badge}
                        </motion.div>

                        {/* Score */}
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.4, delay: 0.3, type: "spring" }}
                           className="mb-5"
                        >
                          <div className="flex items-baseline gap-2 mb-3">
                             <span className="text-5xl font-bold text-gray-900">{cardData[currentCard].score}</span>
                            {cardData[currentCard].total && (
                              <>
                                 <span className="text-2xl text-gray-500 font-semibold">/{cardData[currentCard].total}</span>
                                 <span className="text-xl text-gray-600 ml-1">marks</span>
                              </>
                            )}
                          </div>
                          <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                             className="h-2.5 bg-gradient-to-r from-green-400 to-green-500 rounded-full shadow-md"
                            style={{ width: `${cardData[currentCard].percentage}%`, originX: 0 }}
                          />
                        </motion.div>

                        {/* Title */}
                         <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight">
                          {cardData[currentCard].title}
                        </h3>

                        {/* Essay Content */}
                         <div className="space-y-2.5 text-sm text-gray-700 leading-relaxed flex-grow mb-5">
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.6 }}
                          >
                            {cardData[currentCard].content}{' '}
                             <span className="bg-yellow-200 px-1 rounded font-semibold">
                              {cardData[currentCard].highlight}
                            </span>.
                          </motion.p>
                          
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.7 }}
                             className="text-xs text-gray-600"
                          >
                            {cardData[currentCard].subtext}
                          </motion.p>
                        </div>

                        {/* Feedback Badges - Now in normal flow, not overlaid */}
                         <div className="flex flex-wrap gap-2.5 mt-auto">
                          {cardData[currentCard].feedbacks.map((feedback, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ y: 20, opacity: 0, scale: 0.9 }}
                              animate={{ y: 0, opacity: 1, scale: 1 }}
                              transition={{ duration: 0.4, delay: 0.8 + idx * 0.1, type: "spring" }}
                               className={`bg-gradient-to-r ${feedback.color} text-white px-4 py-2 rounded-lg shadow-lg`}
                            >
                               <p className="text-xs font-bold flex items-center gap-1.5">
                                 <span className="text-sm">{feedback.icon}</span>
                                <span>{feedback.text}</span>
                              </p>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Card Indicators */}
                <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 flex gap-2">
                  {cardData.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentCard(idx)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        currentCard === idx 
                          ? 'bg-blue-500 w-8 shadow-md' 
                          : 'bg-gray-300 hover:bg-gray-400 w-2'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
       <section className={`relative py-20 px-5 md:px-10 z-10 transition-colors ${
         isDarkMode ? 'bg-gray-800/50' : 'bg-white/70'
       }`}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
             className="text-center mb-16"
          >
             <h2 className={`text-4xl md:text-5xl font-bold mb-5 transition-colors ${
               isDarkMode ? 'text-white' : 'text-gray-900'
             }`}>
              Everything you need to excel
            </h2>
             <p className={`text-xl transition-colors ${
               isDarkMode ? 'text-gray-300' : 'text-gray-600'
             }`}>
              All the tools to master CSS exam preparation
            </p>
          </motion.div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "AI Chatbot",
                description: "Get instant answers and personalized guidance for CSS exam preparation from our intelligent assistant",
                icon: "🤖",
                color: "bg-blue-100 text-blue-600",
                route: "/app",
                cta: "Launch Chatbot"
              },
              {
                title: "OCR Evaluation",
                description: "Upload your CSS essay answers and receive detailed marking with feedback aligned to exam standards",
                icon: "📝",
                color: "bg-purple-100 text-purple-600",
                route: "/app/ocr",
                cta: "Evaluate Answers"
              },
              {
                title: "Practice Quizez",
                description: "Test your knowledge with interactive quizzes covering Political Science, IR, and all CSS subjects",
                icon: "🧠",
                color: "bg-pink-100 text-pink-600",
                route: "/quiz",
                cta: "Start Quiz"
              }
            ].map((feature, idx) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.2, ease: "easeOut" } }}
                whileTap={{ scale: 0.98 }}
                onClick={() => user ? router.push(feature.route) : handleGetStarted()}
                 className={`group relative overflow-hidden rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-200 cursor-pointer ring-2 text-left ${
                  isDarkMode 
                    ? 'bg-gray-800 hover:bg-gray-750' 
                    : 'bg-white hover:bg-gray-50'
                } ${colorSchemes[(colorStep + idx) % colorSchemes.length].ring} hover:ring-4`}
              >
                {/* Animated gradient overlay for attention */}
                <div className={`absolute inset-0 pointer-events-none opacity-60 group-hover:opacity-80 transition-opacity duration-300 bg-gradient-to-br ${colorSchemes[(colorStep + idx) % colorSchemes.length].gradient}`}></div>

                 <div className={`relative z-10 w-16 h-16 ${feature.color} rounded-xl flex items-center justify-center text-3xl mb-6 shadow-md group-hover:scale-110 transition-transform duration-200`}>
                  {feature.icon}
                </div>
                 <h3 className={`relative z-10 text-2xl font-extrabold mb-3 transition-colors ${
                   isDarkMode ? 'text-white' : 'text-gray-900'
                 }`}>{feature.title}</h3>
                 <p className={`relative z-10 text-base leading-relaxed transition-colors font-medium mb-6 ${
                   isDarkMode ? 'text-gray-300' : 'text-gray-600'
                 }`}>{feature.description}</p>
                 
                 {/* CTA Button */}
                 <div className={`relative z-10 inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all duration-200 ${
                   isDarkMode 
                     ? 'bg-blue-600 text-white group-hover:bg-blue-500' 
                     : 'bg-gray-900 text-white group-hover:bg-gray-800'
                 } shadow-lg group-hover:shadow-xl group-hover:gap-3`}>
                   <span>{feature.cta}</span>
                   <HiArrowRight className="text-lg group-hover:translate-x-1 transition-transform duration-200" />
                 </div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
       <section className="relative py-20 px-5 md:px-10 z-10">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
             className="space-y-8"
          >
             <h2 className={`text-4xl md:text-5xl font-bold leading-tight transition-colors ${
               isDarkMode ? 'text-white' : 'text-gray-900'
             }`}>
              Ready to ace your CSS exams?
            </h2>
            <SignInButton mode="modal">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                 className={`text-white px-10 py-5 rounded-full text-xl font-bold shadow-xl transition-all ${
                   isDarkMode 
                     ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/50' 
                     : 'bg-gray-900 hover:bg-gray-800 hover:shadow-2xl'
                 }`}
              >
                Get Started - for free!
              </motion.button>
            </SignInButton>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
       <footer className={`relative py-8 px-5 md:px-10 border-t z-10 transition-colors ${
         isDarkMode 
           ? 'border-gray-700 bg-gray-900/80' 
           : 'border-gray-200 bg-white/80'
       }`}>
        <div className="max-w-6xl mx-auto text-center">
           <p className={`text-sm transition-colors ${
             isDarkMode ? 'text-gray-400' : 'text-gray-500'
           }`}>
            © 2025 InsightLLM. Powered by AI. Built for CSS excellence.
          </p>
        </div>
      </footer>
    </div>
  );
}
