import type { Chapter, Page } from "./types";

const TARGET_PAGE_CHARS = 1600;

export function paginateChapter(content: string): Page[] {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const pages: Page[] = [];
  let current: string[] = [];
  let currentLength = 0;

  for (const paragraph of paragraphs) {
    const nextLength = currentLength + paragraph.length + 2;
    if (current.length > 0 && nextLength > TARGET_PAGE_CHARS) {
      pages.push({ idx: pages.length, text: current.join("\n\n") });
      current = [];
      currentLength = 0;
    }
    current.push(paragraph);
    currentLength += paragraph.length + 2;
  }

  if (current.length > 0) {
    pages.push({ idx: pages.length, text: current.join("\n\n") });
  }

  return pages.length ? pages : [{ idx: 0, text: content.trim() || "No readable text found." }];
}

export function withPages(chapters: Array<{ idx: number; title: string; content: string }>): Chapter[] {
  return chapters.map((chapter, idx) => ({
    idx,
    title: chapter.title || `Chapter ${idx + 1}`,
    pages: paginateChapter(chapter.content),
  }));
}
