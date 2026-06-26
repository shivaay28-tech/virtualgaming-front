/* WebSocket client with auto-reconnect. */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const WS_URL = BACKEND_URL.replace(/^http/, "ws") + "/api/ws";

class TableSocket {
  constructor() {
    this.ws = null;
    this.subs = new Set();
    this.reconnectTimer = null;
    this.retry = 0;
  }

  connect() {
    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) return;
    try {
      this.ws = new WebSocket(WS_URL);
    } catch (e) {
      this._scheduleReconnect();
      return;
    }
    this.ws.onopen = () => { this.retry = 0; };
    this.ws.onmessage = (ev) => {
      let data;
      try { data = JSON.parse(ev.data); } catch { return; }
      this.subs.forEach((fn) => {
        try { fn(data); } catch (err) { console.error("ws subscriber error", err); }
      });
    };
    this.ws.onclose = () => this._scheduleReconnect();
    this.ws.onerror = () => { try { this.ws.close(); } catch (e) { /* ignore */ } };
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(8000, 500 * Math.pow(2, this.retry++));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  subscribe(fn) {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }

  close() {
    try { this.ws?.close(); } catch (e) { /* ignore */ }
  }
}

export const tableSocket = new TableSocket();
