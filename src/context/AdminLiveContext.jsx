import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import { tableSocket } from "../lib/ws";

const AdminLiveCtx = createContext(null);
const MAX_LIVE_BETS = 30;

export function AdminLiveProvider({ children }) {
  const [overview, setOverview] = useState(null);
  const [wsState, setWsState] = useState(null);
  const [volumes, setVolumes] = useState({});
  const [roundStats, setRoundStats] = useState({ total_count: 0, total_amount: 0, unique_bettors: 0 });
  const [liveBets, setLiveBets] = useState([]);
  const [online, setOnline] = useState(0);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const lastRoundRef = useRef(null);
  const refreshRef = useRef(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/overview");
      setOverview(data);
      setVolumes(data.volumes || {});
      setRoundStats({
        total_count: data.round_live?.bet_count ?? 0,
        total_amount: data.round_live?.total_volume ?? data.total_round_volume ?? 0,
        unique_bettors: data.round_live?.unique_bettors ?? 0,
      });
      setLiveBets(data.round_live?.recent_bets || []);
      if (data.round?.id) lastRoundRef.current = data.round.id;
      return data;
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed to load overview");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  refreshRef.current = refresh;

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const pollMs = connected ? 10000 : 3000;
    const id = setInterval(() => refreshRef.current?.(), pollMs);
    return () => clearInterval(id);
  }, [connected]);

  useEffect(() => {
    tableSocket.connect();
    const off = tableSocket.subscribe((msg) => {
      if (msg.type === "state") {
        const incoming = msg.state;
        setWsState(incoming);
        if (incoming.round_id && lastRoundRef.current && incoming.round_id !== lastRoundRef.current) {
          lastRoundRef.current = incoming.round_id;
          setVolumes({});
          refreshRef.current?.();
        } else if (incoming.round_id) {
          lastRoundRef.current = incoming.round_id;
        }
        if (incoming.phase === "settled") {
          refreshRef.current?.();
        }
      } else if (msg.type === "bet_volume") {
        setVolumes(msg.volumes || {});
        setRoundStats({
          total_count: msg.total_count ?? 0,
          total_amount: msg.total_amount ?? 0,
          unique_bettors: msg.unique_bettors ?? 0,
        });
      } else if (msg.type === "admin_bet") {
        const bet = msg.bet;
        if (!bet?.id) return;
        setLiveBets((prev) => {
          if (prev.some((b) => b.id === bet.id)) return prev;
          return [bet, ...prev].slice(0, MAX_LIVE_BETS);
        });
      } else if (msg.type === "hello") {
        setOnline(msg.online || 0);
        setConnected(true);
      } else if (msg.type === "table") {
        setOverview((o) =>
          o ? { ...o, table_config: { ...o.table_config, ...msg.table_config } } : o
        );
      } else if (msg.type === "ping") {
        setConnected(true);
      }
    });
    const checkConn = setInterval(() => {
      setConnected(tableSocket.ws?.readyState === 1);
    }, 2000);
    return () => {
      off();
      clearInterval(checkConn);
    };
  }, []);

  const data = useMemo(() => {
    if (!overview) return null;
    const round = wsState
      ? {
          ...overview.round,
          phase: wsState.phase ?? overview.round?.phase,
          time_left: wsState.time_left ?? overview.round?.time_left,
          phase_duration: wsState.phase_duration ?? overview.round?.phase_duration,
          number: wsState.round_number ?? overview.round?.number,
          id: wsState.round_id ?? overview.round?.id,
        }
      : overview.round;
    const outcome = wsState?.outcome ?? overview.outcome ?? null;
    return {
      ...overview,
      round,
      cards: wsState?.cards ?? overview.cards,
      reveal: wsState?.reveal ?? overview.reveal,
      outcome,
      volumes: Object.keys(volumes).length ? volumes : overview.volumes,
      total_round_volume: roundStats.total_amount || overview.total_round_volume,
      online_global: online || overview.online_global,
      round_live: {
        ...(overview.round_live || {}),
        bet_count: roundStats.total_count ?? overview.round_live?.bet_count ?? 0,
        unique_bettors: roundStats.unique_bettors ?? overview.round_live?.unique_bettors ?? 0,
        total_volume: roundStats.total_amount ?? overview.round_live?.total_volume ?? 0,
        recent_bets: liveBets.length ? liveBets : overview.round_live?.recent_bets ?? [],
      },
    };
  }, [overview, wsState, volumes, roundStats, liveBets, online]);

  return (
    <AdminLiveCtx.Provider value={{ data, connected, loading, refresh }}>
      {children}
    </AdminLiveCtx.Provider>
  );
}

export function useAdminLive() {
  return useContext(AdminLiveCtx);
}
