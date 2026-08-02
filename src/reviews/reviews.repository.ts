import { eq } from "drizzle-orm";
import { db } from "../db/client.ts";
import { type NewReview, type Review, reviews } from "../db/schema.ts";

const insertReview = async (review: NewReview): Promise<void> => {
  await db.insert(reviews).values(review);
};

const findReview = async (id: string): Promise<Review | null> => {
  const [row] = await db.select().from(reviews).where(eq(reviews.id, id));
  return row ?? null;
};

const updateReview = async (id: string, fields: Partial<NewReview>): Promise<void> => {
  await db.update(reviews).set(fields).where(eq(reviews.id, id));
};

const deleteReview = async (id: string): Promise<number> => {
  const [result] = await db.delete(reviews).where(eq(reviews.id, id));
  return result.affectedRows;
};

export { deleteReview, findReview, insertReview, updateReview };
