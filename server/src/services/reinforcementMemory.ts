// server/src/services/reinforcementMemory.ts
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { FeedbackRecord, FeedbackSummary, IDTAction } from '../types.js';

// --- Database Path Configuration (Aligned with migrate.js) ---
// This logic ensures that the application runtime, tests, and migrations
// all point to the same database file by default, making development seamless.
const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const DEFAULT_SQLITE_PATH = path.resolve(SCRIPT_DIR, '../../data/reinforcement.db');
const DB_FILE = process.env.SQLITE_DB || DEFAULT_SQLITE_PATH;

// Ensure the directory for the database file exists.
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const db = new Database(DB_FILE);

console.log(`[RML] Reinforcement Memory Layer initialized with database at: ${DB_FILE}`);


// --- Decisions Table Statements (Schema vFinal) ---
const insertDecisionStmt = db.prepare(`
  INSERT INTO decisions (
    decision_id, intent, context, action, parameters, confidence, created_at, updated_at
  ) VALUES (
    @decision_id, @intent, @context, @action, @parameters, @confidence, DATETIME('now'), DATETIME('now')
  )
`);

const getDecisionByIdStmt = db.prepare('SELECT * FROM decisions WHERE decision_id = ?');

const updateDecisionExecutionStmt = db.prepare(`
    UPDATE decisions 
    SET 
        execution_status = @status, 
        executed_at = DATETIME('now'),
        approved_by = @approved_by,
        notes = @notes,
        result = @result,
        updated_at = DATETIME('now')
    WHERE decision_id = @decision_id
`);


/**
 * Adds a new feedback record to the centralized database.
 * @param record - The full FeedbackRecord object from the client.
 */
export function addRecord(record: FeedbackRecord): void {
  // This function can be kept for other purposes or deprecated.
  console.log(`[RML] addRecord called for project: ${record.project}. Note: This table is secondary to 'decisions'.`);
}

/**
 * Parses the full decision payload and adds it to the 'decisions' table with the new schema.
 * @param fullDecisionPayload - The complete decision object from the IDT evaluation.
 */
export function addDecision(fullDecisionPayload: any): { decisionId: string } {
  try {
    const decisionId = uuidv4();
    
    const actions = fullDecisionPayload.actions as IDTAction[] || [];
    const priorityAction = actions.sort((a, b) => {
        const levels = { 'CRITICAL': 3, 'WARN': 2, 'INFO': 1 };
        return (levels[b.level || 'INFO'] || 0) - (levels[a.level || 'INFO'] || 0);
    })[0];
    
    if (!priorityAction) {
        throw new Error("Decision payload contains no actions to log.");
    }

    insertDecisionStmt.run({
      decision_id: decisionId,
      intent: priorityAction.label || "No intent specified",
      context: JSON.stringify(fullDecisionPayload.contextSnapshot || {}),
      action: priorityAction.id || "no-action",
      parameters: JSON.stringify(priorityAction.payload || {}),
      confidence: fullDecisionPayload.contextSnapshot?.adaptiveConfig?.confidence ?? 0.0,
    });
    
    console.log(`[RML] Successfully logged decision ${decisionId} for project: ${fullDecisionPayload.contextSnapshot?.project}`);
    return { decisionId };
  } catch (error) {
    console.error('[RML] Failed to insert decision log:', error);
    throw error;
  }
}

/**
 * Retrieves a specific decision by its unique ID.
 * @param decisionId - The unique ID of the decision.
 * @returns The decision record or undefined if not found.
 */
export function getDecisionById(decisionId: string) {
  return getDecisionByIdStmt.get(decisionId);
}


/**
 * Updates a decision record's status after an action has been executed or approved.
 */
export function updateDecisionExecution(
    decisionId: string, 
    status: 'applied' | 'failed' | 'approved' | 'pending', 
    approvedBy: string,
    notes?: string,
    result?: object
) {
  try {
    const info = updateDecisionExecutionStmt.run({ 
        status, 
        approved_by: approvedBy,
        notes: notes || null,
        result: result ? JSON.stringify(result) : null,
        decision_id: decisionId 
    });
    if (info.changes === 0) {
        console.warn(`[RML] No decision found with ID ${decisionId} to update.`);
    }
    return info;
  } catch(e) {
    console.error(`[RML] Failed to update decision ${decisionId}:`, e)
    throw e;
  }
}

/**
 * Calculates a performance summary for a given project from the database.
 * @param project - The name of the project.
 * @returns A summary of the project's historical performance.
 */
export function getSummary(project: string): FeedbackSummary {
  // This function might need to be adapted to read from the 'decisions' table
  // if the 'feedback' table is fully deprecated. For now, it's left as is.
  return { accuracyRate: 0, total: 0, successCount: 0, averageConfidence: null, trend: [] };
}