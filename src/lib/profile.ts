import { eq } from "drizzle-orm";
import { db } from "../db";
import { profiles } from "../db/schema";
import type { Profile } from "./types";

export async function getProfile(userId: string): Promise<Profile> {
  const rows = await db
    .insert(profiles)
    .values({ id: userId })
    .onConflictDoUpdate({ target: profiles.id, set: { id: userId } })
    .returning({ id: profiles.id, sourceLang: profiles.sourceLang, targetLang: profiles.targetLang });
  return rows[0]!;
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, "sourceLang" | "targetLang">>,
): Promise<Profile> {
  const existing = await getProfile(userId);
  const rows = await db
    .update(profiles)
    .set({
      sourceLang: patch.sourceLang ?? existing.sourceLang,
      targetLang: patch.targetLang ?? existing.targetLang,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))
    .returning({ id: profiles.id, sourceLang: profiles.sourceLang, targetLang: profiles.targetLang });
  return rows[0]!;
}
