-- CreateEnum
CREATE TYPE "EsimWebhookReceiptAuthMode" AS ENUM ('UNSIGNED_ACCESSCODE');

-- CreateTable
CREATE TABLE "esim_webhook_receipts" (
    "id" TEXT NOT NULL,
    "dedupKey" TEXT NOT NULL,
    "authMode" "EsimWebhookReceiptAuthMode" NOT NULL,
    "notifyType" TEXT NOT NULL,
    "notifyId" TEXT,
    "orderNo" TEXT,
    "eventGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esim_webhook_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "esim_webhook_receipts_dedupKey_key" ON "esim_webhook_receipts"("dedupKey");

-- CreateIndex
CREATE INDEX "esim_webhook_receipts_authMode_notifyType_createdAt_idx" ON "esim_webhook_receipts"("authMode", "notifyType", "createdAt");
