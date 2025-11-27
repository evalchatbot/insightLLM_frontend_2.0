'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { HiSparkles } from 'react-icons/hi'

export default function HelpPage() {
  return (
    <main className="w-full max-w-5xl mx-auto px-4 sm:px-5 md:px-6 lg:px-8 py-8 sm:py-12 md:py-16 lg:py-24 relative overflow-hidden">
      {/* Hero Section */}
      <motion.div 
        className="mb-12 sm:mb-16 md:mb-20 lg:mb-28"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center mb-8">
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 mb-6"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <HiSparkles className="text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-bold text-gray-700 dark:text-white uppercase tracking-wider">InsightLLM</span>
          </motion.div>
          
          <motion.h1 
            className="text-foreground text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            CSS Examination <br className="hidden sm:block" />Help & Documentation
          </motion.h1>
          
          <motion.p 
            className="text-muted-foreground text-base sm:text-lg md:text-xl max-w-3xl mx-auto leading-relaxed mb-4 px-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            Welcome to the comprehensive help center for Central Superior Services examination preparation. 
            Our platform combines artificial intelligence with expert knowledge to provide you with a powerful 
            learning companion that adapts to your study needs.
          </motion.p>
        </div>
      </motion.div>

      {/* What is InsightLLM */}
      <motion.section 
        className="mb-12 sm:mb-16 md:mb-20 lg:mb-28"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-foreground text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
          What is InsightLLM?
        </h2>
        <div className="space-y-4 sm:space-y-6 text-sm sm:text-base md:text-lg leading-relaxed">
          <motion.p 
            className="text-muted-foreground"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            InsightLLM is an advanced AI-powered study platform specifically designed for CSS (Central Superior Services) 
            examination candidates in Pakistan. Built with cutting-edge language models and comprehensive subject expertise, 
            the platform serves as your personal study assistant, available 24/7 to help you navigate through the challenging 
            CSS syllabus.
          </motion.p>
          <motion.p 
            className="text-muted-foreground"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            The platform leverages artificial intelligence to understand your questions in natural language, providing 
            detailed explanations, essay frameworks, and study guidance across all CSS subjects including General Knowledge, 
            Current Affairs, Islamic Studies, Pakistan Affairs, English, and your chosen optional subjects. Whether you need 
            clarification on complex topics, practice questions, or study strategies, InsightLLM adapts to your learning style 
            and provides personalized assistance.
          </motion.p>
        </div>
      </motion.section>

      {/* Key Features */}
      <motion.section 
        className="mb-12 sm:mb-16 md:mb-20 lg:mb-28"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-foreground text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8">
          Platform Capabilities
        </h2>
        
        <div className="space-y-6 sm:space-y-8 md:space-y-10">
          <div>
            <h3 className="text-foreground text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">
              AI-Powered Chat Interface
            </h3>
            <motion.p 
              className="text-muted-foreground text-sm sm:text-base md:text-lg leading-relaxed"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Our intelligent chatbot understands context and provides comprehensive answers to your CSS-related queries. 
              Simply type your question in natural language, and the AI will analyze it, search through extensive knowledge bases, 
              and deliver detailed responses with relevant examples, historical context, and analytical frameworks. The system 
              can handle complex questions, break down difficult concepts, and provide step-by-step explanations tailored to 
              CSS examination requirements.
            </motion.p>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="text-foreground text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">
              OCR-Based Answer Evaluation
            </h3>
            <motion.p 
              className="text-muted-foreground text-sm sm:text-base md:text-lg leading-relaxed"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Upload images of your handwritten answers and receive instant, automated evaluation using advanced Optical Character 
              Recognition technology. The system analyzes your writing, checks for accuracy, evaluates structure and coherence, 
              and provides detailed feedback on how to improve. This feature is particularly valuable for essay writing practice, 
              allowing you to refine your writing skills before the actual examination.
            </motion.p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h3 className="text-foreground text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">
              Practice Questions & Mock Tests
            </h3>
            <motion.p 
              className="text-muted-foreground text-sm sm:text-base md:text-lg leading-relaxed"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              Request practice questions on any topic within the CSS syllabus and receive curated questions that mirror actual 
              examination patterns. The platform can generate essay prompts, analytical questions, and conceptual queries that 
              test your understanding at various difficulty levels. Regular practice with these questions helps you familiarize 
              yourself with examination formats and develop effective time management strategies.
            </motion.p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
              <motion.span
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                📊
              </motion.span>
              Progress Tracking & Analytics
            </h3>
            <motion.p 
              className="text-muted-foreground text-sm sm:text-base md:text-lg leading-relaxed"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              Monitor your preparation journey with detailed analytics that track your study patterns, topic coverage, and 
              performance metrics. The dashboard provides insights into which subjects need more attention, your improvement 
              over time, and helps you identify weak areas that require focused study. This data-driven approach ensures your 
              preparation is systematic and comprehensive.
            </motion.p>
          </motion.div>
        </div>
      </motion.section>

      {/* How to Use */}
      <motion.section 
        className="mb-12 sm:mb-16 md:mb-20 lg:mb-28"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-foreground text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8">
          How to Use the Platform
        </h2>
        
        <div className="space-y-6 sm:space-y-8 text-sm sm:text-base md:text-lg leading-relaxed">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-foreground text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                💬
              </motion.span>
              Starting a Conversation
            </h3>
            <p className="text-muted-foreground mb-3 sm:mb-4">
              Navigate to the chat interface by clicking on the "App" section from the main menu. Once there, you'll see 
              a text input field at the bottom of the screen. Simply type your question or topic in natural, conversational 
              language. You don't need to use specific keywords or formatting—the AI understands context and can interpret 
              your queries just as a human tutor would.
            </p>
            <p className="text-muted-foreground">
              For example, you can ask "Explain the causes of the War of Independence 1857" or "What are the main features 
              of Pakistan's foreign policy?" The more specific your question, the more targeted the response will be, but 
              the system is designed to handle both broad and specific queries effectively.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 className="text-foreground text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
              <motion.span
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                🤖
              </motion.span>
              Understanding Responses
            </h3>
            <p className="text-muted-foreground mb-3 sm:mb-4">
              The AI generates comprehensive responses that include historical context, multiple perspectives, relevant examples, 
              and analytical frameworks. Responses are structured to match CSS examination standards, focusing on depth of analysis 
              rather than superficial coverage. You'll receive information that's examination-relevant, properly referenced, and 
              suitable for inclusion in your essay answers.
            </p>
            <p className="text-muted-foreground">
              If a response doesn't fully address your question or if you need clarification, you can ask follow-up questions 
              in the same conversation thread. The AI maintains context throughout your session, allowing for a natural back-and-forth 
              dialogue that deepens your understanding.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h3 className="text-foreground text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
              <motion.span
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                📝
              </motion.span>
              Requesting Practice Materials
            </h3>
            <p className="text-muted-foreground">
              To practice specific topics, simply ask for questions or essay prompts. For instance, "Give me practice questions 
              on constitutional development in Pakistan" or "Suggest essay topics on contemporary international relations." 
              The system will generate relevant questions that test different aspects of your knowledge, from factual recall 
              to analytical thinking. You can then attempt these questions and ask for feedback on your approach or request 
              model answers for comparison.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Subject Coverage */}
      <motion.section 
        className="mb-12 sm:mb-16 md:mb-20 lg:mb-28"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-foreground text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8">
          Complete Subject Coverage
        </h2>
        
        <div className="space-y-6 sm:space-y-8 text-sm sm:text-base md:text-lg leading-relaxed">
          <motion.p 
            className="text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            InsightLLM provides comprehensive coverage of all subjects included in the CSS examination syllabus. This includes 
            the compulsory papers that every candidate must attempt, as well as support for optional subjects chosen based on 
            your academic background and interests. The platform's knowledge base is continuously updated to reflect current 
            affairs, recent developments, and evolving examination patterns.
          </motion.p>
          
          <div>
            <h3 className="text-foreground text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">
              Compulsory Subjects
            </h3>
            <motion.p 
              className="text-muted-foreground mb-3 sm:mb-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              For General Knowledge and Ability, the platform covers Pakistan Studies, geography, basic mathematics, English 
              grammar and comprehension, everyday science, and current affairs. In Current Affairs, you'll find detailed 
              discussions on national and international events, political developments, economic trends, and social issues 
              that are relevant to examination questions.
            </motion.p>
            <motion.p 
              className="text-muted-foreground mb-3 sm:mb-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Islamic Studies coverage includes the life of Prophet Muhammad (PBUH), the Quran and Hadith, Islamic history 
              and civilization, contributions of Muslim scholars, and contemporary issues in the Muslim world. Pakistan Affairs 
              encompasses constitutional and political development, foreign policy, economic challenges, social problems, and 
              governance issues.
            </motion.p>
            <motion.p 
              className="text-muted-foreground"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              For English (Précis and Composition), the platform provides guidance on essay writing techniques, précis writing 
              methods, comprehension strategies, grammar rules, and vocabulary development. You can practice with sample essays, 
              get feedback on your writing structure, and learn advanced composition techniques.
            </motion.p>
          </div>
          
          <div>
            <h3 className="text-foreground text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">
              Optional Subjects
            </h3>
            <motion.p 
              className="text-muted-foreground"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              The platform also supports various optional subjects including Political Science, International Relations, Public 
              Administration, Sociology, Psychology, Economics, and many others. Each optional subject receives the same depth 
              of coverage, with topic-specific questions, theoretical frameworks, and practical applications relevant to CSS 
              examination standards.
            </motion.p>
          </div>
        </div>
      </motion.section>
      
      {/* Study Strategies */}
      <motion.section 
        className="mb-20 sm:mb-28"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-foreground text-3xl sm:text-4xl font-bold mb-8">
          Effective Study Strategies
        </h2>
        
        <div className="space-y-8 text-base sm:text-lg leading-relaxed">
          <div>
            <h3 className="text-foreground text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2">
              <motion.span
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
              >
                📅
              </motion.span>
              Creating a Study Schedule
            </h3>
            <motion.p 
              className="text-muted-foreground"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Develop a systematic study plan that allocates specific time blocks for each subject. Prioritize subjects based 
              on your strengths and weaknesses, dedicating more time to challenging areas while maintaining proficiency in 
              subjects where you're already strong. Include regular review sessions to reinforce learned material and ensure 
              long-term retention. The key is consistency rather than intensity—studying regularly for moderate periods is more 
              effective than sporadic marathon sessions.
            </motion.p>
          </div>
          
          <div>
            <h3 className="text-foreground text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2">
              <motion.span
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                📰
              </motion.span>
              Staying Current with Affairs
            </h3>
            <motion.p 
              className="text-muted-foreground"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Make daily newspaper reading a non-negotiable habit. Focus on editorial sections, opinion pieces, and analytical 
              articles rather than just news reports. Maintain a current affairs journal where you note important events, their 
              causes, consequences, and multiple perspectives. Use InsightLLM to deepen your understanding of complex current 
              events by asking for background information, historical context, and analytical frameworks.
            </motion.p>
          </div>
          
          <div>
            <h3 className="text-foreground text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
              <motion.span
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ✍️
              </motion.span>
              Practice and Revision
            </h3>
            <motion.p 
              className="text-muted-foreground"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Regular practice with past papers and mock tests is essential for CSS success. Time yourself while attempting 
              questions to develop proper time management skills. After completing practice sessions, use the platform to verify 
              your answers, identify gaps in knowledge, and learn correct approaches to different question types. Focus on 
              improving your answer presentation, analytical depth, and writing clarity.
            </motion.p>
          </div>
          
          <div>
            <h3 className="text-foreground text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
              <motion.span
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                💡
              </motion.span>
              Conceptual Understanding
            </h3>
            <motion.p 
              className="text-muted-foreground"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Move beyond rote memorization to develop genuine understanding of concepts, theories, and interconnections between 
              different topics. When studying, always ask "why" and "how" questions. Use InsightLLM to explore topics from 
              multiple angles, understand different perspectives, and see how concepts apply to real-world situations. This 
              depth of understanding enables you to tackle diverse question types and write more insightful essays.
            </motion.p>
          </div>
        </div>
      </motion.section>

      {/* Example Questions */}
      <motion.section 
        className="mb-12 sm:mb-16 md:mb-20 lg:mb-28"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-foreground text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8">
          Sample Questions to Get Started
        </h2>
        
        <motion.p 
          className="text-muted-foreground text-sm sm:text-base md:text-lg leading-relaxed mb-6 sm:mb-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          To help you understand how to interact with the platform effectively, here are some example questions you can 
          ask across different subjects. These demonstrate the level of detail and specificity that works best with the AI:
        </motion.p>
        
        <div className="space-y-4 sm:space-y-6">
          <div className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 sm:pl-6 py-2">
            <p className="text-muted-foreground/70 text-xs sm:text-sm font-bold uppercase tracking-wider mb-2">
              Current Affairs
            </p>
            <p className="text-foreground text-sm sm:text-base md:text-lg leading-relaxed">
              "Analyze the recent developments in Pakistan-China Economic Corridor and discuss its implications for 
              Pakistan's economic growth and regional connectivity."
            </p>
          </div>
          
          <div className="border-l-4 border-green-500 dark:border-green-400 pl-4 sm:pl-6 py-2">
            <p className="text-muted-foreground/70 text-xs sm:text-sm font-bold uppercase tracking-wider mb-2">
              Pakistan Affairs
            </p>
            <p className="text-foreground text-sm sm:text-base md:text-lg leading-relaxed">
              "Discuss the significance of the 1973 Constitution of Pakistan and how it established the framework for 
              parliamentary democracy in the country."
            </p>
          </div>
          
          <div className="border-l-4 border-purple-500 dark:border-purple-400 pl-4 sm:pl-6 py-2">
            <p className="text-muted-foreground/70 text-xs sm:text-sm font-bold uppercase tracking-wider mb-2">
              Islamic Studies
            </p>
            <p className="text-foreground text-sm sm:text-base md:text-lg leading-relaxed">
              "Explain the concept of Ijtihad in Islamic jurisprudence and discuss its relevance in addressing contemporary 
              challenges faced by Muslim societies."
            </p>
          </div>
          
          <div className="border-l-4 border-orange-500 dark:border-orange-400 pl-4 sm:pl-6 py-2">
            <p className="text-muted-foreground/70 text-xs sm:text-sm font-bold uppercase tracking-wider mb-2">
              English Essay
            </p>
            <p className="text-foreground text-sm sm:text-base md:text-lg leading-relaxed">
              "Help me write an essay on 'Digital Pakistan: Opportunities and Challenges' covering technological infrastructure, 
              digital literacy, economic potential, and cybersecurity concerns."
            </p>
          </div>
        </div>
      </motion.section>

      {/* Support & Resources */}
      <motion.section 
        className="mb-12 sm:mb-16 md:mb-20 lg:mb-28"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-foreground text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8">
          Additional Support & Resources
        </h2>
        
        <div className="space-y-4 sm:space-y-6 text-sm sm:text-base md:text-lg leading-relaxed">
          <motion.p 
            className="text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            While InsightLLM is a powerful tool for CSS preparation, it works best when combined with traditional study methods. 
            Use the platform alongside standard reference books, coaching materials, and peer discussions. The AI complements 
            your existing study resources by providing instant clarification, alternative perspectives, and personalized guidance 
            that adapts to your specific needs.
          </motion.p>
          <motion.p 
            className="text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Remember that consistent effort, disciplined study habits, and genuine understanding are the keys to CSS success. 
            Use InsightLLM as your study companion to enhance your preparation, not as a replacement for thorough self-study. 
            The platform is designed to support your learning journey, helping you develop the analytical thinking, writing 
            skills, and subject knowledge required to excel in the CSS examination.
          </motion.p>
        </div>
      </motion.section>
      
      {/* CTA */}
      <motion.div 
        className="text-center py-8 sm:py-12 md:py-16 px-4"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 mb-4 sm:mb-6">
            <HiSparkles className="text-2xl sm:text-3xl text-white" />
          </div>
        </div>
        
        <h3 className="text-foreground text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
          Begin Your Preparation Today
        </h3>
        <motion.p 
          className="text-muted-foreground text-base sm:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Navigate to the app section and start asking questions. Whether you need clarification on a complex topic, 
          practice questions for a specific subject, or guidance on essay writing, InsightLLM is here to assist you 
          every step of the way.
        </motion.p>
        
        <motion.button 
          className="px-8 sm:px-10 py-3.5 sm:py-4 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 text-white font-bold rounded-lg sm:rounded-xl hover:shadow-2xl transition-all text-sm sm:text-base md:text-lg min-h-[48px] touch-manipulation active:scale-95"
          whileHover={{ scale: 1.05, y: -3 }}
          whileTap={{ scale: 0.95 }}
        >
          Go to Chat Interface
        </motion.button>
      </motion.div>
    </main>
  )
}
