export type ParsedChapter = { idx: number; title: string; content: string };
export type ParsedBook = { title: string; author: string | null; chapters: ParsedChapter[] };

let fflateMod: typeof import("fflate") | null = null;

async function loadFflate() {
  if (!fflateMod) fflateMod = await import("fflate");
  return fflateMod;
}

export async function parseEpub(bytes: Uint8Array): Promise<ParsedBook> {
  const fflate = await loadFflate();
  const files = fflate.unzipSync(bytes);

  const containerXml = readText(fflate, files, "META-INF/container.xml");
  if (!containerXml) throw new Error("EPUB is missing META-INF/container.xml");
  const opfPath = matchAttr(containerXml, "rootfile", "full-path");
  if (!opfPath) throw new Error("EPUB is missing its package document path");

  const opfXml = readText(fflate, files, opfPath);
  if (!opfXml) throw new Error(`EPUB is missing package document at ${opfPath}`);
  const opfDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";

  const title = decodeEntities(matchTag(opfXml, "dc:title") ?? "Untitled");
  const author = matchTag(opfXml, "dc:creator");

  const manifest = new Map<string, { href: string; mediaType: string | null }>();
  for (const match of opfXml.matchAll(/<item\b[^>]*\/?>/g)) {
    const tag = match[0];
    const id = matchAttrInTag(tag, "id");
    const href = matchAttrInTag(tag, "href");
    const mediaType = matchAttrInTag(tag, "media-type");
    if (id && href) manifest.set(id, { href, mediaType });
  }

  const spine: string[] = [];
  for (const match of opfXml.matchAll(/<itemref\b[^>]*\/?>/g)) {
    const idref = matchAttrInTag(match[0], "idref");
    if (idref) spine.push(idref);
  }

  const chapters: ParsedChapter[] = [];
  const contentItems = spine
    .map((idref) => manifest.get(idref))
    .filter((item): item is { href: string; mediaType: string | null } => Boolean(item));

  if (!contentItems.length) {
    contentItems.push(
      ...[...manifest.values()].filter((item) => {
        const href = item.href.toLowerCase();
        return (
          item.mediaType === "application/xhtml+xml" ||
          item.mediaType === "text/html" ||
          href.endsWith(".xhtml") ||
          href.endsWith(".html") ||
          href.endsWith(".htm")
        );
      }),
    );
  }

  for (const item of contentItems) {
    const href = item.href.split("#", 1)[0]!.split("?", 1)[0]!;
    if (!href) continue;

    const path = normalizePath(opfDir + decodeURIComponent(href));
    const xhtml = readText(fflate, files, path);
    if (!xhtml) continue;

    const extracted = await extractText(xhtml);
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

function readText(
  fflate: typeof import("fflate"),
  files: Record<string, Uint8Array>,
  path: string,
): string | null {
  if (files[path]) return fflate.strFromU8(files[path]!);
  const lower = path.toLowerCase();
  for (const key of Object.keys(files)) {
    if (key.toLowerCase() === lower) return fflate.strFromU8(files[key]!);
  }
  return null;
}

function matchAttr(xml: string, tag: string, attr: string): string | null {
  return xml.match(new RegExp(`<${tag}\\b[^>]*\\b${attr}=(["'])(.*?)\\1`, "i"))?.[2] ?? null;
}

function matchAttrInTag(tag: string, attr: string): string | null {
  return tag.match(new RegExp(`\\b${attr}=(["'])(.*?)\\1`, "i"))?.[2] ?? null;
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

const headingTags = new Set(["h1", "h2", "h3"]);

async function extractText(xhtml: string): Promise<{ title: string | null; content: string }> {
  const body = xhtml.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? xhtml;
  const cleaned = body
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  const paragraphs: string[] = [];
  let title: string | null = null;

  for (const match of cleaned.matchAll(/<(h[1-4]|p|blockquote|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const tag = match[1]!.toLowerCase();
    const text = htmlToText(match[2]!);
    if (!text) continue;
    if (!title && headingTags.has(tag)) title = text;
    paragraphs.push(text);
  }

  if (!paragraphs.length) {
    const text = htmlToText(cleaned);
    if (text) paragraphs.push(text);
  }

  return { title, content: paragraphs.join("\n\n") };
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|blockquote|li|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t\f\v]+/g, " ")
      .replace(/\s*\n\s*/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}
