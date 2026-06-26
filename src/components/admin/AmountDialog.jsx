import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Field, inputCls } from "./shared";

export function AmountDialog({ open, onOpenChange, mode = "deposit", currentBalance = 0, onSubmit, loading }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const isWithdraw = mode === "withdraw";
  const n = Number(amount);
  const overBalance = isWithdraw && n > 0 && n > currentBalance;
  const invalid = !n || n <= 0 || overBalance;

  const submit = () => {
    if (invalid) return;
    onSubmit(n, note);
    setAmount("");
    setNote("");
  };

  const title = isWithdraw ? "Withdraw" : "Deposit";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-xs text-white/50">
            Available balance: ₹{(currentBalance || 0).toLocaleString()}
          </p>
          <Field label="Amount (₹)">
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              data-testid={`admin-${mode}-amount`}
              className={inputCls}
            />
          </Field>
          {overBalance && (
            <p className="text-xs text-red-400">Amount exceeds available balance.</p>
          )}
          <Field label="Note">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note"
              className={inputCls}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading || invalid} data-testid={`admin-${mode}-confirm`}>
            {loading ? "…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MuteDialog({ open, onOpenChange, onSubmit }) {
  const [minutes, setMinutes] = useState("15");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-white/10 text-white">
        <DialogHeader><DialogTitle>Mute user</DialogTitle></DialogHeader>
        <Field label="Minutes (0 to unmute)">
          <input type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} className={inputCls} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { onSubmit(Number(minutes)); onOpenChange(false); }}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
