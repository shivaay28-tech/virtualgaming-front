import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Field, inputCls } from "./shared";

export function AddUserDialog({ open, onOpenChange, startingBalance, onSubmit, loading }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const reset = () => {
    setName("");
    setUsername("");
    setEmail("");
    setPassword("");
  };

  const submit = () => {
    if (!name.trim() || !username.trim() || !email.trim() || !password) return;
    onSubmit({
      name: name.trim(),
      username: username.trim(),
      email: email.trim(),
      password,
    });
  };

  const handleOpenChange = (v) => {
    if (!v) reset();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-zinc-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Player name"
              data-testid="admin-add-user-name"
              className={inputCls}
            />
          </Field>
          <Field label="Username">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Unique login username"
              data-testid="admin-add-user-username"
              className={inputCls}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="player@example.com"
              data-testid="admin-add-user-email"
              className={inputCls}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 chars, 1 digit"
              data-testid="admin-add-user-password"
              className={inputCls}
            />
          </Field>
          <p className="text-xs text-white/50">
            Temporary password — player must change it on first login.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading || !name.trim() || !username.trim() || !email.trim() || password.length < 8} data-testid="admin-add-user-submit">
            {loading ? "…" : "Create user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
