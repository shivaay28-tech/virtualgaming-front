import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { tableSocket } from "../lib/ws";
import { api } from "../lib/api";

const GameCtx = createContext(null);

export function GameProvider({ children }) {
  const [state, setState] = useState(null);
  const [volumes, setVolumes] = useState({});
  const [messages, setMessages] = useState([]);
  const [online, setOnline] = useState(0);
  const pollRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [s, c] = await Promise.all([
          api.get("/game/state"),
          api.get("/chat/history?limit=50"),
        ]);
        if (!alive) return;
        setState(s.data);
        setMessages(c.data.messages || []);
      } catch (e) { /* ignore */ }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    tableSocket.connect();
    const off = tableSocket.subscribe((msg) => {
      if (msg.type === "state") {
        setState((prev) => {
          const incoming = msg.state;
          if (!prev) return incoming;
          const sameRound = prev.round_id === incoming.round_id;
          const preserveBets = sameRound && (!incoming.my_bets || incoming.my_bets.length === 0) && prev.my_bets?.length;
          return {
            ...prev,
            ...incoming,
            my_bets: preserveBets ? prev.my_bets : (incoming.my_bets ?? prev.my_bets ?? []),
            history: incoming.history ?? prev.history,
            session_summary: incoming.session_summary ?? prev.session_summary,
          };
        });
      } else if (msg.type === "bet_volume") {
        setVolumes(msg.volumes || {});
      } else if (msg.type === "chat") {
        setMessages((m) => [...m, msg.message].slice(-200));
      } else if (msg.type === "chat_delete") {
        setMessages((m) => m.filter((x) => x.id !== msg.message_id));
      } else if (msg.type === "hello") {
        setOnline(msg.online || 0);
      } else if (msg.type === "table") {
        setState((s) => (s ? { ...s, table: { ...s.table, ...msg.table_config } } : s));
      }
    });
    return () => off();
  }, []);

  const lastRound = useRef(null);
  useEffect(() => {
    if (!state) return;
    if (lastRound.current && lastRound.current !== state.round_id) {
      setVolumes({});
    }
    lastRound.current = state.round_id;
  }, [state]);

  useEffect(() => {
    const pollMs = state?.phase === "reveal" ? 400 : 2500;
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get("/game/state");
        setState(data);
      } catch (e) { /* ignore */ }
    }, pollMs);
    return () => clearInterval(pollRef.current);
  }, [state?.phase]);

  const mergeMyBet = useCallback((bet) => {
    if (!bet?.market) return;
    setState((prev) => {
      if (!prev) return prev;
      const existing = prev.my_bets || [];
      if (bet.id && existing.some((b) => b.id === bet.id)) return prev;
      return { ...prev, my_bets: [...existing, bet] };
    });
  }, []);

  return (
    <GameCtx.Provider value={{ state, volumes, messages, online, setMessages, mergeMyBet }}>
      {children}
    </GameCtx.Provider>
  );
}

export function useGame() {
  return useContext(GameCtx);
}
