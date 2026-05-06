import type { ParsedBook } from "./epub";

export async function parseTextBook(fileName: string, bytes: Uint8Array): Promise<ParsedBook> {
  const text = new TextDecoder().decode(bytes).replace(/\r\n/g, "\n").trim();
  if (!text) throw new Error("Text file is empty");

  const title = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled";
  const sections = splitIntoChapters(text);

  return {
    title,
    author: null,
    chapters: sections.map((section, idx) => ({
      idx,
      title: section.title,
      content: section.content,
    })),
  };
}

function splitIntoChapters(text: string): Array<{ title: string; content: string }> {
  const matches = [...text.matchAll(/(?:^|\n)(chapter\s+\d+[^\n]*|part\s+\d+[^\n]*)\n/gi)];
  if (matches.length < 2) {
    return [{ title: "Chapter 1", content: text }];
  }

  return matches.map((match, idx) => {
    const title = match[1]?.trim() || `Chapter ${idx + 1}`;
    const start = (match.index ?? 0) + match[0].length;
    const end = idx + 1 < matches.length ? matches[idx + 1]!.index ?? text.length : text.length;
    return { title, content: text.slice(start, end).trim() };
  }).filter((chapter) => chapter.content);
}
