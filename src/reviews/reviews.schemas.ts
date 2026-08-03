import { z } from "zod";

const searchQuerySchema = z.object({
  q: z.string().trim().min(2),
});

// field names come from the assignment: id is the book id, review is the text
const createReviewSchema = z.object({
  id: z.string().trim().min(1).max(32),
  review: z.string().trim().min(10).max(2000),
  score: z.number().int().min(1).max(10),
});

// a PUT replaces the whole review, so both fields stay required
const updateReviewSchema = createReviewSchema.omit({ id: true });

export { createReviewSchema, searchQuerySchema, updateReviewSchema };
