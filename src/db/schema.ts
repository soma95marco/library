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

// the book columns are denormalised into the review instead of living in their own table: a
// book is only ever read through the review that references it, so a join would buy nothing
const reviews = mysqlTable("reviews", {
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

type Review = typeof reviews.$inferSelect;
type NewReview = typeof reviews.$inferInsert;

export { type NewReview, type Review, reviews };
