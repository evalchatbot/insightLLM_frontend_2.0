"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import MarkdownRenderer from "@/components/chat-provider-components/MarkdownRenderer";
import insightZustand from "@/utils/insight-zustand";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createChat } from "@/actions/actions";
import { nanoid } from "nanoid";
import { useMeasure } from "react-use";
import { useUser } from "@clerk/nextjs";
import InputActions from "./input-actions";
import Link from "next/link";
import { MdImageSearch } from "react-icons/md";
import { IoMdClose } from "react-icons/io";

const InputPrompt = () => {
  const { user, isLoaded } = useUser();
  const { currChat, setCurrChat, setToast, customPrompt, setInputImgName, inputImgName, setMsgLoader, prevChat, msgLoader, optimisticResponse, setOptimisticResponse, setOptimisticPrompt, selectedGenre, autoSend, setAutoSend, conversationID } =
    insightZustand();
  const [inputImg, setInputImg] = useState<File | null>(null)

  const { chat } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inputRref, { height }] = useMeasure<HTMLTextAreaElement>();
  const chatID = chat as string; // Only use the actual chat ID from params
  const cancelRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateMsg = useCallback(async () => {
    if (!currChat.userPrompt?.trim() || !user) {
      return;
    }
    
    // If we're not in a chat route, navigate to a new chat page with auto-trigger
    if (!chat) {
      const newChatID = nanoid();
      // Set autoSend flag so message gets sent automatically after navigation
      setAutoSend(true);
      router.push(`/app/${newChatID}`);
      return;
    }
    
    const rawPrompt = currChat.userPrompt;
    const rawImage = inputImgName;
    
    // Build the question with context
    const contextualQuestion = `
      ${customPrompt.prompt ? customPrompt.prompt : 'Please provide a comprehensive and helpful response.'}
      
      Previous context:
      User: ${prevChat.userPrompt || 'No previous context'}
      Assistant: ${prevChat.llmResponse || 'No previous response'}
      
      Current question: ${rawPrompt}
    `;

    try {
      // Require genre selection before generation
      if (!selectedGenre || selectedGenre.trim() === "") {
        setToast('Please select a genre before sending your message.');
        return;
      }

      setMsgLoader(true);
      
      // Create abort controller for this request
      abortControllerRef.current = new AbortController();
      
      // No authentication needed - backend has auth removed
      const sessionId = `sess_${Date.now()}_${user?.id || 'anonymous'}`;
      
      // Prepare request body for ask-stream endpoint
      const requestBody = {
        user_id: user?.id || 'anonymous',
        session_id: sessionId,
        question: rawPrompt,
        genre: selectedGenre || "General", // Use selected genre from store
        conversation_id: conversationID,
        mode: "adaptive" // Options: "fast", "multi_step", "adaptive"
      };
      
      // Call the streaming endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/chatbot/ask-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }
          
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data.trim() === '') continue;
              
              try {
                const parsedData = JSON.parse(data);
                
                if (parsedData.type === 'chunk') {
                  // Update the response with streaming content
                  fullResponse = parsedData.full_content || fullResponse + parsedData.content;
                  setCurrChat("llmResponse", fullResponse);
                } else if (parsedData.type === 'complete') {
                  // Final response received
                  fullResponse = parsedData.answer;
                  setCurrChat("llmResponse", fullResponse);
                  break;
                } else if (parsedData.type === 'metadata') {
                  // Handle metadata if needed
                  console.log('Stream metadata:', parsedData);
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', data);
              }
            }
          }
          
          // Check if request was cancelled
          if (cancelRef.current) {
            fullResponse = "User has aborted the request";
            setCurrChat("llmResponse", fullResponse);
            break;
          }
        }
      }
      
      if (!fullResponse) {
        setToast('No response received from the API.');
        return;
      }
      
      // Set optimistic states
      setOptimisticPrompt(rawPrompt);
      setOptimisticResponse(fullResponse);
      setMsgLoader(false);
      
      // Create chat in database
      const chatResult = await createChat({
        chatID,
        userID: user?.id || 'anonymous',
        imgName: rawImage ?? undefined,
        userPrompt: rawPrompt,
        llmResponse: fullResponse,
      });
      
      // Only clear state after successful chat creation
      if (chatResult.success) {
        setTimeout(() => {
          setCurrChat("userPrompt", null);
          setCurrChat("llmResponse", null);
          setOptimisticResponse(null);
          setOptimisticPrompt(null);
        }, 100);
      } else {
        console.error('Failed to create chat:', chatResult.error);
        setToast('Failed to save chat. Please try again.');
      }
      
    } catch (error: any) {
      console.error("Error generating message:", error);
      
      if (error.name === 'AbortError') {
        setToast('Request was cancelled.');
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        setToast(`Failed to connect to API at ${process.env.NEXT_PUBLIC_API_BASE_URL}. Please check if the backend is running.`);
      } else if (error.message?.includes('HTTP error')) {
        setToast(`Backend API error: ${error.message}`);
      } else {
        setToast(`Error: ${error.message || 'Failed to get response'}`);
      }
      
      // Reset state on error
      setMsgLoader(false);
      setOptimisticResponse(null);
      setOptimisticPrompt(null);
    } finally {
      // Clean up temporary states
      setInputImg(null);
      setInputImgName(null);
      abortControllerRef.current = null;
    }
  }, [
    currChat.userPrompt,
    user,
    chat,
    prevChat,
    setCurrChat,
    setMsgLoader,
    router,
    customPrompt,
    inputImgName,
    setOptimisticPrompt,
    setOptimisticResponse,
    setInputImgName,
    setToast,
    selectedGenre
  ]);

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCurrChat("userPrompt", e.target.value);
    },
    [setCurrChat]
  );
  const handleCancel = useCallback(() => {
    cancelRef.current = true;
    
    // Abort the fetch request if it's in progress
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setOptimisticResponse("User has aborted the request");
    setMsgLoader(false);
  }, [setOptimisticResponse, setMsgLoader]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!user) { 
        setToast('Please sign in to use Insight LLM!');
        return;
      }
      
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        cancelRef.current = false;
        generateMsg();
      }
    },
    [generateMsg, user, setToast]
  );

  // Auto-trigger message generation when landing on a new chat page with a prompt
  useEffect(() => {
    if (autoSend && currChat.userPrompt?.trim() && !msgLoader && user && !optimisticResponse && isLoaded && chat) {
      // Small delay to ensure the page has loaded
      const timer = setTimeout(() => {
        cancelRef.current = false;
        setAutoSend(false); // Reset the flag
        generateMsg();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [currChat.userPrompt, msgLoader, user, optimisticResponse, isLoaded, autoSend, chat]); // Added autoSend and chat to deps

  // Note: User data is now accessed directly via useUser() hook instead of storing in Zustand

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target && event.target.files) {
      const file = event.target.files[0];
      setInputImg(file);
      setInputImgName(file.name);
    }
  };

  return (
    <div className=" flex-shrink-0 w-full md:px-10 px-5 pb-2 space-y-2 bg-background">
      {inputImgName &&
        <div className="max-w-4xl overflow-hidden w-full mx-auto">
          <div className="p-5 w-fit relative max-w-full overflow-hidden bg-card group rounded-t-3xl flex items-start gap-2">
            <MdImageSearch className="text-4xl" />
            <p className="text-lg font-semibold truncate"> {inputImgName}</p>
            <IoMdClose onClick={() => { setInputImgName(null); setInputImg(null) }} className="absolute top-1 right-1 text-2xl rounded-full cursor-pointer hover:opacity-100 hidden group-hover:block opacity-80 bg-accentGray/40 p-1" />
          </div>
        </div>
      }
      <div
        className={`w-full md:border-8 border-4 relative border-card max-w-4xl mx-auto min-h-16 md:rounded-[50px] rounded-2xl ${inputImgName && " !rounded-tl-none "} overflow-hidden flex gap-1 md:items-center md:justify-between md:flex-row flex-col`}
      >

        {msgLoader ? (
          <div className="flex-1 bg-transparent rounded-4xl p-2 pl-6 text-lg max-h-56 resize-none placeholder:text-muted-foreground overflow-y-auto">
            <MarkdownRenderer source={optimisticResponse || "_Loading..._"} partial={true} />
          </div>
        ) : (
          <textarea
            name="prompt"
            ref={inputRref}
            disabled={msgLoader}
            placeholder={customPrompt.placeholder ? customPrompt.placeholder : "Enter a prompt here"}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            value={currChat.userPrompt || ""}
            className={`flex-1 bg-transparent rounded-4xl p-2 pl-6 outline-none text-lg max-h-56 resize-none placeholder:text-muted-foreground`}
          />
        )}
        <InputActions handleCancel={handleCancel} handleImageUpload={handleImageUpload} generateMsg={generateMsg} />

      </div>
      <p className="text-xs font-light opacity-80 text-center">Insight LLM may display inaccurate info, including about people, so double-check its responses. <Link className="underline" href="/">Your privacy & AI Apps</Link></p>
    </div>
  );
};

export default InputPrompt;

