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

// keyed by the gutendex id, so the same book reviewed a hundred times is fetched and stored once
const books = mysqlTable("books", {
  id: varchar("id", { length: 32 }).primaryKey(),
  title: varchar("title", { length: 512 }).notNull(),
  authors: json("authors").$type<string[]>().notNull(),
  coverUrl: varchar("cover_url", { length: 1024 }),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
});

// book_id is not a foreign key on purpose: the review is written before the book row exists
const reviews = mysqlTable("reviews", {
  id: char("id", { length: 36 }).primaryKey(),
  bookId: varchar("book_id", { length: 32 }).notNull(),
  content: text("content").notNull(),
  score: tinyint("score", { unsigned: true }).notNull(),
  status: mysqlEnum("status", ["pending", "ready", "failed"]).notNull().default("pending"),
  failureReason: varchar("failure_reason", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

type Review = typeof reviews.$inferSelect;
type NewReview = typeof reviews.$inferInsert;
type StoredBook = typeof books.$inferSelect;

export { books, type NewReview, type Review, reviews, type StoredBook };
