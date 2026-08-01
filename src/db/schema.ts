import {
  char,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";

export const reviews = mysqlTable("reviews", {
  id: char("id", { length: 36 }).primaryKey(),
  bookId: varchar("book_id", { length: 32 }).notNull(),
  content: text("content").notNull(),
  score: tinyint("score", { unsigned: true }).notNull(),
  status: mysqlEnum("status", ["pending", "ready", "failed"]).notNull().default("pending"),
  bookTitle: varchar("book_title", { length: 512 }),
  bookAuthors: json("book_authors").$type<string[]>(),
  bookCoverUrl: varchar("book_cover_url", { length: 1024 }),
  bookMetadata: json("book_metadata").$type<Record<string, unknown>>(),
  failureReason: varchar("failure_reason", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
