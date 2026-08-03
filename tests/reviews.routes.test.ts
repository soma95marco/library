import nock from "nock";
import { afterAll, afterEach, expect, test } from "vitest";
import { buildApp } from "../src/api.ts";
import { config } from "../src/config.ts";
import { pool } from "../src/db/client.ts";
import * as repo from "../src/reviews/reviews.repository.ts";

const book = {
  id: 1342,
  title: "Pride and Prejudice",
  authors: [{ name: "Austen, Jane", birth_year: 1775, death_year: 1817 }],
  languages: ["en"],
  subjects: [],
  download_count: 136926,
  formats: { "image/jpeg": "https://gutenberg.org/cover.jpg" },
};

const published: string[] = [];
const app = buildApp(async (reviewId) => {
  published.push(reviewId);
}, false);

const postReview = () => {
  nock(config.GUTENDEX_URL).get("/books/1342/").reply(200, book);
  return app.inject({
    method: "POST",
    url: "/review",
    payload: { id: "1342", review: "a solid reread after ten years", score: 6 },
  });
};

afterEach(async () => {
  for (const id of published) await repo.deleteReview(id);
  published.length = 0;
  nock.cleanAll();
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

test("accepts a review and hands back a reference to poll", async () => {
  const response = await postReview();

  expect(response.statusCode).toBe(202);
  expect(response.json()).toMatchObject({ status: "pending" });
  expect(response.headers.location).toBe(`/review/${response.json().id}`);
  expect(published).toEqual([response.json().id]);
});

test("does not queue the enrichment again when a review is updated", async () => {
  const { id } = (await postReview()).json();

  const response = await app.inject({
    method: "PUT",
    url: `/review/${id}`,
    payload: { review: "second thoughts, still a good one", score: 9 },
  });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({ score: 9, review: "second thoughts, still a good one" });
  expect(published).toHaveLength(1);
});

test("answers an invalid payload with the validation error shape", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/review",
    payload: { id: "1342", review: "too short", score: 6 },
  });

  expect(response.statusCode).toBe(400);
  expect(response.json()).toMatchObject({
    error: "validation failed",
    details: [{ path: "review" }],
  });
});
