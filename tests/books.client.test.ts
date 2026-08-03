import { expect, test } from "vitest";
import { toBook } from "../src/books/books.client.ts";
import type { GutendexBook } from "../src/books/books.types.ts";

const raw: GutendexBook = {
  id: 1342,
  title: "Pride and Prejudice",
  authors: [{ name: "Austen, Jane", birth_year: 1775, death_year: 1817 }],
  languages: ["en"],
  subjects: ["Love stories"],
  download_count: 136926,
  formats: { "image/jpeg": "https://gutenberg.org/cover.jpg", "text/html": "https://ignored" },
};

test("maps a gutendex book onto the internal model", () => {
  expect(toBook(raw)).toEqual({
    id: "1342",
    title: "Pride and Prejudice",
    authors: ["Austen, Jane"],
    coverUrl: "https://gutenberg.org/cover.jpg",
    metadata: { languages: ["en"], subjects: ["Love stories"], downloadCount: 136926 },
  });

  // a book with no jpeg among its formats is normal on gutenberg, not an error
  expect(toBook({ ...raw, formats: { "text/html": "https://ignored" } }).coverUrl).toBeNull();
});
