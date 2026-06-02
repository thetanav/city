ALTER TABLE "event" RENAME COLUMN "posterImage" TO "image";--> statement-breakpoint
ALTER TABLE "event" ALTER COLUMN "genre" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "event" ALTER COLUMN "genre" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "languages" text[];--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "currency" text;--> statement-breakpoint
ALTER TABLE "event" DROP COLUMN "tagline";