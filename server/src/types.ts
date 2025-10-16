// --- Tipe Inti dari "Smart Content Analyzer" ---

// Mewakili file yang diunggah oleh pengguna
export interface UploadedFile {
  name: string;
  content: string;
  file: File; // Add original File object for hashing
}

// Mewakili hasil analisis untuk satu file
export interface FileAnalysis {
  originalPath: string;
  suggestedPath: string;
  language: string;
  reasoning: string;
}

// Mewakili hasil keseluruhan dari analisis proyek
export interface AnalysisResult {
  summary: string;
  files: FileAnalysis[];
  detectedFramework: string | null;
  entryPoint: string | null;
}

// Mewakili struktur pohon direktori untuk tampilan
export interface DirectoryTree {
  [key: string]: DirectoryTree | FileAnalysis;
}


// --- Tipe dari "Build & Deployment Center" ---

// Target platform untuk proses build
export type BuildTarget = "web" | "android" | "ios";

// Opsi untuk proses build
export interface BuildOptions {
  appName: string;
  target: BuildTarget;
}

// Hasil dari proses build
export interface BuildResult {
  blob: Blob;
  filename: string;
}


// --- Tipe untuk System Monitoring ---

// Informasi sistem dari sisi klien (browser)
export interface ClientSystemInfo {
  online: string;
  ramUsage: string;
  uptime: string;
}

// Status koneksi ke VPS
export type VpsStatus = 'checking' | 'online' | 'offline';

// Informasi sistem yang diambil dari VPS
export interface VpsSystemInfo {
  platform: string;
  memory: string;
  uptime: string;
  loadAvg: number[];
}

// Respon JSON lengkap dari endpoint health VPS
// FIX: Added isAiEnabled to VpsHealthResponse to match server implementation and frontend expectation.
export interface VpsHealthResponse {
  status: string;
  system?: VpsSystemInfo;
  isAiEnabled: boolean; // Flag to indicate if AI features are active on the server
}

// --- Tipe untuk State Aplikasi ---
export type AppState = 'idle' | 'analyzing' | 'analyzed' | 'building' | 'simulating' | 'built' | 'deploying' | 'rollingBack' | 'success' | 'error';
export type AppStep = 'upload' | 'analyze' | 'build';

// --- Tipe untuk Notifikasi (Toast) ---
export interface ToastInfo {
    message: string;
    type: 'success' | 'error' | 'info';
}

// --- Tipe untuk Otentikasi ---
export interface HandshakeResponse {
  sessionToken: string;
  expiresIn: number; // in seconds
  sessionKeyBase64: string; // base64 encoded AES key
  wsUrl: string; // WebSocket URL for log stream
}

// --- Tipe untuk Log Stream ---
export interface VpsLogEntry {
    id: string;
    text: string;
    level?: string;
    timestamp?: number;
    meta?: any;
}

// --- Tipe untuk Deployment Response ---
export interface DeployResponse {
  success: boolean;
  message: string;
  // encryptedLogs is now removed and handled via WebSocket
}

// --- Tipe untuk Phase 4: System Health ---
export type SystemHealthLevel = "Nominal" | "Warning" | "Critical" | "Unknown";

export interface SystemHealthInsight {
    level: SystemHealthLevel;
    message: string; // AI-generated insight
    metrics: {
        successRate: number; // percentage
        avgDeployTime: number; // seconds
    }
}

// --- Tipe untuk Phase 5: Adaptive Auto-Tuning ---
export type AdaptivePolicy = "IMMEDIATE" | "DELAYED" | "MANUAL_APPROVAL";

export interface AdaptiveConfig {
    policy: AdaptivePolicy;
    deployDelayInSeconds: number;
    reason: string; // AI-generated reason for the policy
    confidence: number; // 0..1 confidence score from AI
    suggestedActions: string[]; // List of suggested actions for the operator
    cooldownSeconds: number;
    maxConcurrentDeploys: number;
    generatedAt: string; // ISO timestamp
}


// --- Tipe untuk Reinforcement Memory Layer (Fase 6) ---

export interface Outcome {
  success: boolean;
  deployStartedAt?: string;
  deployFinishedAt?: string;
  healthCheckPassed?: boolean;
  notes?: string;
}

export interface FeedbackRecord {
  id: string;
  project: string;
  environment: string;
  decision: AdaptiveConfig;
  outcome: Outcome;
  systemMetricsSnapshot: VpsSystemInfo | null;
  logSummary: string;
  actor: "auto" | "operator";
  createdAt: number;
}

export interface FeedbackSummary {
  accuracyRate: number;
  total: number;
  successCount: number;
  averageConfidence: number | null; // Rata-rata confidence score AI (0-1)
  trend: { label: string; accuracy: number | null }[];
}


// --- Tipe untuk Fase 3: Intelligent Decision Tree ---

export type Timestamp = string;

export type DecisionContext = {
  project: string;
  deploymentId?: string;
  timestamp?: Timestamp;
  outcome?: 'SUCCESS' | 'FAIL' | 'PARTIAL' | 'UNKNOWN';
  metrics?: {
    cpu?: number;        // percentage 0-100
    memory?: number;     // percentage 0-100
    latencyMs?: number;
    errorRate?: number;  // 0-1
    diskAvailPct?: number;
    healthChecksFailed?: number;
    successRate?: number;
    avgDeployTime?: number;
  };
  recentTrend?: {       // from reinforcementMemory summary
    accuracy7d?: number;   // 0-1
    dailyAccuracy?: Array<{ date: string; accuracy: number }>;
  };
  adaptiveConfig?: Record<string, any>; // current adaptive settings
  operatorOverride?: boolean;
  notes?: string;
};

export type IDTAction = {
  id: string;
  label: string;
  level?: 'INFO' | 'WARN' | 'CRITICAL';
  auto?: boolean;          // apakah bisa dieksekusi otomatis
  recommendManual?: boolean; // rekomendasikan operator approval
  payload?: Record<string, any>;
};

export type IDTNode = {
  id: string;
  description?: string;
  condition?: (ctx: DecisionContext) => boolean;
  actions?: IDTAction[];           // actions to take when node matches
  children?: IDTNode[];            // further checks
  fallback?: IDTAction[];          // actions if no children matched
};