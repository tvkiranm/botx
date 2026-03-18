"use client";

import { useState } from "react";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import Input from "@/components/ui/input";

type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
};

const initialMessages: Message[] = [
  { id: "m1", role: "bot", text: "Hi! I'm the AICore assistant. How can I help?" },
  { id: "m2", role: "user", text: "Show me the latest onboarding flow." },
  { id: "m3", role: "bot", text: "Sure - I can walk you through that. Want the sales or support flow?" },
];

export default function PreviewPage() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleSend() {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `m${messages.length + 1}`,
      role: "user",
      text: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Placeholder: Replace with streaming response call
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `m${prev.length + 1}`,
          role: "bot",
          text: "Here's a quick overview: invite team -> connect data -> publish bot -> monitor chats.",
        },
      ]);
      setIsLoading(false);
    }, 1000);
  }

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
          Live Demo
        </p>
        <h1 className="text-2xl font-semibold">Chatbot Preview</h1>
      </div>

      <Card className="flex h-full flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  message.role === "user"
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "bg-[var(--accent)] text-[var(--foreground)]"
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--muted)]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:300ms]" />
              <span>Assistant is typing...</span>
            </div>
          )}
        </div>

        <div className="border-t border-[var(--card-border)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask a question or run a test prompt"
            />
            <Button onClick={handleSend} className="w-full sm:w-auto">
              Send
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
