"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Mic, Square, Loader2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

// Using a static ID for demo. In production, use authentication.
const USER_ID = "demo_user_123";


const TEXT_WEBHOOK = "https://n8n.applyforge.cloud/webhook/chat/send";
const AUDIO_WEBHOOK = "https://n8n.applyforge.cloud/webhook/chat/audio";

export default function ChatInterface() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    []
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // POLLING: Check for new messages from the Queue every 2 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      // Note: We need a way to 'fetch' the answer.
      // Since your workflow pushes to Redis, the frontend usually needs an API to 'pop' or 'read' that Redis key.
      // For this assignment, we will simulate the "Wait" behavior by relying on the immediate HTTP response
      // if your N8N workflow is set to "Respond to Webhook".
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(TEXT_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: USER_ID, message: userMsg.content }),
      });

      const data = await response.json();
      // Assuming n8n returns { output: "AI Response" }
      const aiResponse =
        typeof data === "string" ? data : data.output || JSON.stringify(data);

      setMessages((prev) => [...prev, { role: "ai", content: aiResponse }]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "Error connecting to AI agent." },
      ]);
    } finally {
      setIsLoading(false);
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
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
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
    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.wav");
    formData.append("userId", USER_ID);

    try {
      const response = await fetch(AUDIO_WEBHOOK, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      const aiResponse =
        typeof data === "string" ? data : data.output || "Audio processed";
      setMessages((prev) => [...prev, { role: "ai", content: aiResponse }]);
    } catch (error) {
      console.error("Error uploading audio:", error);
    } finally {
      setIsLoading(false);
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
              <div
                className={`p-3 rounded-lg max-w-[80%] ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-900"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="text-sm text-gray-500 animate-pulse">
              AI is typing...
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
          disabled={isLoading}
        />
        <Button
          variant={isRecording ? "destructive" : "outline"}
          size="icon"
          onClick={isRecording ? stopRecording : startRecording}
        >
          {isRecording ? (
            <Square className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </Button>
        <Button onClick={sendMessage} disabled={isLoading || !input}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
