"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Mic, Square, Loader2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

// ⚠️ Ensure this matches the User ID you use in your n8n testing
const USER_ID = "demo_user_123";

// ⚠️ YOUR N8N URLS (Production URLs)
const TEXT_WEBHOOK = "https://n8n.applyforge.cloud/webhook/chat/send";
const AUDIO_WEBHOOK = "https://n8n.applyforge.cloud/webhook/chat/audio";
const UPDATES_WEBHOOK = "https://n8n.applyforge.cloud/webhook/chat/updates";

export default function ChatInterface() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  // isProcessing controls the "Thinking" bubble, but NOT the input field
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const lastMessageRef = useRef<string | null>(null); // To prevent duplicates

  // Helper to safely add messages without duplicates
  const addAiMessage = (content: string) => {
    if (!content) return;
    if (lastMessageRef.current === content) return; // Prevent duplicates

    setMessages((prev) => [...prev, { role: "ai", content }]);
    lastMessageRef.current = content;
    setIsProcessing(false); // Stop thinking animation
  };

  // 🔄 POLLING EFFECT: Checks for Reminders or Missed Answers
  useEffect(() => {
    const pollForUpdates = async () => {
      try {
        const response = await fetch(`${UPDATES_WEBHOOK}?userId=${USER_ID}`);
        if (!response.ok) return;

        const data = await response.json();
        
        // If the polling loop finds a message, add it
        if (data && data.output) {
          addAiMessage(data.output);
        }
      } catch (e) {
        // Silently fail on network errors
      }
    };

    // Run every 2 seconds
    const interval = setInterval(pollForUpdates, 2000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsProcessing(true); 

    try {
      // 1. Send the message
      const response = await fetch(TEXT_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: USER_ID, message: userMsg.content }),
      });

      // 2. CHECK THE RESPONSE! (This was missing in the broken code)
      // If the Ingestion workflow waits and returns the answer, we catch it here.
      const data = await response.json();
      const aiResponse = typeof data === "string" ? data : data.output;

      if (aiResponse) {
        addAiMessage(aiResponse);
      }
      
    } catch (error) {
      console.error("Error:", error);
      // Don't stop processing here, the polling loop might still catch it later
    }
  };

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
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        await sendAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.wav");
    formData.append("userId", USER_ID);

    try {
      const response = await fetch(AUDIO_WEBHOOK, {
        method: "POST",
        body: formData,
      });

      // Also check immediate response for Audio
      const data = await response.json();
      const aiResponse = typeof data === "string" ? data : data.output;
      
      if (aiResponse) {
        addAiMessage(aiResponse);
      }

    } catch (error) {
      console.error("Error uploading audio:", error);
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto h-[600px] flex flex-col p-4 shadow-xl mt-10">
      <div className="mb-4 flex justify-between items-center border-b pb-2">
        <span className="font-bold text-xl">n8n AI Agent</span>
        <Link href="/analytics">
          <Button variant="ghost" size="sm">
            <BarChart3 className="w-4 h-4 mr-2" /> Analytics
          </Button>
        </Link>
      </div>

      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div className="flex items-start gap-2 max-w-[80%]">
                {msg.role === "ai" && (
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="/bot-avatar.png" />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`p-3 rounded-lg ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-900"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-slate-100 p-3 rounded-lg flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="mt-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          disabled={false}
        />
        <Button
          variant={isRecording ? "destructive" : "outline"}
          size="icon"
          onClick={isRecording ? stopRecording : startRecording}
        >
          {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </Button>
        <Button onClick={sendMessage} disabled={!input}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}