-- CreateTable
CREATE TABLE "cloudpayments_card_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "cloudPaymentsToken" TEXT NOT NULL,
    "cardMask" TEXT NOT NULL,
    "cardBrand" TEXT,
    "expMonth" INTEGER,
    "expYear" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "consentCapturedAt" TIMESTAMP(3),
    "sourceTransactionId" TEXT,
    "sourceInvoiceId" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "deactivationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cloudpayments_card_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cloudpayments_card_tokens_cloudPaymentsToken_key" ON "cloudpayments_card_tokens"("cloudPaymentsToken");

-- CreateIndex
CREATE INDEX "cloudpayments_card_tokens_userId_isActive_idx" ON "cloudpayments_card_tokens"("userId", "isActive");

-- CreateIndex
CREATE INDEX "cloudpayments_card_tokens_accountId_isActive_idx" ON "cloudpayments_card_tokens"("accountId", "isActive");

-- CreateIndex
CREATE INDEX "cloudpayments_card_tokens_sourceTransactionId_idx" ON "cloudpayments_card_tokens"("sourceTransactionId");

-- AddForeignKey
ALTER TABLE "cloudpayments_card_tokens"
ADD CONSTRAINT "cloudpayments_card_tokens_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
