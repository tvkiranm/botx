"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import Input from "@/components/ui/input";

type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
};

type ChatbotConfig = {
  name: string;
  theme: {
    primaryColor: string;
  };
  welcomeMessage: string;
};

const DEFAULT_CONFIG: ChatbotConfig = {
  name: "AICore Chat",
  theme: { primaryColor: "#111827" },
  welcomeMessage: "Hi! Ask me anything about your docs.",
};

export default function PublicChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "bot", text: DEFAULT_CONFIG.welcomeMessage },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [orgLoading, setOrgLoading] = useState(false);
  const [config, setConfig] = useState<ChatbotConfig>(DEFAULT_CONFIG);

  const primaryColor = useMemo(
    () => config.theme?.primaryColor || DEFAULT_CONFIG.theme.primaryColor,
    [config.theme]
  );

  async function fetchConfig(key: string) {
    if (!key) return;
    try {
      const response = await fetch(`/api/chatbot?key=${encodeURIComponent(key)}`);
      if (!response.ok) {
        throw new Error("Failed to load chatbot configuration.");
      }
      const data = (await response.json()) as ChatbotConfig;
      setConfig({
        name: data.name || DEFAULT_CONFIG.name,
        theme: { primaryColor: data.theme?.primaryColor || DEFAULT_CONFIG.theme.primaryColor },
        welcomeMessage: data.welcomeMessage || DEFAULT_CONFIG.welcomeMessage,
      });
      setMessages([
        { id: "welcome", role: "bot", text: data.welcomeMessage || DEFAULT_CONFIG.welcomeMessage },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load config.");
    }
  }

  async function handleCreateOrganization() {
    if (!orgName.trim() || orgLoading) return;
    setOrgLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName.trim() }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to create organization.");
      }

      const data = (await response.json()) as {
        organization?: { apiKey?: string };
      };

      const key = data.organization?.apiKey || "";
      setApiKey(key);
      if (key) {
        await fetchConfig(key);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization.");
    } finally {
      setOrgLoading(false);
    }
  }

  useEffect(() => {
    if (apiKey) {
      fetchConfig(apiKey);
    }
  }, [apiKey]);

  async function handleSend() {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `m${messages.length + 1}`,
      role: "user",
      text: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      if (!apiKey) {
        throw new Error("Create or enter an organization API key first.");
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, message: userMessage.text }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response.");
      }

      const data = (await response.json()) as { reply?: string };
      const replyText = data.reply ?? "No response yet.";

      setMessages((prev) => [
        ...prev,
        { id: `m${prev.length + 1}`, role: "bot", text: replyText },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-10">
      <div>
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
          Public Chatbot
        </p>
        <h1 className="text-2xl font-semibold">{config.name}</h1>
      </div>

      <Card className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={orgName}
            onChange={(event) => setOrgName(event.target.value)}
            placeholder="Organization name"
          />
          <Button onClick={handleCreateOrganization} disabled={orgLoading}>
            {orgLoading ? "Creating..." : "Create Organization"}
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value.trim())}
            placeholder="Organization API key"
          />
          <Button onClick={() => fetchConfig(apiKey)} disabled={!apiKey}>
            Load Config
          </Button>
        </div>

        <div className="text-xs text-[var(--muted)]">
          Use the API key above to load chatbot config and send messages.
        </div>
      </Card>

      <Card className="flex flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  message.role === "user"
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "bg-[var(--accent)] text-[var(--foreground)]"
                }`}
                style={
                  message.role === "user" ? { backgroundColor: primaryColor } : undefined
                }
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

        {error && (
          <div className="mx-4 mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="border-t border-[var(--card-border)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about your docs..."
            />
            <Button onClick={handleSend} className="w-full sm:w-auto" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
