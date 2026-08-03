import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import nock from "nock";
import { afterAll, afterEach, beforeEach, expect, test } from "vitest";
import { config } from "../src/config.ts";
import { db, pool } from "../src/db/client.ts";
import { books } from "../src/db/schema.ts";
import { enrichReview } from "../src/reviews/reviews.consumer.ts";
import * as repo from "../src/reviews/reviews.repository.ts";

const book = {
  id: 1342,
  title: "Pride and Prejudice",
  authors: [{ name: "Austen, Jane", birth_year: 1775, death_year: 1817 }],
  languages: ["en"],
  subjects: ["Love stories"],
  download_count: 136926,
  formats: { "image/jpeg": "https://gutenberg.org/cover.jpg" },
};

const reviewId = randomUUID();

beforeEach(async () => {
  // the book may already be cached from an earlier run, and these tests assert on the fixture
  await db.delete(books).where(eq(books.id, "1342"));
  await repo.insertReview({
    id: reviewId,
    bookId: "1342",
    content: "a solid reread after ten years",
    score: 6,
  });
});

afterEach(async () => {
  await repo.deleteReview(reviewId);
  await db.delete(books).where(eq(books.id, "1342"));
  nock.cleanAll();
});

afterAll(async () => {
  await pool.end();
});

test("stores the book and marks the review ready", async () => {
  nock(config.GUTENDEX_URL).get("/books/1342/").reply(200, book);

  expect(await enrichReview(reviewId)).toBe("ready");
  expect(await repo.findReview(reviewId)).toMatchObject({
    review: { status: "ready", failureReason: null },
    book: {
      title: "Pride and Prejudice",
      authors: ["Austen, Jane"],
      coverUrl: "https://gutenberg.org/cover.jpg",
    },
  });
});

test("does not call gutendex again for a book already stored", async () => {
  const scope = nock(config.GUTENDEX_URL).get("/books/1342/").reply(200, book);
  await enrichReview(reviewId);
  expect(scope.isDone()).toBe(true);

  const second = randomUUID();
  await repo.insertReview({ id: second, bookId: "1342", content: "same book again", score: 8 });
  // no interceptor is registered, so any outgoing request would make this throw
  nock.disableNetConnect();

  expect(await enrichReview(second)).toBe("ready");
  nock.enableNetConnect();
  await repo.deleteReview(second);
});

test("marks the review failed when the book left the catalogue", async () => {
  nock(config.GUTENDEX_URL).get("/books/1342/").reply(404, { detail: "No Book matches the query" });

  expect(await enrichReview(reviewId)).toBe("failed");
  expect(await repo.findReview(reviewId)).toMatchObject({
    review: { status: "failed", failureReason: "book 1342 is no longer available" },
    book: null,
  });
});
