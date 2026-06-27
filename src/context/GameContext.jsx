import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { tableSocket } from "../lib/ws";
import { api, isBackendUnreachable } from "../lib/api";
import { fetchPlatformPublic } from "../lib/platform";

const GameCtx = createContext(null);

export function GameProvider({ children }) {
  const [state, setState] = useState(null);
  const [volumes, setVolumes] = useState({});
  const [messages, setMessages] = useState([]);
  const [online, setOnline] = useState(0);
  const [gameStatus, setGameStatus] = useState("loading");
  const [maintenanceReason, setMaintenanceReason] = useState("");
  const pollRef = useRef(null);
  const hasStateRef = useRef(false);

  useEffect(() => {
    hasStateRef.current = !!state;
  }, [state]);

  const loadGame = useCallback(async () => {
    setGameStatus("loading");
    try {
      const [s, c] = await Promise.all([
        api.get("/game/state"),
        api.get("/chat/history?limit=50"),
      ]);
      setState(s.data);
      setMessages(c.data.messages || []);
      setGameStatus("ready");
      setMaintenanceReason("");
      return true;
    } catch (e) {
      if (isBackendUnreachable(e) || !hasStateRef.current) {
        setGameStatus("unavailable");
      }
      return false;
    }
  }, []);

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  useEffect(() => {
    if (gameStatus !== "unavailable") return undefined;
    let alive = true;
    const poll = async () => {
      try {
        const pub = await fetchPlatformPublic({ fresh: true });
        if (!alive) return;
        if (pub.table_paused && pub.pause_reason) {
          setMaintenanceReason(pub.pause_reason);
        } else if (pub.table_paused) {
          setMaintenanceReason("Table is paused for maintenance.");
        }
      } catch {
        /* ignore */
      }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [gameStatus]);

  useEffect(() => {
    tableSocket.connect();
    const off = tableSocket.subscribe((msg) => {
      if (msg.type === "state") {
        setGameStatus("ready");
        setMaintenanceReason("");
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
    const pollMs = gameStatus === "unavailable"
      ? 3000
      : state?.phase === "reveal"
        ? 400
        : 2500;
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get("/game/state");
        setState(data);
        setGameStatus("ready");
        setMaintenanceReason("");
      } catch (e) {
        if (!hasStateRef.current && isBackendUnreachable(e)) {
          setGameStatus("unavailable");
        }
      }
    }, pollMs);
    return () => clearInterval(pollRef.current);
  }, [state?.phase, gameStatus]);

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
    <GameCtx.Provider
      value={{
        state,
        volumes,
        messages,
        online,
        gameStatus,
        maintenanceReason,
        setMessages,
        mergeMyBet,
        retryGame: loadGame,
      }}
    >
      {children}
    </GameCtx.Provider>
  );
}

export function useGame() {
  return useContext(GameCtx);
}
