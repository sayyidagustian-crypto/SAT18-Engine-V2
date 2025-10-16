// server/handshake-ws.ts
import express from "express";
import type { Request, Response, NextFunction } from "express";
import http from "http";
import { WebSocketServer, WebSocket as WsWebSocket } from "ws";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import { Buffer } from "buffer";
import type { VpsSystemInfo, VpsHealthResponse } from "./src/types.js";
import process from "process";


const app = express();
app.use('/', express.json());

// Serve the frontend build in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, '../../frontend/dist');

if (process.env.NODE_ENV === 'production') {
  app.use('/', express.static(frontendPath));
}

/**
 * In-memory session map:
 * sessionToken -> { key: Buffer, expiresAt: number, createdAt: number }
 * In production: use Redis or DB with TTL.
 */
const sessionMap = new Map<string, { key: Buffer, expiresAt: number, createdAt: number }>();


// --- Authentication & Session Management ---

function validateClientAuth(apiKey: string | null): boolean {
  const isKeySet = process.env.DEPLOY_API_KEY && process.env.DEPLOY_API_KEY !== 'SAT18_DEPLOY_SECRET_KEY_PLACEHOLDER';
  if (!isKeySet) {
      console.warn('[AUTH] DEPLOY_API_KEY is not set. Allowing request for development purposes.');
      return true; // Allow for local dev if key not set
  }
  return !!(apiKey && apiKey === process.env.DEPLOY_API_KEY);
}

function generateSession(durationSec = 600) {
  const key = crypto.randomBytes(32); // AES-256
  const token = uuidv4();
  const now = Date.now();
  const expiresAt = now + durationSec * 1000;
  
  sessionMap.set(token, { key, createdAt: now, expiresAt });
  
  return { 
      token, 
      keyBase64: key.toString("base64"), 
      expiresAt,
      expiresIn: durationSec 
  };
}

// Middleware to protect API routes
function validateSessionToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  if (!token || !sessionMap.has(token)) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing session token." });
  }
  
  const session = sessionMap.get(token)!;
  if (session.expiresAt < Date.now()) {
    sessionMap.delete(token);
    return res.status(401).json({ error: "Unauthorized: Session token has expired." });
  }

  // Attach session to request for potential future use, though not currently used by endpoints
  // req.session = session; 
  next();
}


// Clean expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessionMap.entries()) {
      if (session.expiresAt < now) {
          sessionMap.delete(token);
          console.log(`[Session Cleanup] Expired session for token ${token.substring(0,8)}...`);
      }
  }
}, 60_000);


// --- HTTP API Endpoints ---

// Health check endpoint for the VPS monitor
app.get("/api/health", (req, res) => {
    const vpsInfo: VpsSystemInfo = {
        platform: process.platform,
        memory: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
        uptime: `${process.uptime().toFixed(0)}s`,
        loadAvg: [0.1, 0.2, 0.3], // Dummy data for now
    };
    const response: VpsHealthResponse = {
        status: "ok",
        system: vpsInfo,
    };
    res.status(200).json(response);
});


// Upload endpoint stub - needed by the frontend deployer
app.post("/upload", validateSessionToken, (req, res) => {
    console.log('[UPLOAD] Received file upload request...');
    console.log('[UPLOAD] Simulating server-side deployment script execution...');
    res.status(200).json({
      success: true,
      message: "Package received. Initiating server-side deployment process.",
    });
});


// Handshake endpoint — called by client to get a session
app.post("/auth/handshake", (req, res) => {
  const authHeader = req.headers["authorization"];
  const apiKey = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!validateClientAuth(apiKey)) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing API Key." });
  }

  const session = generateSession(600); // 10 minutes
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'wss' : 'ws';
  
  const wsUrl = `${protocol}://${host}/logs`; 
  
  res.json({ 
    sessionToken: session.token, 
    sessionKeyBase64: session.keyBase64,
    expiresIn: session.expiresIn,
    wsUrl 
  });
});


