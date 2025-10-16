/**
 * SAT18 Engine – Persistence Verification Module
 * --------------------------------------------------
 * This script validates schema consistency between:
 * 1. The live database (SQLite or PostgreSQL)
 * 2. The expected schema for the ReinforcementMemory service.
 *
 * It acts as a "health check" for the data layer.
 *
 * All praise and thanks are due to Allah.
 * Powered by Google, Gemini, and AI Studio.
 * Development assisted by OpenAI technologies.
 * © 2025 SAT18 Official
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// --- Configuration (Aligned with migrate.js and reinforcementMemory.ts) ---
const DB_ENGINE = process.env.DB_ENGINE || 'sqlite';

// Resolve paths from the script's location to avoid CWD issues.
const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);

// For SQLite, use SQLITE_DB env var for the full path, or default to the consistent data path.
const SQLITE_DB_FILE = process.env.SQLITE_DB || path.resolve(SCRIPT_DIR, '../data/reinforcement.db');
const POSTGRES_URL = process.env.DATABASE_URL;


// --- Helper Functions ---

/**
 * Runs a query against the configured database.
 * @param {string} query - The SQL query to execute.
 * @returns {string | null} The trimmed result of the query or null on failure.
 */
function queryDB(query) {
  try {
    if (DB_ENGINE === "sqlite") {
      if (!fs.existsSync(SQLITE_DB_FILE)) {
          throw new Error(`SQLite database file not found at ${SQLITE_DB_FILE}. Please run migrations first.`);
      }
      const result = execSync(`sqlite3 "${SQLITE_DB_FILE}" "${query}"`).toString();
      return result.trim();
    } else { // postgres
      if (!POSTGRES_URL) throw new Error("DATABASE_URL must be set for PostgreSQL verification.");
      return execSync(`psql "${POSTGRES_URL}" -t -c "${query}"`).toString().trim();
    }
  } catch (err) {
    // Check if error is because table doesn't exist
    if (err.stderr && (err.stderr.toString().includes('no such table') || err.stderr.toString().includes('does not exist'))) {
        return ''; // Return empty string to be handled as "table not found"
    }
    console.error(`Query failed for ${DB_ENGINE}:`, err.message);
    return null;
  }
}

/**
 * Verifies the 'decisions' table schema against the expected structure.
 */
function verifySchema() {
  console.log(`🔍 Verifying persistence for '${DB_ENGINE.toUpperCase()}'...`);

  // This list MUST match the final schema in the `002_create_decisions_table*.sql` migration files.
  const expectedColumns = [
    "decision_id",
    "intent",
    "context",
    "action",
    "parameters",
    "confidence",
    "execution_status",
    "approved_by",
    "notes",
    "result",
    "created_at",
    "updated_at",
    "executed_at"
  ];

  const query =
    DB_ENGINE === "sqlite"
      ? "PRAGMA table_info(decisions);"
      : "SELECT column_name FROM information_schema.columns WHERE table_name = 'decisions' ORDER BY ordinal_position;";

  const result = queryDB(query);
  
  if (result === null) {
      throw new Error("A critical error occurred while querying the database.");
  }
  
  if (result === '') {
      throw new Error("Unable to query 'decisions' table. It might not exist. Please run migrations.");
  }

  const actualColumns = result.split("\n").map(r => {
      // SQLite output is pipe-delimited, PostgreSQL is just the column name.
      const parts = r.split("|");
      return DB_ENGINE === 'sqlite' ? parts[1] : r.trim();
  }).filter(Boolean); // Filter out empty strings from splitting

  const missing = expectedColumns.filter(col => !actualColumns.includes(col));
  const extra = actualColumns.filter(col => !expectedColumns.includes(col));

  if (missing.length > 0) {
    console.error("❌ Schema mismatch detected. The following expected columns are MISSING:", missing);
    process.exitCode = 1;
  } else if (extra.length > 0) {
    console.warn("⚠️ Schema has extra columns not defined in the verifier:", extra);
    console.warn("   This may be acceptable if due to a new, unverified migration.");
    console.log("✅ Schema integrity verified. All expected columns are present.");
  } else {
    console.log("✅ Schema integrity verified. All columns are present and consistent.");
  }
}

// --- Main Execution ---
try {
  verifySchema();
  if (!process.exitCode) {
    console.log("🧩 Reinforcement Memory layer sync check passed.");
  }
} catch (err) {
  console.error("⚠️ Persistence verification failed:", err.message);
  process.exitCode = 1;
}