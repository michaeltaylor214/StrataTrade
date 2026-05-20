/**
 * Migration runner — executes SQL files in /db/migrations in filename order.
 * Tracks applied migrations in a migrations table so reruns are safe.
 *
 * Usage: npx ts-node db/migrate.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate(): Promise<void> {
  const client = await pool.connect();

  try {
    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        filename   VARCHAR(300) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const applied = await client.query<{ filename: string }>(
      'SELECT filename FROM _migrations ORDER BY filename'
    );
    const appliedSet = new Set(applied.rows.map(r => r.filename));

    let count = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  skip  ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations(filename) VALUES($1)', [file]);
        await client.query('COMMIT');
        console.log(`  apply ${file}`);
        count++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  FAIL  ${file}`, err);
        process.exit(1);
      }
    }

    console.log(`\nMigrations complete. ${count} file(s) applied.`);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
