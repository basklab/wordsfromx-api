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

const headingTags = new Set(["h1", "h2", "h3"]);

async function extractText(xhtml: string): Promise<{ title: string | null; content: string }> {
  let title: string | null = null;
  const paragraphs: string[] = [];
  let buf = "";
  let activeTag: string | null = null;
  let bodyBuf = "";
  let inBody = false;

  const rewriter = new HTMLRewriter();

  rewriter.on("body", {
    element(el) {
      inBody = true;
      el.onEndTag(() => {
        inBody = false;
      });
    },
  });

  rewriter.on("h1, h2, h3, h4, p, blockquote, li", {
    element(el) {
      const tag = el.tagName.toLowerCase();
      activeTag = tag;
      buf = "";
      el.onEndTag(() => {
        const text = buf.replace(/\s+/g, " ").trim();
        if (text) {
          if (!title && headingTags.has(tag)) title = decodeEntities(text);
          paragraphs.push(decodeEntities(text));
        }
        activeTag = null;
        buf = "";
      });
    },
    text(chunk) {
      if (activeTag) buf += chunk.text;
    },
  });

  rewriter.on("body", {
    text(chunk) {
      if (inBody) bodyBuf += chunk.text;
    },
  });

  await rewriter.transform(new Response(xhtml)).arrayBuffer();

  if (!paragraphs.length) {
    const text = bodyBuf.replace(/\s+/g, " ").trim();
    if (text) paragraphs.push(decodeEntities(text));
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
    .replace(/&#39;/g, "'");
}
