// server/scripts/migrate.js
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// --- Configuration ---
const DB_ENGINE = process.env.DB_ENGINE || 'sqlite';

// Resolve paths from the script's location to avoid CWD issues.
const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const MIGRATIONS_DIR = path.resolve(SCRIPT_DIR, '../migrations');

// For SQLite, use SQLITE_DB env var for the full path, or default to a local dev db.
const SQLITE_DB_FILE = process.env.SQLITE_DB || path.resolve(SCRIPT_DIR, '../data/reinforcement.db');

// --- Main Dispatcher ---
function runMigrations() {
  console.log(`[Migrate] Starting migration process for '${DB_ENGINE}' engine.`);

  try {
    if (DB_ENGINE === 'postgres') {
      if (!process.env.PGUSER || !process.env.PGDATABASE) {
        console.error('❌ [Migrate-PG] Error: PGUSER and PGDATABASE environment variables must be set for PostgreSQL.');
        process.exit(1);
      }
      const pgFiles = fs.readdirSync(MIGRATIONS_DIR)
        .filter(file => file.endsWith('_pg.sql'))
        .sort();
      
      if (pgFiles.length === 0) {
        console.warn('[Migrate-PG] No PostgreSQL migration files found.');
        return;
      }

      console.log(`[Migrate-PG] Found ${pgFiles.length} migration files.`);
      for (const file of pgFiles) {
        const filePath = path.join(MIGRATIONS_DIR, file);
        console.log(`[Migrate-PG] Applying: ${file}...`);
        // We use an environment variable for PGPASSWORD if it's set
        const command = `psql -v ON_ERROR_STOP=1 -U "${process.env.PGUSER}" -d "${process.env.PGDATABASE}" -f "${filePath}"`;
        execSync(command, { stdio: 'inherit' });
      }

    } else { // Default to SQLite
      const sqliteDir = path.dirname(SQLITE_DB_FILE);
      if (!fs.existsSync(sqliteDir)) {
          console.log(`[Migrate-SQLite] Creating directory: ${sqliteDir}`);
          fs.mkdirSync(sqliteDir, { recursive: true });
      }
      
      const sqliteFiles = fs.readdirSync(MIGRATIONS_DIR)
        .filter(file => file.endsWith('.sql') && !file.endsWith('_pg.sql'))
        .sort();

      if (sqliteFiles.length === 0) {
        console.warn('[Migrate-SQLite] No SQLite migration files found.');
        return;
      }
        
      console.log(`[Migrate-SQLite] Found ${sqliteFiles.length} migration files for database at ${SQLITE_DB_FILE}.`);
      for (const file of sqliteFiles) {
        const filePath = path.join(MIGRATIONS_DIR, file);
        console.log(`[Migrate-SQLite] Applying: ${file}...`);
        execSync(`sqlite3 "${SQLITE_DB_FILE}" < "${filePath}"`, { stdio: 'inherit' });
      }
    }
    console.log(`✅ [Migrate] Migration process completed successfully for '${DB_ENGINE}'.`);
  } catch (err) {
    console.error(`❌ [Migrate] Migration failed during execution.`);
    // execSync throws an object with stderr, stdout properties on error.
    if (err.stderr) {
        console.error("Error Details:", err.stderr.toString());
    } else {
        console.error("Full Error:", err);
    }
    process.exit(1);
  }
}

runMigrations();