import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import { tableSocket } from "../lib/ws";

const AdminLiveCtx = createContext(null);
const MAX_LIVE_BETS = 30;
const REFRESH_DEBOUNCE_MS = 2000;

function applyLivePayload(data, setters) {
  const { setLive, setVolumes, setRoundStats, setLiveBets, lastRoundRef } = setters;
  setLive(data);
  setVolumes(data.volumes || {});
  setRoundStats({
    total_count: data.round_live?.bet_count ?? 0,
    total_amount: data.round_live?.total_volume ?? data.total_round_volume ?? 0,
    unique_bettors: data.round_live?.unique_bettors ?? 0,
  });
  setLiveBets(data.round_live?.recent_bets || []);
  if (data.round?.id) lastRoundRef.current = data.round.id;
}

export function AdminLiveProvider({ children }) {
  const [live, setLive] = useState(null);
  const [overviewMeta, setOverviewMeta] = useState(null);
  const [wsState, setWsState] = useState(null);
  const [volumes, setVolumes] = useState({});
  const [roundStats, setRoundStats] = useState({ total_count: 0, total_amount: 0, unique_bettors: 0 });
  const [liveBets, setLiveBets] = useState([]);
  const [online, setOnline] = useState(0);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const lastRoundRef = useRef(null);
  const refreshLiveRef = useRef(null);
  const refreshOverviewRef = useRef(null);
  const refreshDebounceRef = useRef(null);
  const lastRefreshAtRef = useRef(0);

  const refreshLive = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/live");
      applyLivePayload(data, {
        setLive,
        setVolumes,
        setRoundStats,
        setLiveBets,
        lastRoundRef,
      });
      return data;
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed to load live data");
      return null;
    }
  }, []);

  const refreshOverview = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/overview");
      setOverviewMeta(data);
      applyLivePayload(data, {
        setLive: () => {},
        setVolumes,
        setRoundStats,
        setLiveBets,
        lastRoundRef,
      });
      return data;
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed to load overview");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([refreshLive(), refreshOverview()]);
  }, [refreshLive, refreshOverview]);

  refreshLiveRef.current = refreshLive;
  refreshOverviewRef.current = refreshOverview;

  const scheduleLiveRefresh = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshAtRef.current < REFRESH_DEBOUNCE_MS) {
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
      refreshDebounceRef.current = setTimeout(() => {
        lastRefreshAtRef.current = Date.now();
        refreshLiveRef.current?.();
      }, REFRESH_DEBOUNCE_MS);
      return;
    }
    lastRefreshAtRef.current = now;
    refreshLiveRef.current?.();
  }, []);

  useEffect(() => {
    refreshLive();
  }, [refreshLive]);

  useEffect(() => {
    if (connected) return undefined;
    const id = setInterval(() => refreshLiveRef.current?.(), 30000);
    return () => clearInterval(id);
  }, [connected]);

  useEffect(() => {
    tableSocket.connect();
    const off = tableSocket.subscribe((msg) => {
      if (msg.type === "state") {
        const incoming = msg.state;
        setWsState(incoming);
        const roundChanged =
          incoming.round_id &&
          lastRoundRef.current &&
          incoming.round_id !== lastRoundRef.current;
        if (roundChanged) {
          lastRoundRef.current = incoming.round_id;
          setVolumes({});
        } else if (incoming.round_id) {
          lastRoundRef.current = incoming.round_id;
        }
        if (roundChanged || incoming.phase === "settled") {
          scheduleLiveRefresh();
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
        setOverviewMeta((o) =>
          o ? { ...o, table_config: { ...o.table_config, ...msg.table_config } } : o
        );
        setLive((l) =>
          l ? { ...l, table_config: { ...l.table_config, ...msg.table_config } } : l
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
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    };
  }, [scheduleLiveRefresh]);

  const data = useMemo(() => {
    const base = { ...(overviewMeta || {}), ...(live || {}) };
    if (!live && !overviewMeta) return null;
    const round = wsState
      ? {
          ...(base.round || {}),
          phase: wsState.phase ?? base.round?.phase,
          time_left: wsState.time_left ?? base.round?.time_left,
          phase_duration: wsState.phase_duration ?? base.round?.phase_duration,
          number: wsState.round_number ?? base.round?.number,
          id: wsState.round_id ?? base.round?.id,
        }
      : base.round;
    const outcome = wsState?.outcome ?? base.outcome ?? null;
    return {
      ...base,
      round,
      cards: wsState?.cards ?? base.cards,
      reveal: wsState?.reveal ?? base.reveal,
      outcome,
      volumes: Object.keys(volumes).length ? volumes : base.volumes,
      total_round_volume: roundStats.total_amount || base.total_round_volume,
      online_global: online || base.online_global,
      round_live: {
        ...(base.round_live || {}),
        bet_count: roundStats.total_count ?? base.round_live?.bet_count ?? 0,
        unique_bettors: roundStats.unique_bettors ?? base.round_live?.unique_bettors ?? 0,
        total_volume: roundStats.total_amount ?? base.round_live?.total_volume ?? 0,
        recent_bets: liveBets.length ? liveBets : base.round_live?.recent_bets ?? [],
      },
    };
  }, [live, overviewMeta, wsState, volumes, roundStats, liveBets, online]);

  return (
    <AdminLiveCtx.Provider value={{ data, connected, loading, refresh, refreshOverview, refreshLive }}>
      {children}
    </AdminLiveCtx.Provider>
  );
}

export function useAdminLive() {
  return useContext(AdminLiveCtx);
}
