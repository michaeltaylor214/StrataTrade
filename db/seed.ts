/**
 * Seed runner — applies all SQL files in /db/seeds in order.
 * Seeds are idempotent (ON CONFLICT DO NOTHING) — safe to rerun.
 *
 * Usage: npx ts-node db/seed.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed(): Promise<void> {
  const client = await pool.connect();

  try {
    const seedsDir = path.join(__dirname, 'seeds');
    const files = fs.readdirSync(seedsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      console.log(`  seeding ${file}...`);
      const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`  done    ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  FAIL    ${file}`, err);
        process.exit(1);
      }
    }

    console.log('\nSeeding complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
