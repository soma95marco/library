import { randomUUID } from "node:crypto";
import { getBook, searchBooks } from "../books/books.client.ts";
import type { Book } from "../books/books.types.ts";
import type { Review } from "../db/schema.ts";
import { AppError } from "../http/errors.ts";
import * as repo from "./reviews.repository.ts";
import type { CreateReview, UpdateReview } from "./reviews.schemas.ts";

type PublishReview = (reviewId: string) => Promise<void>;

const loadReview = async (id: string): Promise<Review> => {
  const review = await repo.findReview(id);
  if (!review) throw new AppError(404, "review not found");
  return review;
};

const searchCatalog = (query: string): Promise<Book[]> => searchBooks(query);

const createReview = async (input: CreateReview, publish: PublishReview): Promise<Review> => {
  // the book is checked here and not in the worker so a wrong id fails the request itself
  const book = await getBook(input.bookId);
  if (!book) throw new AppError(404, "book not found");

  const id = randomUUID();
  await repo.insertReview({ id, bookId: book.id, content: input.content, score: input.score });
  await publish(id);

  return loadReview(id);
};

const getReview = (id: string): Promise<Review> => loadReview(id);

// no republish: score and content are ours, the book data hanging off the review did not change
const updateReview = async (id: string, input: UpdateReview): Promise<Review> => {
  await repo.updateReview(id, input);
  return loadReview(id);
};

const deleteReview = async (id: string): Promise<void> => {
  const deleted = await repo.deleteReview(id);
  if (!deleted) throw new AppError(404, "review not found");
};

export { createReview, deleteReview, getReview, type PublishReview, searchCatalog, updateReview };
