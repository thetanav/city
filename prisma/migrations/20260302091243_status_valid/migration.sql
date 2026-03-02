-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'LIVE', 'STOPPED');

-- AlterTable
ALTER TABLE "event" ADD COLUMN     "status" "EventStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "ticket" ADD COLUMN     "valid" BOOLEAN NOT NULL DEFAULT true;
