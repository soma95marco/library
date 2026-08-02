import { z } from "zod";

const searchQuerySchema = z.object({
  q: z.string().trim().min(2),
});

const createReviewSchema = z.object({
  bookId: z.string().trim().min(1).max(32),
  content: z.string().trim().min(10).max(2000),
  score: z.number().int().min(1).max(10),
});

// a PUT replaces the whole review, so both fields stay required
const updateReviewSchema = createReviewSchema.omit({ bookId: true });

type CreateReview = z.infer<typeof createReviewSchema>;
type UpdateReview = z.infer<typeof updateReviewSchema>;

export {
  type CreateReview,
  createReviewSchema,
  searchQuerySchema,
  type UpdateReview,
  updateReviewSchema,
};
