import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { config } from "../config.js";
import * as schema from "./schema.js";

export const pool = mysql.createPool(config.DATABASE_URL);

export const db = drizzle(pool, { schema, mode: "default" });
