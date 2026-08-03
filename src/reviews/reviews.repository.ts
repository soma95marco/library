import { eq } from "drizzle-orm";
import { db } from "../db/client.ts";
import { books, type NewReview, type Review, reviews, type StoredBook } from "../db/schema.ts";

type ReviewWithBook = { review: Review; book: StoredBook | null };

const insertReview = async (review: NewReview): Promise<void> => {
  await db.insert(reviews).values(review);
};

// left join: the book row shows up only once the worker has fetched it
const findReview = async (id: string): Promise<ReviewWithBook | null> => {
  const [row] = await db
    .select({ review: reviews, book: books })
    .from(reviews)
    .leftJoin(books, eq(reviews.bookId, books.id))
    .where(eq(reviews.id, id));
  return row ?? null;
};

const updateReview = async (id: string, fields: Partial<NewReview>): Promise<void> => {
  await db.update(reviews).set(fields).where(eq(reviews.id, id));
};

const deleteReview = async (id: string): Promise<number> => {
  const [result] = await db.delete(reviews).where(eq(reviews.id, id));
  return result.affectedRows;
};

export { deleteReview, findReview, insertReview, type ReviewWithBook, updateReview };
