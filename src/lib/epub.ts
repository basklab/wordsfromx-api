export type ParsedChapter = { idx: number; title: string; content: string };
export type ParsedBook = { title: string; author: string | null; chapters: ParsedChapter[] };

export async function parseEpub(_bytes: Uint8Array): Promise<ParsedBook> {
  return {
    title: "Mock EPUB",
    author: null,
    chapters: [{ idx: 0, title: "Chapter 1", content: "Mock chapter content." }],
  };
}
