"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Mic,
  Square,
  Loader2,
  BarChart3,
  Bot,
  User,
  Play,
  X,
  StopCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";

// ⚠️ Ensure this matches the User ID you use in your n8n testing
const USER_ID = "demo_user_123";

// ⚠️ YOUR N8N URLS
const TEXT_WEBHOOK = "https://n8n.applyforge.cloud/webhook/chat/send";
const AUDIO_WEBHOOK = "https://n8n.applyforge.cloud/webhook/chat/audio";
const UPDATES_WEBHOOK = "https://n8n.applyforge.cloud/webhook/chat/updates";

interface Message {
  role: string;
  content: string;
  type: "text" | "audio";
  audioUrl?: string;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- 1. RECORDING LOGIC (With Cancel) ---

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        // If chunks are empty, it means we cancelled
        if (audioChunksRef.current.length === 0) return;

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Add Audio Bubble to Chat
        const userMsg: Message = {
          role: "user",
          content: "Audio Message",
          type: "audio",
          audioUrl: audioUrl,
        };
        setMessages((prev) => [...prev, userMsg]);

        // Send
        await sendAudioToWebhook(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Clear chunks so onstop knows to ignore
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioToWebhook = async (audioBlob: Blob) => {
    setIsProcessing(true);
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.wav");
    formData.append("userId", USER_ID);

    try {
      const response = await fetch(AUDIO_WEBHOOK, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      const aiResponse = typeof data === "string" ? data : data.output;
      if (aiResponse) addAiMessage(aiResponse);
    } catch (error) {
      console.error("Error uploading audio:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 2. TEXT LOGIC (With Stop Generation) ---

  const addAiMessage = (content: string) => {
    if (!content) return;
    if (lastMessageRef.current === content) return;
    setMessages((prev) => [...prev, { role: "ai", content, type: "text" }]);
    lastMessageRef.current = content;
    setIsProcessing(false);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Setup Abort Controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMsg: Message = { role: "user", content: input, type: "text" };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsProcessing(true);

    try {
      const response = await fetch(TEXT_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: USER_ID, message: userMsg.content }),
        signal: controller.signal, // Bind signal
      });
      const data = await response.json();
      const aiResponse = typeof data === "string" ? data : data.output;
      if (aiResponse) addAiMessage(aiResponse);
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Request aborted");
      } else {
        console.error("Error:", error);
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsProcessing(false);
    }
  };

  // --- 3. SCROLL & POLL ---

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  useEffect(() => {
    const pollForUpdates = async () => {
      try {
        const response = await fetch(`${UPDATES_WEBHOOK}?userId=${USER_ID}`);
        if (!response.ok) return;
        const data = await response.json();
        if (data && data.output) addAiMessage(data.output);
      } catch (e) {
        /* Silent fail */
      }
    };
    const interval = setInterval(pollForUpdates, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-50 p-4 md:p-6 font-sans">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] border border-slate-100 relative">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 border border-indigo-200">
                <Bot size={22} strokeWidth={2.5} />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse"></span>
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-lg leading-tight">
                Assistant
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Always active
              </p>
            </div>
          </div>
          <Link href="/analytics">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-indigo-600 rounded-full"
            >
              <BarChart3 className="w-5 h-5" />
            </Button>
          </Link>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-6 scroll-smooth">
          <div className="space-y-6 pb-4 max-w-3xl mx-auto">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 opacity-50">
                <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center rotate-12">
                  <Bot className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700">
                  How can I help you?
                </h3>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex w-full ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                } animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`flex items-end gap-3 max-w-[85%] md:max-w-[70%]`}
                >
                  {msg.role === "ai" && (
                    <Avatar className="w-8 h-8 shadow-sm border border-white hidden md:block">
                      <AvatarImage src="/bot-avatar.png" />
                      <AvatarFallback className="bg-indigo-600 text-white text-xs">
                        AI
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className="flex flex-col gap-1">
                    <div
                      className={`px-5 py-3.5 text-sm md:text-base shadow-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-2xl rounded-br-none"
                          : "bg-white text-slate-700 border border-slate-100 rounded-2xl rounded-bl-none"
                      }`}
                    >
                      {msg.type === "audio" && msg.audioUrl ? (
                        <div className="flex items-center gap-3 min-w-[220px]">
                          {/* Visual Play Icon for User Clarity */}
                          <div className="p-2 bg-white/20 rounded-full shrink-0">
                            <Play className="w-4 h-4 fill-current" />
                          </div>
                          {/* Native Player */}
                          <div className="w-full">
                            <audio
                              controls
                              src={msg.audioUrl}
                              className="w-full h-8 opacity-90 brightness-110 contrast-200"
                              style={{ filter: "invert(1) opacity(0.8)" }}
                            />
                          </div>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>

                  {msg.role === "user" && (
                    <Avatar className="w-8 h-8 shadow-sm border border-white hidden md:block">
                      <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">
                        <User size={14} />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex justify-start w-full animate-in fade-in duration-300">
                <div className="flex items-end gap-3">
                  <Avatar className="w-8 h-8 hidden md:block">
                    <AvatarFallback className="bg-indigo-600 text-white text-xs">
                      AI
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    <span className="text-sm text-slate-500 font-medium">
                      Thinking...
                    </span>
                    {/* STOP BUTTON FOR TEXT */}
                    <button
                      onClick={stopGeneration}
                      className="text-slate-400 hover:text-red-500 transition-colors ml-2"
                      title="Stop generating"
                    >
                      <StopCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-white/90 backdrop-blur-lg border-t border-slate-100 sticky bottom-0 z-20">
          <div className="max-w-3xl mx-auto relative flex items-center gap-3">
            <div
              className={`flex-1 flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-full border transition-all shadow-inner ${
                isRecording
                  ? "ring-2 ring-red-200 border-red-300 bg-red-50"
                  : "border-slate-200 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300"
              }`}
            >
              {/* MICROPHONE / CANCEL BUTTON */}
              {isRecording ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full w-9 h-9 bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                  onClick={cancelRecording}
                  title="Cancel Recording"
                >
                  <X className="w-5 h-5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full w-9 h-9 text-slate-500 hover:text-indigo-600 hover:bg-white hover:shadow-sm transition-all"
                  onClick={startRecording}
                  title="Start Recording"
                >
                  <Mic className="w-5 h-5" />
                </Button>
              )}

              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder={
                  isRecording ? "🔴 Recording audio..." : "Message..."
                }
                disabled={isRecording}
                className={`flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 text-slate-800 placeholder:text-slate-400 h-10 px-2 ${
                  isRecording ? "italic text-red-500" : ""
                }`}
              />

              {/* SEND / STOP BUTTON */}
              {isRecording ? (
                <Button
                  onClick={stopRecording}
                  size="icon"
                  className="rounded-full w-9 h-9 bg-red-500 hover:bg-red-600 text-white shadow-md animate-pulse"
                  title="Stop & Send"
                >
                  <Square className="w-3 h-3 fill-current" />
                </Button>
              ) : (
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  size="icon"
                  className={`rounded-full w-9 h-9 transition-all ${
                    input.trim()
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md scale-100"
                      : "bg-slate-200 text-slate-400 scale-90"
                  }`}
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </Button>
              )}
            </div>
          </div>
          <div className="text-center mt-2">
            <p className="text-[10px] text-slate-400 font-medium">
              Powered by n8n & Gemini
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
