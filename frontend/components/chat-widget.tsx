"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { ChatMessageResponseDto, ErrorDto } from "@insurance/contracts";

interface Message {
  role: "user" | "assistant";
  text: string;
}
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi! Ask me about insurance premiums, payment frequencies, application steps, or your application status.",
    },
  ]);
  const [busy, setBusy] = useState(false);
  async function send(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    setMessages((current) => [...current, { role: "user", text: message }]);
    setInput("");
    setBusy(true);
    try {
      const response = await fetch("/api/v1/chat/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!response.ok) {
        const error = (await response
          .json()
          .catch(() => null)) as ErrorDto | null;
        throw new Error(error?.error.message ?? "Chat request failed.");
      }
      const result = (await response.json()) as ChatMessageResponseDto;
      setMessages((current) => [
        ...current,
        { role: "assistant", text: result.answer },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text:
            error instanceof Error
              ? error.message
              : "The assistant is temporarily unavailable.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open ? (
        <section
          role="dialog"
          aria-label="Insurance assistant"
          className="mb-3 flex h-[28rem] w-[min(22rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between bg-blue-800 px-4 py-3 text-white">
            <div>
              <h2 className="font-bold">Insurance assistant</h2>
              <p className="text-xs text-blue-100">
                Informational and read-only
              </p>
            </div>
            <button
              type="button"
              aria-label="Close assistant"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-xl"
            >
              ×
            </button>
          </header>
          <div
            aria-live="polite"
            className="flex-1 space-y-3 overflow-y-auto p-4"
          >
            {messages.map((message, index) => (
              <p
                key={index}
                className={
                  message.role === "user"
                    ? "ml-8 rounded-xl bg-blue-700 p-3 text-sm text-white"
                    : "mr-8 rounded-xl bg-slate-100 p-3 text-sm text-slate-800"
                }
              >
                {message.text}
              </p>
            ))}
            {busy ? (
              <p className="mr-8 rounded-xl bg-slate-100 p-3 text-sm text-slate-500">
                Thinking…
              </p>
            ) : null}
          </div>
          <form
            onSubmit={(event) => void send(event)}
            className="border-t border-slate-200 p-3"
          >
            <label htmlFor="chat-message" className="sr-only">
              Message
            </label>
            <div className="flex gap-2">
              <input
                id="chat-message"
                maxLength={500}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask a question"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                disabled={busy || !input.trim()}
                className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </form>
        </section>
      ) : null}
      <button
        type="button"
        aria-expanded={open}
        aria-label="Open insurance assistant"
        onClick={() => setOpen((value) => !value)}
        className="ml-auto block rounded-full bg-blue-800 px-5 py-3 font-semibold text-white shadow-lg"
      >
        {open ? "Close" : "Chat"}
      </button>
    </div>
  );
}
