import type { Page } from "./types";

const TARGET_PAGE_CHARS = 1600;

export function paginateChapter(content: string): Page[] {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const blocks: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= TARGET_PAGE_CHARS) {
      blocks.push(paragraph);
      continue;
    }
    blocks.push(...splitLongParagraph(paragraph));
  }

  const pages: Page[] = [];
  let current: string[] = [];
  let currentLength = 0;

  for (const block of blocks) {
    const nextLength = currentLength + block.length + 2;
    if (current.length > 0 && nextLength > TARGET_PAGE_CHARS) {
      pages.push({ idx: pages.length, text: current.join("\n\n") });
      current = [];
      currentLength = 0;
    }
    current.push(block);
    currentLength += block.length + 2;
  }

  if (current.length > 0) {
    pages.push({ idx: pages.length, text: current.join("\n\n") });
  }

  return pages.length ? pages : [{ idx: 0, text: content.trim() || "No readable text found." }];
}

function splitLongParagraph(paragraph: string): string[] {
  const sentences = paragraph.match(/[^.!?]+(?:[.!?]+["'”’)\]]*\s*|$)/g) ?? [paragraph];
  const chunks: string[] = [];
  let buf = "";
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    if (sentence.length > TARGET_PAGE_CHARS) {
      if (buf) {
        chunks.push(buf);
        buf = "";
      }
      for (let i = 0; i < sentence.length; i += TARGET_PAGE_CHARS) {
        chunks.push(sentence.slice(i, i + TARGET_PAGE_CHARS));
      }
      continue;
    }
    if (buf && buf.length + sentence.length + 1 > TARGET_PAGE_CHARS) {
      chunks.push(buf);
      buf = sentence;
    } else {
      buf = buf ? `${buf} ${sentence}` : sentence;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

export function paginateBook(
  chapters: Array<{ idx: number; title: string; content: string }>,
): Page[] {
  const pages: Page[] = [];
  for (const [chapterIdx, chapter] of chapters.entries()) {
    const chapterTitle = chapter.title || `Chapter ${chapterIdx + 1}`;
    const chapterPages = paginateChapter(chapter.content);
    for (const [i, page] of chapterPages.entries()) {
      pages.push({
        idx: pages.length,
        text: page.text,
        ...(i === 0 ? { chapterTitle } : {}),
      });
    }
  }
  return pages;
}
