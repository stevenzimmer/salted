import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";
neonConfig.webSocketConstructor = ws;
function connect(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL is required.");
  const pool = new Pool({
    connectionString: url,
    max: 4,
    connectionTimeoutMillis: 10_000,
  });
  return { pool, db: drizzle({ client: pool, schema }) };
}
export type Database = ReturnType<typeof connect>["db"];
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export async function withDatabase<T>(
  operation: (db: Database) => Promise<T>,
  url?: string,
): Promise<T> {
  const { db, pool } = connect(url);
  try {
    return await operation(db);
  } finally {
    await pool.end();
  }
}
