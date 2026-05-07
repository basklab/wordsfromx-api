import { unzipSync, strFromU8 } from "fflate";
import { parse as parseHtml } from "node-html-parser";

export type ParsedChapter = { idx: number; title: string; content: string };
export type ParsedBook = { title: string; author: string | null; chapters: ParsedChapter[] };

export async function parseEpub(bytes: Uint8Array): Promise<ParsedBook> {
  const files = unzipSync(bytes);

  const containerXml = readText(files, "META-INF/container.xml");
  if (!containerXml) throw new Error("EPUB is missing META-INF/container.xml");
  const opfPath = matchAttr(containerXml, "rootfile", "full-path");
  if (!opfPath) throw new Error("EPUB is missing its package document path");

  const opfXml = readText(files, opfPath);
  if (!opfXml) throw new Error(`EPUB is missing package document at ${opfPath}`);
  const opfDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";

  const title = decodeEntities(matchTag(opfXml, "dc:title") ?? "Untitled");
  const author = matchTag(opfXml, "dc:creator");

  const manifest = new Map<string, string>();
  for (const match of opfXml.matchAll(/<item\b[^>]*\/?>/g)) {
    const tag = match[0];
    const id = matchAttrInTag(tag, "id");
    const href = matchAttrInTag(tag, "href");
    if (id && href) manifest.set(id, href);
  }

  const spine: string[] = [];
  for (const match of opfXml.matchAll(/<itemref\b[^>]*\/?>/g)) {
    const idref = matchAttrInTag(match[0], "idref");
    if (idref) spine.push(idref);
  }

  const chapters: ParsedChapter[] = [];
  for (const idref of spine) {
    const href = manifest.get(idref);
    if (!href) continue;

    const path = normalizePath(opfDir + decodeURIComponent(href));
    const xhtml = readText(files, path);
    if (!xhtml) continue;

    const extracted = extractText(xhtml);
    if (!extracted.content.trim()) continue;

    chapters.push({
      idx: chapters.length,
      title: extracted.title || `Chapter ${chapters.length + 1}`,
      content: extracted.content,
    });
  }

  if (!chapters.length) throw new Error("EPUB did not contain readable chapters");
  return { title, author: author ? decodeEntities(author) : null, chapters };
}

function readText(files: Record<string, Uint8Array>, path: string): string | null {
  if (files[path]) return strFromU8(files[path]!);
  const lower = path.toLowerCase();
  for (const key of Object.keys(files)) {
    if (key.toLowerCase() === lower) return strFromU8(files[key]!);
  }
  return null;
}

function matchAttr(xml: string, tag: string, attr: string): string | null {
  return xml.match(new RegExp(`<${tag}\\b[^>]*\\b${attr}="([^"]+)"`, "i"))?.[1] ?? null;
}

function matchAttrInTag(tag: string, attr: string): string | null {
  return tag.match(new RegExp(`\\b${attr}="([^"]+)"`, "i"))?.[1] ?? null;
}

function matchTag(xml: string, tag: string): string | null {
  return xml.match(new RegExp(`<${tag}\\b[^>]*>([^<]*)</${tag}>`, "i"))?.[1]?.trim() || null;
}

function normalizePath(path: string): string {
  const parts: string[] = [];
  for (const segment of path.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") parts.pop();
    else parts.push(segment);
  }
  return parts.join("/");
}

function extractText(xhtml: string): { title: string | null; content: string } {
  const root = parseHtml(xhtml, { lowerCaseTagName: true });
  const title = root.querySelector("h1, h2, h3")?.text.replace(/\s+/g, " ").trim() || null;
  const blocks = root.querySelectorAll("p, h1, h2, h3, h4, blockquote, li");
  const paragraphs = blocks
    .map((block) => block.text.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    const body = root.querySelector("body");
    const text = (body?.text ?? root.text).replace(/\s+/g, " ").trim();
    if (text) paragraphs.push(text);
  }

  return { title: title ? decodeEntities(title) : null, content: paragraphs.map(decodeEntities).join("\n\n") };
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
