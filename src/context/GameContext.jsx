import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { tableSocket } from "../lib/ws";
import { api, isBackendUnreachable } from "../lib/api";
import { fetchPlatformPublic } from "../lib/platform";

const GameCtx = createContext(null);
const WS_STALE_MS = 30000;
const FALLBACK_POLL_MS = 15000;

function mergeGameState(prev, incoming) {
  if (!incoming) return prev;
  if (!prev) return incoming;
  const sameRound = prev.round_id === incoming.round_id;
  const preserveBets =
    sameRound &&
    (!incoming.my_bets || incoming.my_bets.length === 0) &&
    prev.my_bets?.length;
  const my_bets = sameRound
    ? (preserveBets ? prev.my_bets : (incoming.my_bets ?? prev.my_bets ?? []))
    : (incoming.my_bets ?? []);
  const outcome =
    incoming.phase === "settled"
      ? (incoming.outcome ?? (sameRound ? prev.outcome : undefined))
      : undefined;
  return {
    ...prev,
    ...incoming,
    outcome,
    my_bets,
    history: incoming.history ?? prev.history,
    session_summary: incoming.session_summary ?? prev.session_summary,
  };
}

export function GameProvider({ children }) {
  const [state, setState] = useState(null);
  const [volumes, setVolumes] = useState({});
  const [messages, setMessages] = useState([]);
  const [online, setOnline] = useState(0);
  const [gameStatus, setGameStatus] = useState("loading");
  const [maintenanceReason, setMaintenanceReason] = useState("");
  const [wsConnected, setWsConnected] = useState(false);
  const [wsCapacityLimited, setWsCapacityLimited] = useState(false);
  const [wsReconnectedAt, setWsReconnectedAt] = useState(0);
  const hasStateRef = useRef(false);
  const lastWsAtRef = useRef(0);
  const hadWsConnectedRef = useRef(false);

  useEffect(() => {
    hasStateRef.current = !!state;
  }, [state]);

  const markWsActivity = useCallback(() => {
    lastWsAtRef.current = Date.now();
    setWsConnected(true);
  }, []);

  const applyIncomingState = useCallback((incoming) => {
    setGameStatus("ready");
    setMaintenanceReason("");
    setState((prev) => mergeGameState(prev, incoming));
  }, []);

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
      markWsActivity();
      return true;
    } catch (e) {
      if (isBackendUnreachable(e) || !hasStateRef.current) {
        setGameStatus("unavailable");
      }
      return false;
    }
  }, [markWsActivity]);

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
        markWsActivity();
        applyIncomingState(msg.state);
      } else if (msg.type === "bet_volume") {
        markWsActivity();
        setVolumes(msg.volumes || {});
      } else if (msg.type === "chat") {
        setMessages((m) => [...m, msg.message].slice(-200));
      } else if (msg.type === "chat_delete") {
        setMessages((m) => m.filter((x) => x.id !== msg.message_id));
      } else if (msg.type === "hello") {
        markWsActivity();
        setOnline(msg.online || 0);
      } else if (msg.type === "online") {
        setOnline(msg.online || 0);
      } else if (msg.type === "table") {
        setState((s) => (s ? { ...s, table: { ...s.table, ...msg.table_config } } : s));
      } else if (msg.type === "ping") {
        markWsActivity();
      } else if (msg.type === "ws_status") {
        if (msg.connected) {
          if (hadWsConnectedRef.current) {
            setWsReconnectedAt(Date.now());
          }
          hadWsConnectedRef.current = true;
        }
        setWsConnected(!!msg.connected);
        setWsCapacityLimited(!!msg.capacityLimited);
      }
    });
    return () => off();
  }, [applyIncomingState, markWsActivity]);

  useEffect(() => {
    const checkConn = setInterval(() => {
      const open = tableSocket.ws?.readyState === 1;
      setWsConnected(open);
      if (!open) lastWsAtRef.current = 0;
    }, 2000);
    return () => clearInterval(checkConn);
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
    if (gameStatus === "unavailable") {
      const id = setInterval(async () => {
        try {
          const { data } = await api.get("/game/state");
          applyIncomingState(data);
        } catch (e) {
          if (!hasStateRef.current && isBackendUnreachable(e)) {
            setGameStatus("unavailable");
          }
        }
      }, 3000);
      return () => clearInterval(id);
    }

    const id = setInterval(async () => {
      const wsFresh =
        wsConnected &&
        lastWsAtRef.current > 0 &&
        Date.now() - lastWsAtRef.current < WS_STALE_MS;
      if (wsFresh) return;

      try {
        const { data } = await api.get("/game/state");
        applyIncomingState(data);
        markWsActivity();
      } catch (e) {
        if (!hasStateRef.current && isBackendUnreachable(e)) {
          setGameStatus("unavailable");
        }
      }
    }, FALLBACK_POLL_MS);

    return () => clearInterval(id);
  }, [gameStatus, wsConnected, applyIncomingState, markWsActivity]);

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
        wsConnected,
        wsCapacityLimited,
        wsReconnectedAt,
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
