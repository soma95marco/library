import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { config } from "../config.ts";
import * as schema from "./schema.ts";

const pool = mysql.createPool(config.DATABASE_URL);

const db = drizzle(pool, { schema, mode: "default" });

export { db, pool };
