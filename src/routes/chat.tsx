import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Send, Copy, Check, Sparkles, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { answerQuestion, SUGGESTED_QUESTIONS, type ChatMessage } from "@/lib/chat";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "AI Assistant — Forecaster AI" },
      { name: "description", content: "Chat with an AI assistant about your inventory, sales, and forecasts." },
    ],
  }),
  component: ChatPage,
});

const STORAGE_KEY = "forecaster-chat-v1";

// Very small markdown → HTML for the assistant messages.
// Supports headings (###), bold (**), inline code, lists, and paragraphs.
function renderMarkdown(md: string): string {
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
  const lines = md.split("\n");
  let html = "";
  let inList = false;
  for (const raw of lines) {
    const line = raw;
    if (/^\s*-\s+/.test(line)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inline(esc(line.replace(/^\s*-\s+/, "")))}</li>`;
      continue;
    }
    if (inList) { html += "</ul>"; inList = false; }
    if (/^### /.test(line)) html += `<h3>${inline(esc(line.replace(/^### /, "")))}</h3>`;
    else if (/^## /.test(line)) html += `<h2>${inline(esc(line.replace(/^## /, "")))}</h2>`;
    else if (/^> /.test(line)) html += `<blockquote>${inline(esc(line.replace(/^> /, "")))}</blockquote>`;
    else if (line.trim() === "") html += "";
    else html += `<p>${inline(esc(line))}</p>`;
  }
  if (inList) html += "</ul>";
  return html;
}

function inline(s: string) {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function loadMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Hydrate on mount to avoid SSR mismatch.
  useEffect(() => { setMessages(loadMessages()); }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: trimmed, createdAt: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      const reply = answerQuestion(trimmed);
      const asstMsg: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: reply, createdAt: Date.now() };
      setMessages((m) => [...m, asstMsg]);
      setThinking(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }, 550 + Math.random() * 500);
  };

  const copy = async (msg: ChatMessage) => {
    await navigator.clipboard.writeText(msg.content);
    setCopiedId(msg.id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 1500);
  };

  const clear = () => {
    setMessages([]);
    toast.success("Conversation cleared");
  };

  const suggestions = useMemo(() => SUGGESTED_QUESTIONS, []);

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col gap-4">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">AI Assistant</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ask questions about your inventory, sales, and forecasts.</p>
        </div>
        <Button variant="outline" size="sm" onClick={clear} disabled={messages.length === 0}>
          <Trash2 className="mr-2 h-4 w-4" /> New conversation
        </Button>
      </header>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 && (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-4 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-primary text-white shadow-[var(--shadow-elegant)]">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <div className="text-lg font-semibold">How can I help with your inventory today?</div>
                <p className="mt-1 text-sm text-muted-foreground">Try one of the suggestions below or ask your own question.</p>
              </div>
              <div className="flex max-w-xl flex-wrap justify-center gap-2 pt-2">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => send(s)}
                    className="rounded-full border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-accent hover:text-accent-foreground">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex gap-3"}>
              {m.role === "assistant" && (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full gradient-primary text-white">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div className={m.role === "user" ? "max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-primary-foreground" : "min-w-0 max-w-[85%]"}>
                {m.role === "user" ? (
                  <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                ) : (
                  <>
                    <div className="prose-chat text-sm text-foreground" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                    <div className="mt-1.5">
                      <button onClick={() => copy(m)} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                        {copiedId === m.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedId === m.id ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </>
                )}
              </div>
              {m.role === "user" && (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {thinking && (
            <div className="flex gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full gradient-primary text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl border bg-card px-3 py-2">
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
              </div>
            </div>
          )}
        </div>

        <CardContent className="border-t bg-background/60 p-3 sm:p-4">
          {messages.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {suggestions.slice(0, 3).map((s) => (
                <Badge key={s} variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => send(s)}>
                  {s}
                </Badge>
              ))}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
              }}
              placeholder="Ask about forecasts, reorders, best sellers…"
              rows={1}
              className="min-h-11 resize-none"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || thinking} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-2 text-[11px] text-muted-foreground">
            AI can be inaccurate. Verify important actions in the Inventory and Forecast pages.
          </p>
        </CardContent>
      </Card>

      <style>{`
        .prose-chat h2, .prose-chat h3 { font-weight: 600; margin: 0.25rem 0 0.4rem; }
        .prose-chat h3 { font-size: 0.95rem; }
        .prose-chat p { margin: 0.35rem 0; line-height: 1.55; }
        .prose-chat ul { margin: 0.4rem 0; padding-left: 1.1rem; list-style: disc; }
        .prose-chat li { margin: 0.15rem 0; }
        .prose-chat blockquote { border-left: 3px solid var(--border); padding-left: 0.6rem; color: var(--muted-foreground); font-style: italic; margin: 0.5rem 0; }
        .prose-chat code { background: var(--muted); padding: 0 0.3rem; border-radius: 4px; font-size: 0.85em; }
        .prose-chat strong { font-weight: 600; }
      `}</style>
    </div>
  );
}
