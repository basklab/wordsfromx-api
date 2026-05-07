CREATE TABLE "book_chapters" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"book_id" bigint NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"author" text,
	"cover_image" text,
	"language" text DEFAULT 'en' NOT NULL,
	"target_lang" text DEFAULT 'en' NOT NULL,
	"current_chapter" integer DEFAULT 0 NOT NULL,
	"current_page" integer DEFAULT 0 NOT NULL,
	"chapter_count" integer DEFAULT 0 NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- neon_auth."user" is managed by Neon Auth; we only reference it via FKs.
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source_lang" text DEFAULT 'en' NOT NULL,
	"target_lang" text DEFAULT 'ru' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"source_lang" text NOT NULL,
	"target_lang" text NOT NULL,
	"kind" text NOT NULL,
	"term" text NOT NULL,
	"translation" text NOT NULL,
	"provider" text DEFAULT 'mymemory' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translations_source_lang_target_lang_kind_term_pk" PRIMARY KEY("source_lang","target_lang","kind","term"),
	CONSTRAINT "translations_kind_check" CHECK ("translations"."kind" in ('word', 'sentence'))
);
--> statement-breakpoint
CREATE TABLE "vocab" (
	"user_id" uuid NOT NULL,
	"source_lang" text NOT NULL,
	"lemma" text NOT NULL,
	"exposures" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'tracking' NOT NULL,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vocab_user_id_source_lang_lemma_pk" PRIMARY KEY("user_id","source_lang","lemma"),
	CONSTRAINT "vocab_status_check" CHECK ("vocab"."status" in ('tracking', 'known', 'ignored'))
);
--> statement-breakpoint
ALTER TABLE "book_chapters" ADD CONSTRAINT "book_chapters_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocab" ADD CONSTRAINT "vocab_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "book_chapters_book_position_uq" ON "book_chapters" USING btree ("book_id","position");--> statement-breakpoint
CREATE INDEX "book_chapters_book_id_idx" ON "book_chapters" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "books_user_id_idx" ON "books" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "translations_term_idx" ON "translations" USING btree ("source_lang","target_lang","kind","term");--> statement-breakpoint
CREATE INDEX "vocab_user_status_idx" ON "vocab" USING btree ("user_id","status","last_seen" DESC NULLS LAST);