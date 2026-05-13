/*
  Warnings:

  - You are about to drop the `sms_codes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "sms_codes";

-- CreateTable
CREATE TABLE "email_codes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_codes_email_key" ON "email_codes"("email");
