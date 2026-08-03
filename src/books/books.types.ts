type GutendexBook = {
  id: number;
  title: string;
  authors: { name: string; birth_year: number | null; death_year: number | null }[];
  languages: string[];
  subjects: string[];
  download_count: number;
  formats: Record<string, string>;
};

type GutendexSearch = {
  count: number;
  results: GutendexBook[];
};

type Book = {
  id: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  metadata: { languages: string[]; subjects: string[]; downloadCount: number };
};

export type { Book, GutendexBook, GutendexSearch };
