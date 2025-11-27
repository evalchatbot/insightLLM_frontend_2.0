"use client"
import { useEffect, useState } from "react"
import OCRUpload from "@/components/OCRUpload"
import { motion } from "framer-motion"
import { Clock, Target, TrendingUp, CheckCircle2 } from "lucide-react"

export default function OCRPage() {
  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-emerald-50/70 via-lime-50/50 to-green-50/70 dark:from-zinc-950 dark:via-emerald-950/30 dark:to-zinc-900 pt-40 relative overflow-hidden">
        {/* Ultra Dense Galaxy Background with High Visibility Light Green Theme */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          {/* Animated stars - Ultra Dense */}
          {[...Array(200)].map((_, i) => (
            <motion.div
              key={`star-${i}`}
              className="absolute w-1 h-1 bg-lime-400/85 dark:bg-lime-400/80 rounded-full shadow-[0_0_4px_rgba(163,230,53,0.6)]"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.8, 0],
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}

          {/* Large orbiting light green nebulas - Ultra Dense */}
          <motion.div
            className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-lime-500/40 dark:bg-lime-500/30 rounded-full blur-3xl shadow-[0_0_100px_rgba(163,230,53,0.3)]"
            animate={{
              x: [0, 100, 0],
              y: [0, 50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <motion.div
            className="absolute top-[10%] right-[5%] w-96 h-96 bg-green-400/38 dark:bg-green-400/35 rounded-full blur-3xl shadow-[0_0_80px_rgba(74,222,128,0.3)]"
            animate={{
              x: [0, -70, 0],
              y: [0, 60, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
          />

          <motion.div
            className="absolute top-[5%] left-[40%] w-[420px] h-[420px] bg-lime-400/35 dark:bg-lime-400/32 rounded-full blur-3xl"
            animate={{
              x: [0, 60, 0],
              y: [0, 70, 0],
              scale: [1, 1.25, 1],
            }}
            transition={{
              duration: 21,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.2,
            }}
          />

          <motion.div
            className="absolute top-[15%] left-[70%] w-80 h-80 bg-green-500/32 dark:bg-green-500/38 rounded-full blur-3xl"
            animate={{
              x: [0, -65, 0],
              y: [0, 50, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 19,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2.8,
            }}
          />

          {/* Medium light green glow orbs - Enhanced */}
          <motion.div
            className="absolute top-1/4 right-1/4 w-80 h-80 bg-lime-500/48 dark:bg-lime-500/45 rounded-full blur-3xl shadow-[0_0_90px_rgba(163,230,53,0.25)]"
            animate={{
              x: [0, -80, 0],
              y: [0, 80, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          />

          <motion.div
            className="absolute top-[45%] left-[10%] w-72 h-72 bg-green-500/42 dark:bg-green-500/40 rounded-full blur-3xl shadow-[0_0_85px_rgba(34,197,94,0.25)]"
            animate={{
              x: [0, 90, 0],
              y: [0, -70, 0],
              scale: [1, 1.4, 1],
            }}
            transition={{
              duration: 16,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2.5,
            }}
          />

          <motion.div
            className="absolute top-[30%] left-[55%] w-64 h-64 bg-lime-400/40 dark:bg-lime-400/42 rounded-full blur-3xl"
            animate={{
              x: [0, 75, 0],
              y: [0, -60, 0],
              scale: [1, 1.35, 1],
            }}
            transition={{
              duration: 17,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 3.5,
            }}
          />

          <motion.div
            className="absolute top-[50%] right-[15%] w-[300px] h-[300px] bg-green-400/38 dark:bg-green-400/40 rounded-full blur-3xl"
            animate={{
              x: [0, -70, 0],
              y: [0, 65, 0],
              scale: [1, 1.32, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.8,
            }}
          />

          {/* Bottom nebulas - More dense */}
          <motion.div
            className="absolute -bottom-32 -right-32 w-[550px] h-[550px] bg-lime-400/35 dark:bg-lime-400/28 rounded-full blur-3xl shadow-[0_0_120px_rgba(163,230,53,0.3)]"
            animate={{
              x: [0, -60, 0],
              y: [0, -60, 0],
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
          />

          <motion.div
            className="absolute bottom-[15%] left-[35%] w-96 h-96 bg-green-400/38 dark:bg-green-400/32 rounded-full blur-3xl shadow-[0_0_100px_rgba(74,222,128,0.28)]"
            animate={{
              x: [0, 80, 0],
              y: [0, -50, 0],
              scale: [1, 1.35, 1],
            }}
            transition={{
              duration: 19,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.5,
            }}
          />

          <motion.div
            className="absolute bottom-[8%] left-[65%] w-[380px] h-[380px] bg-lime-500/36 dark:bg-lime-500/33 rounded-full blur-3xl"
            animate={{
              x: [0, -75, 0],
              y: [0, -55, 0],
              scale: [1, 1.28, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 3.2,
            }}
          />

          <motion.div
            className="absolute -bottom-20 left-[10%] w-72 h-72 bg-green-500/35 dark:bg-green-500/36 rounded-full blur-3xl"
            animate={{
              x: [0, 85, 0],
              y: [0, -45, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 21,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2.3,
            }}
          />

          {/* Additional light green nebulas - More scattered */}
          <motion.div
            className="absolute top-[60%] left-[20%] w-[350px] h-[350px] bg-lime-500/42 dark:bg-lime-500/35 rounded-full blur-3xl shadow-[0_0_95px_rgba(163,230,53,0.26)]"
            animate={{
              x: [0, 70, 0],
              y: [0, -50, 0],
              scale: [1, 1.25, 1],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 3,
            }}
          />

          <motion.div
            className="absolute top-[35%] right-[45%] w-64 h-64 bg-green-500/36 dark:bg-green-500/30 rounded-full blur-3xl"
            animate={{
              x: [0, -55, 0],
              y: [0, 55, 0],
              scale: [1, 1.28, 1],
            }}
            transition={{
              duration: 17,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 4,
            }}
          />

          <motion.div
            className="absolute top-[70%] right-[8%] w-[320px] h-[320px] bg-lime-400/38 dark:bg-lime-400/35 rounded-full blur-3xl"
            animate={{
              x: [0, -68, 0],
              y: [0, -58, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 23,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.7,
            }}
          />

          <motion.div
            className="absolute top-[75%] left-[50%] w-[280px] h-[280px] bg-green-400/34 dark:bg-green-400/36 rounded-full blur-3xl"
            animate={{
              x: [0, 72, 0],
              y: [0, -62, 0],
              scale: [1, 1.26, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2.9,
            }}
          />

          <motion.div
            className="absolute top-[55%] left-[75%] w-72 h-72 bg-lime-500/37 dark:bg-lime-500/38 rounded-full blur-3xl"
            animate={{
              x: [0, -78, 0],
              y: [0, 68, 0],
              scale: [1, 1.33, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 4.2,
            }}
          />

          {/* Floating particles - Ultra Denser */}
          {[...Array(90)].map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className="absolute w-2 h-2 bg-lime-400/70 dark:bg-lime-400/60 rounded-full shadow-[0_0_6px_rgba(163,230,53,0.5)]"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -120, 0],
                x: [0, Math.random() * 60 - 30, 0],
                opacity: [0, 0.85, 0],
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                delay: Math.random() * 5,
                ease: "easeInOut",
              }}
            />
          ))}

          {/* Multiple rotating rings - More visible */}
          <motion.div
            className="absolute top-1/2 left-1/2 w-[700px] h-[700px] -translate-x-1/2 -translate-y-1/2 border-2 border-lime-500/25 dark:border-lime-500/20 rounded-full shadow-[0_0_30px_rgba(163,230,53,0.2)]"
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{
              rotate: { duration: 30, repeat: Infinity, ease: "linear" },
              scale: { duration: 8, repeat: Infinity, ease: "easeInOut" },
            }}
          />

          <motion.div
            className="absolute top-1/2 left-1/2 w-[500px] h-[500px] -translate-x-1/2 -translate-y-1/2 border-2 border-green-400/25 dark:border-green-400/20 rounded-full shadow-[0_0_25px_rgba(74,222,128,0.2)]"
            animate={{
              rotate: -360,
              scale: [1, 1.15, 1],
            }}
            transition={{
              rotate: { duration: 20, repeat: Infinity, ease: "linear" },
              scale: { duration: 6, repeat: Infinity, ease: "easeInOut" },
            }}
          />

          <motion.div
            className="absolute top-1/2 left-1/2 w-[300px] h-[300px] -translate-x-1/2 -translate-y-1/2 border-2 border-lime-400/22 dark:border-lime-400/18 rounded-full shadow-[0_0_20px_rgba(163,230,53,0.18)]"
            animate={{
              rotate: 360,
              scale: [1, 1.2, 1],
            }}
            transition={{
              rotate: { duration: 15, repeat: Infinity, ease: "linear" },
              scale: { duration: 5, repeat: Infinity, ease: "easeInOut" },
            }}
          />

          <motion.div
            className="absolute top-1/2 left-1/2 w-[850px] h-[850px] -translate-x-1/2 -translate-y-1/2 border border-green-500/18 dark:border-green-500/16 rounded-full"
            animate={{
              rotate: -360,
              scale: [1, 1.08, 1],
            }}
            transition={{
              rotate: { duration: 35, repeat: Infinity, ease: "linear" },
              scale: { duration: 9, repeat: Infinity, ease: "easeInOut" },
            }}
          />

          <motion.div
            className="absolute top-1/2 left-1/2 w-[180px] h-[180px] -translate-x-1/2 -translate-y-1/2 border-2 border-lime-500/20 dark:border-lime-500/22 rounded-full"
            animate={{
              rotate: 360,
              scale: [1, 1.25, 1],
            }}
            transition={{
              rotate: { duration: 12, repeat: Infinity, ease: "linear" },
              scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
            }}
          />

          {/* Light green light rays - More rays and brighter */}
          {[...Array(16)].map((_, i) => (
            <motion.div
              key={`ray-${i}`}
              className="absolute top-1/2 left-1/2 w-1.5 h-56 bg-gradient-to-t from-lime-500/38 dark:from-lime-500/35 to-transparent origin-bottom shadow-[0_0_15px_rgba(163,230,53,0.3)]"
              style={{
                transform: `rotate(${i * 22.5}deg) translateY(-50%)`,
              }}
              animate={{
                opacity: [0.3, 0.75, 0.3],
                scaleY: [1, 1.5, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
            />
          ))}

          {/* Glowing energy lines - Ultra dense and bright */}
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={`line-${i}`}
              className="absolute w-full h-1 bg-gradient-to-r from-transparent via-lime-500/50 dark:via-lime-500/45 to-transparent shadow-[0_0_10px_rgba(163,230,53,0.4)]"
              style={{
                top: `${8 + i * 7}%`,
              }}
              animate={{
                x: ['-100%', '100%'],
                opacity: [0, 0.9, 0],
              }}
              transition={{
                duration: Math.random() * 3 + 4,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeInOut",
              }}
            />
          ))}

          {/* Diagonal energy lines - More and brighter */}
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={`diag-${i}`}
              className="absolute w-1.5 h-full bg-gradient-to-b from-transparent via-green-500/40 dark:via-green-500/35 to-transparent shadow-[0_0_8px_rgba(34,197,94,0.3)]"
              style={{
                left: `${10 + i * 10}%`,
              }}
              animate={{
                y: ['-100%', '100%'],
                opacity: [0, 0.85, 0],
              }}
              transition={{
                duration: Math.random() * 4 + 5,
                repeat: Infinity,
                delay: Math.random() * 3,
                ease: "easeInOut",
              }}
            />
          ))}

          {/* Pulsing center glows - Multiple strong layers */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-radial from-lime-500/12 dark:from-lime-500/15 to-transparent rounded-full shadow-[0_0_150px_rgba(163,230,53,0.25)]"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-radial from-green-500/10 dark:from-green-500/12 to-transparent rounded-full shadow-[0_0_120px_rgba(34,197,94,0.22)]"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0.9, 0.5],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          />

          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-radial from-lime-400/8 dark:from-lime-400/10 to-transparent rounded-full"
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.5, 0.95, 0.5],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
          />

          {/* Small sparkle dots - Maximum density */}
          {[...Array(150)].map((_, i) => (
            <motion.div
              key={`sparkle-${i}`}
              className="absolute w-0.5 h-0.5 bg-lime-300/75 dark:bg-lime-300/70 rounded-full shadow-[0_0_3px_rgba(190,242,100,0.6)]"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 0.95, 0],
                scale: [0.5, 1.5, 0.5],
              }}
              transition={{
                duration: Math.random() * 2 + 1.5,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            />
          ))}

          {/* Medium sparkle dots for extra density */}
          {[...Array(60)].map((_, i) => (
            <motion.div
              key={`medsparkle-${i}`}
              className="absolute w-1 h-1 bg-lime-400/70 dark:bg-lime-400/65 rounded-full shadow-[0_0_5px_rgba(163,230,53,0.5)]"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 0.9, 0],
                scale: [0.3, 1.3, 0.3],
              }}
              transition={{
                duration: Math.random() * 2.5 + 2,
                repeat: Infinity,
                delay: Math.random() * 4,
              }}
            />
          ))}
        </div>

        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 relative z-10">

          {/* How It Works Section */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.3
                }
              }
            }}
            className="mb-16"
          >
            <div className="text-center mb-16">
              <motion.h2
                variants={{
                  hidden: { opacity: 0, y: -20 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="text-3xl md:text-4xl font-bold text-[#2E5C55] dark:text-[#4ade80] mb-3"
              >
                HOW IT WORKS
              </motion.h2>
              <motion.p
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1 }
                }}
                className="text-zinc-600 dark:text-zinc-400 text-lg"
              >
                Get professional feedback in three simple steps
              </motion.p>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start relative max-w-4xl mx-auto">
              {/* Line connecting steps */}
              <motion.div
                variants={{
                  hidden: { scaleX: 0, opacity: 0 },
                  visible: {
                    scaleX: 1,
                    opacity: 1,
                    transition: { duration: 1.5, ease: "circOut", delay: 0.3 }
                  }
                }}
                style={{ originX: 0 }}
                className="hidden md:block absolute top-6 left-0 w-full h-[2px] bg-gradient-to-r from-[#2E5C55]/10 via-[#2E5C55]/30 to-[#2E5C55]/10 dark:from-[#4ade80]/10 dark:via-[#4ade80]/30 dark:to-[#4ade80]/10 -z-10 overflow-hidden rounded-full"
              >
                {/* Primary flowing beam */}
                <motion.div
                  className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-[#2E5C55] dark:via-[#4ade80] to-transparent blur-[1px]"
                  animate={{ x: ['-100%', '300%'] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                />
                {/* Secondary fast beam */}
                <motion.div
                  className="absolute top-0 left-0 h-full w-1/5 bg-gradient-to-r from-transparent via-[#4ade80] dark:via-[#2E5C55] to-transparent blur-[2px] opacity-60"
                  animate={{ x: ['-100%', '400%'] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "linear", delay: 0.5 }}
                />
              </motion.div>

              {/* Step 1 */}
              <motion.div
                variants={{
                  hidden: { y: 20, opacity: 0 },
                  visible: { y: 0, opacity: 1 }
                }}
                className="flex flex-col items-center text-center w-full md:w-1/3 px-4"
              >
                <motion.div
                  animate={{
                    y: [0, -8, 0],
                    boxShadow: [
                      "0 0 0 0 rgba(46, 92, 85, 0)",
                      "0 0 20px 8px rgba(46, 92, 85, 0.3)",
                      "0 0 0 0 rgba(46, 92, 85, 0)"
                    ]
                  }}
                  transition={{
                    y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                    boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                  }}
                  whileHover={{
                    scale: 1.1,
                    rotate: 5,
                    boxShadow: "0 0 25px 10px rgba(74, 222, 128, 0.4)"
                  }}
                  className="w-12 h-12 rounded-full bg-[#2E5C55] dark:bg-[#4ade80] text-white dark:text-black flex items-center justify-center text-xl font-bold mb-6 shadow-lg ring-4 ring-white dark:ring-zinc-950 cursor-default relative z-10"
                >
                  1
                </motion.div>
                <h3 className="font-serif text-xl mb-3 text-zinc-800 dark:text-zinc-100">Upload your answer</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[250px] mx-auto">Select your subject and upload your PDF essay (up to 10MB)</p>
              </motion.div>

              {/* Step 2 */}
              <motion.div
                variants={{
                  hidden: { y: 20, opacity: 0 },
                  visible: { y: 0, opacity: 1 }
                }}
                className="flex flex-col items-center text-center w-full md:w-1/3 px-4 mt-12 md:mt-0"
              >
                <motion.div
                  animate={{
                    y: [0, -8, 0],
                    boxShadow: [
                      "0 0 0 0 rgba(46, 92, 85, 0)",
                      "0 0 20px 8px rgba(46, 92, 85, 0.3)",
                      "0 0 0 0 rgba(46, 92, 85, 0)"
                    ]
                  }}
                  transition={{
                    y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.2 },
                    boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }
                  }}
                  whileHover={{
                    scale: 1.1,
                    rotate: -5,
                    boxShadow: "0 0 25px 10px rgba(74, 222, 128, 0.4)"
                  }}
                  className="w-12 h-12 rounded-full bg-[#2E5C55] dark:bg-[#4ade80] text-white dark:text-black flex items-center justify-center text-xl font-bold mb-6 shadow-lg ring-4 ring-white dark:ring-zinc-950 cursor-default relative z-10"
                >
                  2
                </motion.div>
                <h3 className="font-serif text-xl mb-3 text-zinc-800 dark:text-zinc-100">AI Analysis</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[250px] mx-auto">Our AI evaluates content, structure, grammar, and more in seconds</p>
              </motion.div>

              {/* Step 3 */}
              <motion.div
                variants={{
                  hidden: { y: 20, opacity: 0 },
                  visible: { y: 0, opacity: 1 }
                }}
                className="flex flex-col items-center text-center w-full md:w-1/3 px-4 mt-12 md:mt-0"
              >
                <motion.div
                  animate={{
                    y: [0, -8, 0],
                    boxShadow: [
                      "0 0 0 0 rgba(46, 92, 85, 0)",
                      "0 0 20px 8px rgba(46, 92, 85, 0.3)",
                      "0 0 0 0 rgba(46, 92, 85, 0)"
                    ]
                  }}
                  transition={{
                    y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.4 },
                    boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }
                  }}
                  whileHover={{
                    scale: 1.1,
                    rotate: 5,
                    boxShadow: "0 0 25px 10px rgba(74, 222, 128, 0.4)"
                  }}
                  className="w-12 h-12 rounded-full bg-[#2E5C55] dark:bg-[#4ade80] text-white dark:text-black flex items-center justify-center text-xl font-bold mb-6 shadow-lg ring-4 ring-white dark:ring-zinc-950 cursor-default relative z-10"
                >
                  3
                </motion.div>
                <h3 className="font-serif text-xl mb-3 text-zinc-800 dark:text-zinc-100">Get Results</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[250px] mx-auto">Download detailed feedback with scores and improvement suggestions</p>
              </motion.div>
            </div>
          </motion.div>

          {/* Uploader Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="w-full max-w-2xl mx-auto mb-24"
          >
            <OCRUpload />
          </motion.div>

          {/* Improve Your Score Section */}
          <motion.section
            className="mb-24"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center mb-16">
              <h2 className="text-3xl font-serif text-[#2E5C55] dark:text-[#4ade80] mb-3">Improve Your Score</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-lg">Comprehensive analysis designed for CSS exam preparation</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: <Clock className="w-6 h-6" />,
                  title: "Instant Feedback",
                  desc: "Get comprehensive results in under 30 seconds"
                },
                {
                  icon: <Target className="w-6 h-6" />,
                  title: "Detailed Scoring",
                  desc: "Precise evaluation on content, structure, and grammar"
                },
                {
                  icon: <TrendingUp className="w-6 h-6" />,
                  title: "Track Progress",
                  desc: "Monitor improvement with detailed analytics over time"
                }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  className="flex flex-col items-center text-center p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                >
                  <div className="w-14 h-14 rounded-full bg-[#2E5C55]/5 dark:bg-[#4ade80]/10 text-[#2E5C55] dark:text-[#4ade80] flex items-center justify-center mb-6 ring-1 ring-[#2E5C55]/20 dark:ring-[#4ade80]/20">
                    {feature.icon}
                  </div>
                  <h3 className="font-serif text-lg font-bold mb-3 text-zinc-800 dark:text-zinc-100">{feature.title}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

        </div>

        {/* CTA Footer Section */}
        <motion.section
          className="bg-[#1F2937] dark:bg-black py-12 px-6 relative overflow-hidden"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          {/* Abstract Background Shapes */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-10">
            <div className="absolute top-10 left-10 w-64 h-64 bg-blue-500 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#2E5C55] rounded-full blur-3xl" />
          </div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <motion.h2
              className="text-3xl md:text-5xl font-serif text-white mb-6"
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              Ready to Improve Your Scores?
            </motion.h2>
            <motion.p
              className="text-zinc-300 text-lg mb-10 max-w-2xl mx-auto"
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              Join thousands of CSS candidates using AI to simplify evaluations and amplify scores
            </motion.p>

            <motion.div
              className="flex flex-wrap justify-center gap-6 text-zinc-400 text-sm"
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />
                <span>Instant results</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />
                <span>Secure & private</span>
              </div>
            </motion.div>
          </div>
        </motion.section>
      </main>

      {/* Compact Footer for Evaluation Page */}
      <footer className="py-6 border-t border-black/5 dark:border-white/10 bg-zinc-50 dark:bg-black/40">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="relative w-6 h-6">
              <img
                src="/assets/gemini-logo.svg"
                alt="InsightLLM Logo"
                className="object-contain w-full h-full"
              />
            </div>
            <span className="font-bold text-xl tracking-tight text-emerald-700 dark:text-emerald-400">
              rubrik.ai
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm font-medium">
            <a href="#" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">
              Privacy
            </a>
            <a href="#" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">
              Terms
            </a>
            <a href="#" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">
              Contact
            </a>
          </div>

          {/* Copyright */}
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            © 2025 RUBRIK. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  )
}
