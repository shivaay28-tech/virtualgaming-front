import React, { useEffect, useRef, useState } from "react";
import { Send, MessageSquare } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { useGame } from "../context/GameContext";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export function ChatPanel() {
  const { messages, online } = useGame();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const send = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      await api.post("/chat/send", { text: t });
      setText("");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Could not send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.02] flex flex-col" data-testid="chat-panel">
      <button
        className="w-full px-4 py-3 flex items-center justify-between"
        onClick={() => setOpen((v) => !v)}
        data-testid="chat-toggle"
      >
        <span className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-white/60">
          <MessageSquare size={12} /> Table Chat
        </span>
        <span className="text-[10px] tracking-[0.2em] uppercase text-white/40 font-mono-data">
          {online} online
        </span>
      </button>
      {open && (
        <>
          <div
            ref={scrollRef}
            className="px-4 py-2 max-h-72 overflow-y-auto space-y-2 border-t border-white/10"
            data-testid="chat-messages"
          >
            {messages.length === 0 && (
              <div className="text-xs text-white/40 py-4 text-center">Say hi to the table.</div>
            )}
            {messages.map((m) => (
              <ChatLine key={m.id} m={m} mine={user?.id && m.user_id === user.id} />
            ))}
          </div>
          <form onSubmit={send} className="border-t border-white/10 p-2 flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={240}
              placeholder={user ? "Message the table…" : "Sign in to chat"}
              disabled={!user || sending}
              data-testid="chat-input"
              className="flex-1 bg-white/[0.04] border border-white/10 rounded-sm px-3 py-2 text-sm text-white outline-none focus:border-[color:var(--theme-primary)] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!user || sending || !text.trim()}
              data-testid="chat-send"
              className="px-3 py-2 rounded-sm bg-[color:var(--theme-primary)] text-black disabled:opacity-40"
              aria-label="Send"
            >
              <Send size={14} />
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function ChatLine({ m, mine }) {
  if (m.system) {
    return (
      <div className="text-[11px] text-[color:var(--theme-primary)] italic" data-testid="chat-system">
        — {m.text}
      </div>
    );
  }
  const isAdmin = m.role === "admin";
  return (
    <div className="text-xs leading-snug" data-testid={`chat-line-${m.id}`}>
      <span
        className={`font-medium ${isAdmin ? "text-red-400" : mine ? "text-[color:var(--theme-primary)]" : "text-white/80"}`}
      >
        {m.name}
        {isAdmin && <span className="ml-1 text-[9px] tracking-widest uppercase opacity-80">admin</span>}:
      </span>{" "}
      <span className="text-white/85 break-words">{m.text}</span>
    </div>
  );
}
