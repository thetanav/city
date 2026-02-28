/*
  Warnings:

  - You are about to drop the column `organizerId` on the `event` table. All the data in the column will be lost.
  - You are about to drop the `organizer` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `unitPrice` to the `ticket` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "event" DROP CONSTRAINT "event_organizerId_fkey";

-- AlterTable
ALTER TABLE "event" DROP COLUMN "organizerId";

-- AlterTable
ALTER TABLE "ticket" ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "unitPrice" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "stripeCustomerId" TEXT;

-- DropTable
DROP TABLE "organizer";

-- CreateIndex
CREATE INDEX "event_creatorId_idx" ON "event"("creatorId");

-- CreateIndex
CREATE INDEX "ticket_paymentId_idx" ON "ticket"("paymentId");
