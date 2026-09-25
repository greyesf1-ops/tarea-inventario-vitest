import { Pool } from 'pg';
import { migrate } from './migrate.js';
if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL');
const pool = new Pool({connectionString: process.env.DATABASE_URL});
try { await migrate(pool); console.log('Migraciones aplicadas'); } finally { await pool.end(); }
