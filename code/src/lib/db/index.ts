import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// This is a workaround to declare a global variable in TypeScript for the connection pool.
declare global {
    // eslint-disable-next-line no-var
    var dbPool: Pool | undefined;
}

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
    // In production, use a single pool instance.
    if (!global.dbPool) {
        global.dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
    }
    pool = global.dbPool;
} else {
    // In development, create a new pool for each hot-reload to avoid issues.
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
}

// Export a single drizzle instance, initialized with our pool and schema.
export const db = drizzle(pool, { schema });