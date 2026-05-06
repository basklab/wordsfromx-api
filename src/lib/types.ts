export type Page = {
  idx: number;
  text: string;
};

export type Chapter = {
  idx: number;
  title: string;
  pages: Page[];
};

export type Book = {
  id: string;
  userId: string;
  title: string;
  author: string | null;
  fileName: string;
  chapterIdx: number;
  pageIdx: number;
  createdAt: string;
  chapters: Chapter[];
};

export type BookSummary = Omit<Book, "chapters"> & {
  chapterCount: number;
  pageCount: number;
};

export type Library = {
  books: Book[];
};

export type Profile = {
  id: string;
  sourceLang: string;
  targetLang: string;
};

export type VocabStatus = "tracking" | "known" | "ignored";

export type VocabRow = {
  userId: string;
  sourceLang: string;
  lemma: string;
  exposures: number;
  status: VocabStatus;
  firstSeen: string;
  lastSeen: string;
};
