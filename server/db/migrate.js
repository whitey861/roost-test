import pg from 'pg';
import bcrypt from 'bcrypt';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('Running migrations...');

    // Read and execute schema
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);

    console.log('Schema created successfully');

    // Check if seed data already exists
    const { rows } = await client.query('SELECT COUNT(*) FROM users');

    if (parseInt(rows[0].count) === 0) {
      console.log('Seeding initial data...');

      // Create admin user
      const adminPasswordHash = await bcrypt.hash('Admin1234!', 10);
      const adminResult = await client.query(
        `INSERT INTO users (email, name, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        ['admin@vaultsync.local', 'Admin User', adminPasswordHash, 'admin', true]
      );

      const adminId = adminResult.rows[0].id;

      // Create demo user
      const demoPasswordHash = await bcrypt.hash('Demo1234!', 10);
      await client.query(
        `INSERT INTO users (email, name, password_hash, role, created_by, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['demo@vaultsync.local', 'Demo User', demoPasswordHash, 'user', adminId, true]
      );

      console.log('Seed data created successfully');
      console.log('Admin account: admin@vaultsync.local / Admin1234!');
      console.log('Demo account: demo@vaultsync.local / Demo1234!');
    } else {
      console.log('Seed data already exists, skipping...');
    }

  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
