import { randomUUID } from "node:crypto";
import { getBook, searchBooks } from "../books/books.client.ts";
import * as booksRepo from "../books/books.repository.ts";
import type { Book } from "../books/books.types.ts";
import { AppError } from "../http/errors.ts";
import type { ReviewWithBook } from "./reviews.repository.ts";
import * as repo from "./reviews.repository.ts";

type PublishReview = (reviewId: string) => Promise<void>;
type CreateReview = { bookId: string; content: string; score: number };
type UpdateReview = { content: string; score: number };

const loadReview = async (id: string): Promise<ReviewWithBook> => {
  const found = await repo.findReview(id);
  if (!found) throw new AppError(404, "review not found");
  return found;
};

const searchCatalog = (query: string): Promise<Book[]> => searchBooks(query);

const createReview = async (
  input: CreateReview,
  publish: PublishReview,
): Promise<ReviewWithBook> => {
  // a book we already store needs no round trip; otherwise the id is checked here and not in the
  // worker, so a wrong one fails the request itself
  if (!(await booksRepo.findBook(input.bookId))) {
    if (!(await getBook(input.bookId))) throw new AppError(404, "book not found");
  }

  const id = randomUUID();
  await repo.insertReview({ id, bookId: input.bookId, content: input.content, score: input.score });

  try {
    await publish(id);
  } catch (error) {
    // nothing would ever pick this row up, so it goes rather than sit pending forever
    await repo.deleteReview(id);
    throw new AppError(503, "review could not be queued, try again", { cause: error });
  }

  return loadReview(id);
};

const getReview = (id: string): Promise<ReviewWithBook> => loadReview(id);

// no republish: score and content are ours, the book the review points at did not change
const updateReview = async (id: string, input: UpdateReview): Promise<ReviewWithBook> => {
  await repo.updateReview(id, input);
  return loadReview(id);
};

const deleteReview = async (id: string): Promise<void> => {
  const deleted = await repo.deleteReview(id);
  if (!deleted) throw new AppError(404, "review not found");
};

export { createReview, deleteReview, getReview, type PublishReview, searchCatalog, updateReview };
