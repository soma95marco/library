import { expect, test } from "vitest";
import { createReviewSchema } from "../src/reviews/reviews.schemas.ts";

const valid = { id: "1342", review: "a solid reread after ten years", score: 6 };

test("rejects a score outside the one to ten scale", () => {
  const result = createReviewSchema.safeParse({ ...valid, score: 11 });

  expect(result.success).toBe(false);
  expect(result.error?.issues[0]?.path).toEqual(["score"]);
});

test("rejects a review that is only whitespace", () => {
  const result = createReviewSchema.safeParse({ ...valid, review: "              " });

  expect(result.success).toBe(false);
  expect(result.error?.issues[0]?.path).toEqual(["review"]);
});
