import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, formatApiError } from "../../lib/api";
import { ResultBadge, downloadCsv } from "./shared";
import { AdminTable } from "./primitives/AdminTable";
import { AdminCard } from "./primitives/AdminCard";
import { Download } from "lucide-react";

const LIMIT = 50;

const MARKET_LABELS = {
  player_a: "Player A",
  player_b: "Player B",
  pair_plus_a: "Pair+ A",
  pair_plus_b: "Pair+ B",
};

export function BetsPanel() {
  const [bets, setBets]   = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (off = 0) => {
    setLoading(true);
    setBets([]);
    try {
      const { data } = await api.get(`/admin/bets?limit=${LIMIT}&offset=${off}`);
      setBets(data.bets || []);
      setTotal(data.total || 0);
      setOffset(off);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(0); }, [load]);

  const columns = [
    {
      key: "created_at",
      label: "Time",
      render: (v) => (
        <span className="text-white/40">{v?.slice(0, 16).replace("T", " ") || "—"}</span>
      ),
    },
    {
      key: "user_name",
      label: "User",
      render: (v, r) => (
        <div>
          <div>{r.user_name || "—"}</div>
          <div className="text-[9px] text-white/30">{r.user_email}</div>
        </div>
      ),
    },
    {
      key: "round_number",
      label: "Round",
      render: (v) => `#${v}`,
    },
    {
      key: "market",
      label: "Market",
      render: (v) => MARKET_LABELS[v] || v?.replace(/_/g, " "),
    },
    {
      key: "amount",
      label: "Amount",
      align: "right",
      render: (v) => `₹${(v || 0).toLocaleString()}`,
    },
    {
      key: "settled",
      label: "Result",
      align: "right",
      render: (_, r) => <ResultBadge {...r} />,
    },
  ];

  return (
    <div>
      <AdminCard
        title={`Bets — ${total.toLocaleString()} total`}
        actions={
          <button
            type="button"
            onClick={() => downloadCsv("bets.csv", bets)}
            className="p-1 rounded border border-white/10 text-white/50 hover:text-white transition-colors"
            title="Export page as CSV"
          >
            <Download size={12} />
          </button>
        }
      >
        <AdminTable
          columns={columns}
          rows={bets}
          rowKey="id"
          loading={loading}
          emptyText="No bets found"
          total={total}
          offset={offset}
          limit={LIMIT}
          onPageChange={load}
          testId="admin-bets-table"
        />
      </AdminCard>
    </div>
  );
}
