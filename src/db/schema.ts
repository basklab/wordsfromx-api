import {
  bigint,
  bigserial,
  check,
  index,
  integer,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const neonAuth = pgSchema("neon_auth");
export const neonAuthUser = neonAuth.table("user", {
  id: uuid("id").primaryKey(),
  email: text("email"),
  name: text("name"),
  image: text("image"),
});

export const books = pgTable(
  "books",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => neonAuthUser.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    author: text("author"),
    coverImage: text("cover_image"),
    language: text("language").notNull().default("en"),
    targetLang: text("target_lang").notNull().default("en"),
    currentChapter: integer("current_chapter").notNull().default(0),
    currentPage: integer("current_page").notNull().default(0),
    chapterCount: integer("chapter_count").notNull().default(0),
    tokenCount: integer("token_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("books_user_id_idx").on(t.userId)],
);

export const bookChapters = pgTable(
  "book_chapters",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    bookId: bigint("book_id", { mode: "number" })
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    tokenCount: integer("token_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("book_chapters_book_position_uq").on(t.bookId, t.position),
    index("book_chapters_book_id_idx").on(t.bookId),
  ],
);

export const translations = pgTable(
  "translations",
  {
    sourceLang: text("source_lang").notNull(),
    targetLang: text("target_lang").notNull(),
    kind: text("kind").notNull(),
    term: text("term").notNull(),
    translation: text("translation").notNull(),
    provider: text("provider").notNull().default("mymemory"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.sourceLang, t.targetLang, t.kind, t.term] }),
    check("translations_kind_check", sql`${t.kind} in ('word', 'sentence')`),
    index("translations_term_idx").on(t.sourceLang, t.targetLang, t.kind, t.term),
  ],
);

export const profiles = pgTable("profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => neonAuthUser.id, { onDelete: "cascade" }),
  sourceLang: text("source_lang").notNull().default("en"),
  targetLang: text("target_lang").notNull().default("ru"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vocab = pgTable(
  "vocab",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => neonAuthUser.id, { onDelete: "cascade" }),
    sourceLang: text("source_lang").notNull(),
    lemma: text("lemma").notNull(),
    exposures: integer("exposures").notNull().default(1),
    status: text("status").notNull().default("tracking"),
    firstSeen: timestamp("first_seen", { withTimezone: true }).notNull().defaultNow(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.sourceLang, t.lemma] }),
    check("vocab_status_check", sql`${t.status} in ('tracking', 'known', 'ignored')`),
    index("vocab_user_status_idx").on(t.userId, t.status, t.lastSeen.desc()),
  ],
);
