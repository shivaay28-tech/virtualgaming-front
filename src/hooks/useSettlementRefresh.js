import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { tableSocket } from "../lib/ws";

const POLL_MS = 500;
const MAX_POLL_MS = 30000;
const MAX_ROUNDS = 10;

function mergeRoundUpdate(rounds, incoming) {
  if (!incoming?.round_id) return rounds || [];
  const list = [...(rounds || [])];
  const idx = list.findIndex((r) => r.round_id === incoming.round_id);
  if (idx >= 0) list[idx] = incoming;
  else list.push(incoming);
  list.sort((a, b) => (b.round_number || 0) - (a.round_number || 0));
  return list.slice(0, MAX_ROUNDS);
}

function roundsSettledForTarget(rounds, targetRoundId) {
  if (!targetRoundId || !Array.isArray(rounds)) return false;
  const block = rounds.find((r) => r.round_id === targetRoundId);
  if (!block?.bets?.length) return false;
  return block.bets.some((b) => b.settled);
}

async function fetchRecentRounds() {
  const { data } = await api.get(`/game/my-bets?rounds=${MAX_ROUNDS}`);
  return data.rounds || [];
}

async function fetchWalletAndRounds(setBalance, targetRoundId) {
  let balanceOk = false;

  try {
    const [stateRes, rounds] = await Promise.all([
      api.get("/game/state"),
      fetchRecentRounds(),
    ]);
    const st = stateRes.data;
    if (st?.user_balance != null) {
      setBalance(st.user_balance);
      balanceOk = true;
    }
    const betsOk = roundsSettledForTarget(rounds, targetRoundId) || balanceOk;
    return { balanceOk, betsOk, rounds };
  } catch {
    /* fall through */
  }

  try {
    const { data } = await api.get("/wallet/me");
    if (data?.balance != null) {
      setBalance(data.balance);
      balanceOk = true;
    }
  } catch {
    /* ignore */
  }

  try {
    const rounds = await fetchRecentRounds();
    return {
      balanceOk,
      betsOk: roundsSettledForTarget(rounds, targetRoundId) || balanceOk,
      rounds,
    };
  } catch {
    /* ignore */
  }

  return { balanceOk, betsOk: balanceOk, rounds: null };
}

/**
 * Sync wallet chips + last-10-rounds bets after async settlement completes.
 */
export function useSettlementRefresh({
  phase,
  roundId,
  settlementStatus,
  hasBets,
  enabled,
  setBalance,
  wsReconnectedAt = 0,
}) {
  const [rounds, setRounds] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [walletsPending, setWalletsPending] = useState(false);

  const lastRefreshedRoundRef = useRef(null);
  const betRoundRef = useRef(null);
  const pollTimerRef = useRef(null);
  const pollStartedAtRef = useRef(0);

  const clearPolling = useCallback(() => {
    if (pollTimerRef.current != null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const applyRefresh = useCallback(
    async (targetRoundId) => {
      const { balanceOk, betsOk, rounds: nextRounds } = await fetchWalletAndRounds(
        setBalance,
        targetRoundId,
      );
      if (nextRounds) setRounds(nextRounds);
      const done = balanceOk || betsOk;
      if (done && targetRoundId) {
        lastRefreshedRoundRef.current = targetRoundId;
      }
      return done;
    },
    [setBalance],
  );

  const refreshNow = useCallback(async () => {
    if (!enabled) return false;
    const ok = await applyRefresh(betRoundRef.current || roundId);
    if (ok) setWalletsPending(false);
    return ok;
  }, [enabled, applyRefresh, roundId]);

  const clearPending = useCallback(() => setWalletsPending(false), []);

  const mergeWsRound = useCallback((incoming) => {
    setRounds((prev) => mergeRoundUpdate(prev, incoming));
    if (incoming?.round_id) {
      lastRefreshedRoundRef.current = incoming.round_id;
    }
    setWalletsPending(false);
  }, []);

  useEffect(() => {
    if (hasBets && roundId) {
      betRoundRef.current = roundId;
    }
  }, [hasBets, roundId]);

  useEffect(() => {
    const off = tableSocket.subscribe((msg) => {
      if (msg.type === "recent_bets_update" && msg.round) {
        mergeWsRound(msg.round);
      }
    });
    return off;
  }, [mergeWsRound]);

  useEffect(() => {
    if (!enabled) {
      setRounds([]);
      setInitialLoading(false);
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchRecentRounds();
        if (!cancelled) setRounds(data);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const startPolling = useCallback(
    (targetRoundId) => {
      if (!targetRoundId || !enabled) return;
      clearPolling();
      pollStartedAtRef.current = Date.now();
      setWalletsPending(true);

      const tick = async () => {
        const ok = await applyRefresh(targetRoundId);
        if (ok) {
          setWalletsPending(false);
          clearPolling();
          return;
        }
        if (Date.now() - pollStartedAtRef.current >= MAX_POLL_MS) {
          await applyRefresh(targetRoundId);
          setWalletsPending(false);
          clearPolling();
        }
      };

      tick();
      pollTimerRef.current = setInterval(tick, POLL_MS);
    },
    [enabled, clearPolling, applyRefresh],
  );

  useEffect(() => {
    if (!enabled) return undefined;

    const targetRound = betRoundRef.current;
    if (!targetRound) return undefined;

    if (
      settlementStatus === "settling" &&
      phase === "settled" &&
      lastRefreshedRoundRef.current !== targetRound
    ) {
      startPolling(targetRound);
      return () => clearPolling();
    }

    if (
      settlementStatus === "settled" &&
      lastRefreshedRoundRef.current !== targetRound
    ) {
      clearPolling();
      setWalletsPending(true);
      applyRefresh(targetRound).finally(() => setWalletsPending(false));
    }

    return undefined;
  }, [
    enabled,
    phase,
    settlementStatus,
    startPolling,
    clearPolling,
    applyRefresh,
  ]);

  const prevPhaseRef = useRef(null);
  useEffect(() => {
    if (!enabled) return;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    const targetRound = betRoundRef.current;
    if (
      prev &&
      prev !== "betting" &&
      phase === "betting" &&
      targetRound &&
      lastRefreshedRoundRef.current !== targetRound
    ) {
      applyRefresh(targetRound).finally(() => setWalletsPending(false));
    }
  }, [phase, enabled, applyRefresh]);

  useEffect(() => {
    if (!enabled || !wsReconnectedAt) return;
    refreshNow();
  }, [wsReconnectedAt, enabled, refreshNow]);

  useEffect(() => () => clearPolling(), [clearPolling]);

  return {
    rounds,
    initialLoading,
    walletsPending,
    refreshNow,
    clearPending,
  };
}
