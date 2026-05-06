import { env } from "../env";

export async function translateMyMemory(term: string, source: string, target: string): Promise<string> {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", term);
  url.searchParams.set("langpair", `${source}|${target}`);
  if (env.myMemoryEmail) url.searchParams.set("de", env.myMemoryEmail);

  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`MyMemory ${res.status}`);

  const data = (await res.json()) as {
    responseData?: { translatedText?: string };
    responseStatus?: number;
  };
  const text = data.responseData?.translatedText;
  if (!text) throw new Error("MyMemory: no translation");
  return text;
}
