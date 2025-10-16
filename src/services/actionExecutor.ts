// src/services/actionExecutor.ts
// CATATAN: File ini adalah stub sisi server dan harus berada di backend.
// Untuk tujuan demonstrasi arsitektur, kita letakkan di sini.
// Dalam implementasi nyata, ini akan dipanggil oleh logika backend setelah menerima sinyal.

// import { updateDecisionExecution } from '../../server/src/services/reinforcementMemory'; // path relatif sesuai proyek
import { execFile } from 'child_process';
import { promisify } from 'util';

// Di lingkungan Node.js, ini akan berfungsi. Di browser, ini akan menjadi stub.
const execFileAsync = typeof window === 'undefined' ? promisify(execFile) : async () => ({ stdout: 'simulated', stderr: '' });

const ACTIONS_DIR = process.env.ACTIONS_DIR || '/srv/sat18/actions';

type ActionPayload = {
  method?: string;
  scaleBy?: number;
  release?: string;
  /* ... */
};

/**
 * Executes a pre-approved action script safely.
 * This function is designed to run on the server, not the client.
 * @param decisionId - The ID of the decision that triggered this action.
 * @param actionId - The ID of the action to perform (e.g., 'rollback').
 * @param payload - Data required by the action script.
 */
export async function executeActionSafe(decisionId: string, actionId: string, payload: ActionPayload) {
  // Map actionId to an allowed, existing script file to prevent command injection.
  const actionMap: Record<string, string> = {
    'rollback': 'rollback.sh',
    'scale-up': 'scale-up.sh',
    'notify-oncall': 'notify-oncall.sh'
  };

  const script = actionMap[actionId];
  if (!script) {
    console.error(`[ActionExecutor] Unknown action: ${actionId}`);
    throw new Error('Unknown or unmapped action');
  }

  const scriptPath = `${ACTIONS_DIR}/${script}`;

  // Sanitize arguments passed to the shell script.
  const args: string[] = [];
  if (payload?.release) args.push(payload.release);
  if (payload?.scaleBy) args.push(String(payload.scaleBy));

  console.log(`[ActionExecutor] Preparing to execute: ${scriptPath} with args: ${args.join(' ')}`);

  // In a real scenario, you'd call the actual server-side update function.
  const updateDecisionExecution = (id: string, summary: string, status: 'APPLIED' | 'FAILED') => {
      console.log(`[ActionExecutor] DB UPDATE: ID=${id}, Status=${status}, Summary=${summary}`);
      // This would be a fetch call to an internal API or a direct DB call on the server.
  };

  try {
    // Execute the script file, which is safer than executing a raw command.
    const { stdout, stderr } = await execFileAsync(scriptPath, args, { timeout: 1000 * 60 * 5 });
    
    // Update the database to mark the decision as successfully executed.
    updateDecisionExecution(decisionId, JSON.stringify({ actionId, stdout, stderr }), 'APPLIED');
    console.log(`[ActionExecutor] Success: ${stdout}`);
    return { ok: true, stdout, stderr };

  } catch (err) {
    // Update the database to mark the execution as failed.
    const errorMessage = err instanceof Error ? err.message : String(err);
    updateDecisionExecution(decisionId, JSON.stringify({ actionId, error: errorMessage }), 'FAILED');
    console.error(`[ActionExecutor] Failed to execute ${actionId}:`, err);
    throw err;
  }
}
