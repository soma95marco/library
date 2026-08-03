import { getBook } from "../books/books.client.ts";
import * as booksRepo from "../books/books.repository.ts";
import * as repo from "./reviews.repository.ts";

type Outcome = "ready" | "failed" | "gone";

const markReviewFailed = async (reviewId: string, reason: string): Promise<void> => {
  // a stack-carrying message would be truncated by the column anyway, better to cut it here
  await repo.updateReview(reviewId, { status: "failed", failureReason: reason.slice(0, 255) });
};

const enrichReview = async (reviewId: string): Promise<Outcome> => {
  const found = await repo.findReview(reviewId);
  // the review was deleted between the publish and now: nothing left to enrich
  if (!found) return "gone";

  const { review, book } = found;
  if (!book || booksRepo.isStale(book)) {
    const fetched = await getBook(review.bookId);
    // a book that disappeared from gutendex will not come back on a retry, so this is recorded
    // as a failure and the message is still acked instead of piling up in the dead letter queue
    if (!fetched) {
      await markReviewFailed(reviewId, `book ${review.bookId} is no longer available`);
      return "failed";
    }
    await booksRepo.saveBook(fetched);
  }

  await repo.updateReview(reviewId, { status: "ready", failureReason: null });
  return "ready";
};

export { enrichReview, markReviewFailed };
