import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema';

// This is a workaround to declare a global variable in TypeScript for the connection pool.
declare global {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    var dbPool: Pool | undefined;
}

let pool: Pool;
let connectionString = process.env.DATABASE_URL;

// If DATABASE_URL is not set, try to construct it from individual variables.
// This is useful for local development and handles special characters in passwords.
if (!connectionString && process.env.POSTGRES_HOST) {
    const user = encodeURIComponent(process.env.POSTGRES_USER || '');
    const password = encodeURIComponent(process.env.POSTGRES_PASSWORD || '');
    const host = process.env.POSTGRES_HOST;
    const port = process.env.POSTGRES_PORT || 5432;
    const database = process.env.POSTGRES_DATABASE;

    if (user && host && database) {
        connectionString = `postgres://${user}:${password}@${host}:${port}/${database}`;
    }
}

if (!connectionString) {
    throw new Error("Database connection details are not set. Please provide a DATABASE_URL or individual POSTGRES_* environment variables.");
}

// Prefer using a connection string if it's available (common in production environments like Vercel).
// Otherwise, construct the config from individual environment variables (great for local development).
const poolConfig: PoolConfig = { connectionString };

if (process.env.NODE_ENV === 'production') {
    // In production, use a single pool instance.
    if (!global.dbPool) {
        global.dbPool = new Pool(poolConfig);
    }
    pool = global.dbPool;
} else {
    // In development, create a new pool for each hot-reload to avoid issues.
    pool = new Pool(poolConfig);
}

// Export a single drizzle instance, initialized with our pool and schema.
export const db = drizzle(pool, { schema });