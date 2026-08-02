import { config } from "../config.ts";
import type { Book, GutendexBook, GutendexSearch } from "./books.types.ts";

const TIMEOUT_MS = 10_000;

// paths keep their trailing slash: gutendex answers 301 without it, and the search endpoint
// can stall for tens of seconds, so we also cap every call instead of holding a request open
const request = (path: string): Promise<Response> =>
  fetch(new URL(path, config.GUTENDEX_URL), { signal: AbortSignal.timeout(TIMEOUT_MS) });

const toBook = (raw: GutendexBook): Book => ({
  id: String(raw.id),
  title: raw.title,
  authors: raw.authors.map((author) => author.name),
  coverUrl: raw.formats["image/jpeg"] ?? null,
  metadata: {
    languages: raw.languages,
    subjects: raw.subjects,
    downloadCount: raw.download_count,
  },
});

const searchBooks = async (query: string): Promise<Book[]> => {
  const res = await request(`/books/?search=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`gutendex search failed with ${res.status}`);

  const body = (await res.json()) as GutendexSearch;
  return body.results.map(toBook);
};

const getBook = async (id: string): Promise<Book | null> => {
  const res = await request(`/books/${encodeURIComponent(id)}/`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`gutendex lookup failed with ${res.status}`);

  return toBook((await res.json()) as GutendexBook);
};

export { getBook, searchBooks, toBook };
