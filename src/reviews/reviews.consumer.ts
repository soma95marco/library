import { getBook } from "../books/books.client.ts";
import * as repo from "./reviews.repository.ts";

const markReviewFailed = async (reviewId: string, reason: string): Promise<void> => {
  // a stack-carrying message would be truncated by the column anyway, better to cut it here
  await repo.updateReview(reviewId, { status: "failed", failureReason: reason.slice(0, 255) });
};

type Outcome = "ready" | "failed" | "gone";

const enrichReview = async (reviewId: string): Promise<Outcome> => {
  const review = await repo.findReview(reviewId);
  // the review was deleted between the publish and now: nothing left to enrich
  if (!review) return "gone";

  const book = await getBook(review.bookId);
  // a book that disappeared from gutendex will not come back on a retry, so this is recorded
  // as a failure and the message is still acked instead of piling up in the dead letter queue
  if (!book) {
    await markReviewFailed(reviewId, `book ${review.bookId} is no longer available`);
    return "failed";
  }

  await repo.updateReview(reviewId, {
    status: "ready",
    bookTitle: book.title,
    bookAuthors: book.authors,
    bookCoverUrl: book.coverUrl,
    bookMetadata: book.metadata,
    failureReason: null,
  });
  return "ready";
};

export { enrichReview, markReviewFailed };
