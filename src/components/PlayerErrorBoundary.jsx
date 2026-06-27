import React from "react";
import { BackendStatusScreen } from "./BackendStatusScreen";

export class PlayerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Player app error", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <BackendStatusScreen
          title="Something went wrong"
          message="The app hit an unexpected error. Reload the page to continue."
          hint={this.state.error?.message}
          onRetry={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}

/** Prompt reload when Vercel serves stale HTML after a deploy. */
export function installChunkLoadRecovery() {
  const reload = () => {
    if (window.__chunkReloadPrompted) return;
    window.__chunkReloadPrompted = true;
    const ok = window.confirm(
      "A new version of the app is available. Reload now to continue?",
    );
    if (ok) window.location.reload();
  };

  window.addEventListener("error", (e) => {
    const msg = e.message || "";
    if (msg.includes("ChunkLoadError") || msg.includes("Loading chunk")) {
      reload();
    }
  });

  window.addEventListener("unhandledrejection", (e) => {
    const msg = String(e.reason?.message || e.reason || "");
    if (msg.includes("ChunkLoadError") || msg.includes("Loading chunk")) {
      reload();
    }
  });
}
