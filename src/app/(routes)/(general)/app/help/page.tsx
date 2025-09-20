'use client'
import React from 'react'
import { FaBookOpen, FaGraduationCap, FaLightbulb, FaBrain, FaQuestionCircle, FaRocket } from 'react-icons/fa'
import { IoMdCheckmarkCircle } from 'react-icons/io'
import { MdSchedule, MdTipsAndUpdates } from 'react-icons/md'

const HelpPage = () => {
  const features = [
    {
      icon: <FaBookOpen className="text-2xl text-blue-500" />,
      title: "CSS Exam Preparation",
      description: "Get comprehensive help for Central Superior Services (CSS) examination preparation in Pakistan with AI-powered study assistance."
    },
    {
      icon: <FaGraduationCap className="text-2xl text-green-500" />,
      title: "Subject Coverage",
      description: "Access detailed guidance on all CSS subjects including General Knowledge, Current Affairs, Islamic Studies, Pakistan Affairs, English, and optional subjects."
    },
    {
      icon: <FaLightbulb className="text-2xl text-yellow-500" />,
      title: "Smart Study Tips",
      description: "Receive personalized study strategies, time management techniques, and effective revision methods tailored for CSS success."
    },
    {
      icon: <FaBrain className="text-2xl text-purple-500" />,
      title: "AI-Powered Learning",
      description: "Leverage artificial intelligence to get instant answers, explanations, and practice questions for CSS preparation."
    }
  ]

  const examTopics = [
    "General Knowledge & Ability",
    "Current Affairs",
    "Islamic Studies / Comparative Study of Major Religions",
    "Pakistan Affairs",
    "English (Précis & Composition)",
    "Optional Subject 1",
    "Optional Subject 2",
    "Optional Subject 3"
  ]

  const studyTips = [
    {
      icon: <MdSchedule className="text-lg text-blue-500" />,
      tip: "Create a structured study schedule covering all subjects systematically"
    },
    {
      icon: <MdTipsAndUpdates className="text-lg text-green-500" />,
      tip: "Stay updated with current affairs through newspapers and reliable sources"
    },
    {
      icon: <FaQuestionCircle className="text-lg text-orange-500" />,
      tip: "Practice past papers and mock tests regularly to improve time management"
    },
    {
      icon: <FaRocket className="text-lg text-red-500" />,
      tip: "Focus on conceptual understanding rather than rote memorization"
    }
  ]

  return (
    <main className='w-full max-w-6xl mx-auto flex flex-col p-5 space-y-8'>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className='text-animation inline-block bg-gradient-to-r from-[#4E82EE] to-[#D96570] bg-clip-text text-4xl text-transparent font-bold mb-4'>
          CSS Exam Preparation Help
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Welcome to Insight LLM - your AI-powered companion for Central Superior Services (CSS) examination preparation in Pakistan. 
          Get comprehensive study assistance, practice questions, and expert guidance for your CSS journey.
        </p>
      </div>

      {/* Features Section */}
      <section className="grid md:grid-cols-2 gap-6 mb-8">
        {features.map((feature, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {feature.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* CSS Exam Subjects */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <FaGraduationCap className="mr-3 text-blue-500" />
          CSS Examination Subjects
        </h2>
        <div className="grid md:grid-cols-2 gap-3">
          {examTopics.map((topic, index) => (
            <div key={index} className="flex items-center space-x-3">
              <IoMdCheckmarkCircle className="text-green-500 text-lg" />
              <span className="text-gray-700 dark:text-gray-300">{topic}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Study Tips */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <FaLightbulb className="mr-3 text-yellow-500" />
          Study Tips for CSS Success
        </h2>
        <div className="space-y-4">
          {studyTips.map((item, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              {item.icon}
              <p className="text-gray-700 dark:text-gray-300">{item.tip}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How to Use */}
      <section className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <FaBrain className="mr-3 text-purple-500" />
          How to Use Insight LLM for CSS Preparation
        </h2>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Ask Questions:</strong> Type your CSS-related questions in the chat interface. Ask about any subject, concept, or topic you need help with.
            </p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Request Practice Questions:</strong> Ask for mock questions, essay topics, or practice tests for any CSS subject.
            </p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Get Study Plans:</strong> Request customized study schedules and preparation strategies based on your timeline and strengths.
            </p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</span>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Review and Analyze:</strong> Get detailed explanations, essay feedback, and improvement suggestions for your preparation.
            </p>
          </div>
        </div>
      </section>

      {/* Sample Prompts */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold mb-4 text-center">Sample Questions to Get Started</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Affairs</p>
            <p className="text-gray-800 dark:text-gray-200 italic">"What are the recent developments in Pakistan's foreign policy with China?"</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Pakistan Affairs</p>
            <p className="text-gray-800 dark:text-gray-200 italic">"Explain the significance of the 1973 Constitution of Pakistan."</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Islamic Studies</p>
            <p className="text-gray-800 dark:text-gray-200 italic">"Discuss the concept of Ijtihad in Islamic jurisprudence."</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">English Essay</p>
            <p className="text-gray-800 dark:text-gray-200 italic">"Help me write an essay on 'Digital Pakistan: Opportunities and Challenges'."</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="text-center text-gray-600 dark:text-gray-400 pt-8 border-t border-gray-200 dark:border-gray-600">
        <p>Start your conversation by asking any CSS-related question. Good luck with your preparation!</p>
      </div>
    </main>
  )
}

export default HelpPage