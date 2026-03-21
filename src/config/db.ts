// src/config/db.ts
import pkg from "pg";
const { Pool } = pkg;

declare global { var _pgPool: pkg.Pool | undefined; }

function makePool(): pkg.Pool {
  const pool = new Pool({
    connectionString:             process.env.DATABASE_URL,
    max:                          8,
    min:                          1,
    idleTimeoutMillis:            60_000,
    connectionTimeoutMillis:      15_000,   // remote server needs extra time
    keepAlive:                    true,
    keepAliveInitialDelayMillis:  10_000,
  });

  pool.on("error", (err) =>
    console.error("[DB Pool] idle client error:", err.message),
  );

  return pool;
}

if (!global._pgPool) global._pgPool = makePool();
const pool: pkg.Pool = global._pgPool;

/**
 * Run a query with one automatic retry on transient connection errors.
 * Handles remote server blips without crashing the process.
 */
export async function query(
  text:    string,
  params?: any[],
  retries = 1,
): Promise<pkg.QueryResult> {
  try {
    return await pool.query(text, params);
  } catch (err: any) {
    const transient =
      err.message?.includes("Connection terminated") ||
      err.message?.includes("timeout") ||
      err.code === "57P01"; // admin_shutdown

    if (transient && retries > 0) {
      await new Promise((r) => setTimeout(r, 600));
      return query(text, params, retries - 1);
    }
    throw err;
  }
}

export default pool;