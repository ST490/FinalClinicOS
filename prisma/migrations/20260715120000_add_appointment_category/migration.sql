-- CreateEnum
CREATE TYPE "AppointmentCategory" AS ENUM ('FIRST_TIME', 'RETURNING', 'FREE_CHECKUP');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "category" "AppointmentCategory" NOT NULL DEFAULT 'RETURNING';

-- CreateIndex
CREATE INDEX "appointments_category_idx" ON "appointments"("category");
