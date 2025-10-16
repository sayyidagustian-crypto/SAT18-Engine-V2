// src/modules/logStream.ts
// Client-side encrypted log stream handler (browser)
// Dependencies: none (menggunakan Web Crypto API)

type SessionInfo = {
  wsUrl: string;
  token: string;
  sessionKeyBase64: string; // base64-encoded 32-byte key (AES-256)
};

type EncryptedMessage = {
  iv: string;    // base64
  data: string;  // base64 (ciphertext + tag)
  meta?: any;    // optional meta: { level, ts, source }
};

export type LogCallback = (msg: { text: string; level?: string; ts?: number; meta?: any }) => void;

function b64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function importAesKey(base64Key: string): Promise<CryptoKey> {
  const raw = b64ToArrayBuffer(base64Key);
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["decrypt"]);
}

export class LogStream {
  private ws?: WebSocket;
  private decryptKey?: CryptoKey;
  private onLog: LogCallback;
  private reconnectInterval = 3000;
  private sessionInfo?: SessionInfo;
  private closed = false;

  constructor(onLog: LogCallback) {
    this.onLog = onLog;
  }

  async init(session: SessionInfo) {
    this.sessionInfo = session;
    this.decryptKey = await importAesKey(session.sessionKeyBase64);
    this.connect();
  }

  private connect() {
    if (!this.sessionInfo) throw new Error("Session info missing");

    const url = this.sessionInfo.wsUrl;
    const wsUrlWithToken = `${url}?token=${encodeURIComponent(this.sessionInfo.token)}`;

    this.ws = new WebSocket(wsUrlWithToken);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      this.onLog({ text: "🔐 Encrypted log stream connected.", level: "info", ts: Date.now() });
    };

    this.ws.onmessage = async (evt) => {
      try {
        const text = typeof evt.data === "string" ? evt.data : new TextDecoder().decode(evt.data);
        const payload: EncryptedMessage = JSON.parse(text);
        
        const plainText = await this.decryptPayload(payload);
        // The encrypted part is a JSON string like {"message": "..."}
        const logContent = JSON.parse(plainText);
        
        this.onLog({ text: logContent.message, level: payload.meta?.level || "info", ts: payload.meta?.ts, meta: payload.meta });
      } catch (err) {
        this.onLog({ text: `❌ Failed to process encrypted log: ${String(err)}`, level: "error", ts: Date.now() });
      }
    };

    this.ws.onclose = () => {
      if (this.closed) return;
      this.onLog({ text: "⚠️ Log stream disconnected. Reconnecting...", level: "warning", ts: Date.now() });
      setTimeout(() => this.connect(), this.reconnectInterval);
    };

    this.ws.onerror = (ev) => {
      this.onLog({ text: "❌ Log stream error. See console.", level: "error", ts: Date.now() });
      console.error("LogStream websocket error", ev);
    };
  }

  async decryptPayload(payload: EncryptedMessage): Promise<string> {
    if (!this.decryptKey) throw new Error("Decrypt key not set");
    const iv = b64ToArrayBuffer(payload.iv);
    const data = b64ToArrayBuffer(payload.data);
    const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, this.decryptKey, data);
    return new TextDecoder().decode(plainBuf);
  }

  close() {
    this.closed = true;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
        this.onLog({ text: "🔒 Log stream closed.", level: "info", ts: Date.now() });
    }
  }
}