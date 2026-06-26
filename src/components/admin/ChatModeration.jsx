import React, { useCallback, useEffect, useState } from "react";
import { Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../../lib/api";
import { IconBtn } from "./shared";

const PAGE = 100;

export function ChatModeration() {
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  const load = useCallback(async (off) => {
    try {
      const { data } = await api.get(`/admin/chat?limit=${PAGE}&offset=${off}`);
      setMessages(data.messages || []);
      setTotal(data.total || 0);
      setOffset(off);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    }
  }, []);

  useEffect(() => {
    load(0);
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => load(offset), 5000);
    return () => clearInterval(id);
  }, [load, offset]);

  const remove = async (id) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await api.delete(`/admin/chat/${id}`);
      toast.success("Message deleted");
      load(offset);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center text-xs text-white/40">
        <span>{total} messages total</span>
        <button onClick={() => load(offset)} className="px-2 py-1 border border-white/10 rounded-sm flex items-center gap-1 hover:bg-white/[0.04]">
          <RefreshCw size={12} /> Refresh
        </button>
        <span className="ml-auto">Page {Math.floor(offset / PAGE) + 1}</span>
      </div>
      <div className="rounded-md border border-white/10 divide-y divide-white/5 max-h-[70vh] overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className="px-4 py-3 flex gap-3 items-start hover:bg-white/[0.02]">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40">
                <span className={m.system ? "text-[color:var(--theme-primary)]" : "text-white/60"}>{m.name}</span>
                <span>{m.role}</span>
                <span className="font-mono-data">{m.created_at?.slice(11, 19)}</span>
              </div>
              <div className="text-sm mt-1 break-words">{m.text}</div>
            </div>
            {!m.system && (
              <IconBtn onClick={() => remove(m.id)} title="Delete" testId={`del-chat-${m.id}`}>
                <Trash2 size={12} />
              </IconBtn>
            )}
          </div>
        ))}
        {messages.length === 0 && <div className="p-6 text-center text-white/40 text-sm">No messages.</div>}
      </div>
      <div className="flex gap-2 justify-end">
        <button disabled={offset <= 0} onClick={() => load(Math.max(0, offset - PAGE))} className="px-3 py-1.5 text-xs border border-white/10 rounded-sm disabled:opacity-30">Previous</button>
        <button disabled={offset + PAGE >= total} onClick={() => load(offset + PAGE)} className="px-3 py-1.5 text-xs border border-white/10 rounded-sm disabled:opacity-30">Next</button>
      </div>
    </div>
  );
}
