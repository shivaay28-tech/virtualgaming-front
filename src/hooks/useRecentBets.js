import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

export function useRecentBets(phase, roundId) {
  const [bets, setBets] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const hasLoadedOnce = useRef(false);
  const lastSettledRoundRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let deferHandle;

    const load = async () => {
      try {
        const { data } = await api.get("/game/my-bets?limit=10");
        if (!cancelled) setBets(data.bets || []);
      } catch {
        // Background refresh — silent fail; retry on next settlement.
      } finally {
        if (!cancelled && !hasLoadedOnce.current) {
          hasLoadedOnce.current = true;
          setInitialLoading(false);
        }
      }
    };

    const shouldRefreshOnSettle =
      phase === "settled" &&
      roundId &&
      lastSettledRoundRef.current !== roundId;

    if (!hasLoadedOnce.current) {
      const run = () => load();
      if (typeof requestIdleCallback !== "undefined") {
        deferHandle = requestIdleCallback(run, { timeout: 800 });
      } else {
        deferHandle = setTimeout(run, 500);
      }
    } else if (shouldRefreshOnSettle) {
      lastSettledRoundRef.current = roundId;
      load();
    }

    return () => {
      cancelled = true;
      if (deferHandle != null) {
        if (typeof deferHandle === "number") clearTimeout(deferHandle);
        else cancelIdleCallback(deferHandle);
      }
    };
  }, [phase, roundId]);

  return { bets, initialLoading };
}
