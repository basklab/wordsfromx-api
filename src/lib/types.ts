export type Page = {
  idx: number;
  text: string;
  chapterTitle?: string;
};

export type Book = {
  id: string;
  userId: string;
  title: string;
  author: string | null;
  fileName: string;
  pageIdx: number;
  createdAt: string;
  pages: Page[];
};

export type BookSummary = Omit<Book, "pages"> & {
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
