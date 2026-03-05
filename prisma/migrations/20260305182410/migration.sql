-- AlterTable
ALTER TABLE "event" ADD COLUMN     "bookedTickets" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "totalTickets" DROP DEFAULT;
