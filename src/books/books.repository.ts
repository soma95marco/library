import { eq } from "drizzle-orm";
import { config } from "../config.ts";
import { db } from "../db/client.ts";
import { books, type StoredBook } from "../db/schema.ts";
import type { Book } from "./books.types.ts";

const MAX_AGE_MS = config.BOOK_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

const findBook = async (id: string): Promise<StoredBook | null> => {
  const [row] = await db.select().from(books).where(eq(books.id, id));
  return row ?? null;
};

// gutenberg titles and authors never change, only the counters do, hence the generous default
const isStale = (book: StoredBook): boolean => Date.now() - book.fetchedAt.getTime() > MAX_AGE_MS;

// two reviews for an unknown book can race here, hence the upsert instead of a plain insert
const saveBook = async (book: Book): Promise<void> => {
  const row = {
    id: book.id,
    title: book.title,
    authors: book.authors,
    coverUrl: book.coverUrl,
    metadata: book.metadata,
    fetchedAt: new Date(),
  };
  await db.insert(books).values(row).onDuplicateKeyUpdate({ set: row });
};

export { findBook, isStale, saveBook };