// --- WebSocket Server for Log Streaming ---

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

type ExtendedWebSocket = WsWebSocket & {
    sessionKey: Buffer;
};

function encryptForKey(plainText: string, keyBuf: Buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuf, iv);
  const ct = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString("base64"), data: Buffer.concat([ct, tag]).toString("base64") };
}

server.on("upgrade", (request, socket, head) => {
  const baseURL = `http://${request.headers.host}`;
  const urlObj = new URL(request.url!, baseURL);
  
  if (urlObj.pathname !== "/logs") {
    socket.destroy();
    return;
  }
  const token = urlObj.searchParams.get("token");
  if (!token || !sessionMap.has(token)) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  const session = sessionMap.get(token)!;
  if (session.expiresAt < Date.now()) {
    socket.write("HTTP/1.1 401 Session expired\r\n\r\n");
    socket.destroy();
    sessionMap.delete(token);
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    const extWs = ws as ExtendedWebSocket;
    extWs.sessionKey = session.key;
    wss.emit("connection", extWs, request);
  });
});

const successSteps = [
    { level: 'info', message: '[SAT18-DEPLOY][INFO] Starting deployment for release: ...' },
    { level: 'info', message: '[SAT18-DEPLOY][INFO] Executing: unzip -o ./sat18-deployment.zip -d ...' },
    { level: 'info', message: '[SAT18-DEPLOY][INFO] Executing: npm install --production' },
    { level: 'info', message: '[SAT18-DEPLOY][INFO] Executing: npm run build' },
    { level: 'info', message: '[SAT18-DEPLOY][INFO] Performing health check...' },
    { level: 'success', message: '[SAT18-DEPLOY][SUCCESS] Health check passed.' },
    { level: 'info', message: '[SAT18-DEPLOY][INFO] Activating new release by updating symlink...' },
    { level: 'info', message: '[SAT18-DEPLOY][INFO] Cleaning up old releases...' },
    { level: 'success', message: '[SAT18-DEPLOY][SUCCESS] Deployment successful! \'current\' is now live.' },
];

const failureSteps = [
    ...successSteps.slice(0, 4),
    { level: 'error', message: '[SAT18-DEPLOY][ERROR] Health check failed: Entry point \'dist/index.html\' not found.' },
    { level: 'warn', message: '[SAT18-DEPLOY][WARN] Deployment failed. Rolling back to last successful version...' },
    { level: 'info', message: '[SAT18-DEPLOY][INFO] Cleaning up failed release directory...' },
    { level: 'success', message: '[SAT18-DEPLOY][SUCCESS] Rollback complete. \'current\' now points to last successful release.'},
    { level: 'error', message: '[SAT18-DEPLOY][ERROR] Deployment process terminated with an error.' }
];

wss.on("connection", (ws: ExtendedWebSocket) => {
  console.log(`[WebSocket] Client connected.`);
  
  let step = 0;
  const shouldFail = Math.random() < 0.2; 
  const stepsToRun = shouldFail ? failureSteps : successSteps;

  const sendLog = (message: string, level: string) => {
      try {
          const payload = JSON.stringify({ message });
          const enc = encryptForKey(payload, ws.sessionKey);
          const meta = { level, ts: Date.now() };
          ws.send(JSON.stringify({ iv: enc.iv, data: enc.data, meta }));
      } catch (e) {
          console.error(`[WebSocket] Failed to send log to client:`, e);
      }
  };

  const t = setInterval(() => {
    if (step >= stepsToRun.length) {
        clearInterval(t);
        setTimeout(() => ws.close(1000, "Deployment finished"), 500);
        return;
    }

    const { level, message } = stepsToRun[step];
    sendLog(message, level);
    step++;
  }, 1200);

  ws.on("close", () => {
      console.log(`[WebSocket] Client disconnected.`);
      clearInterval(t);
  });
});

if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 24700;
server.listen(PORT, () => console.log(`[SAT18 Server] Handshake, API & WS server listening on port ${PORT}`));
