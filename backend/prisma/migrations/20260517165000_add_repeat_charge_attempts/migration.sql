-- CreateEnum
CREATE TYPE "RepeatChargeAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUCCEEDED', 'DECLINED', 'AMBIGUOUS');

-- CreateTable
CREATE TABLE "repeat_charge_attempts" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "savedCardId" TEXT NOT NULL,
    "status" "RepeatChargeAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "idempotencyKey" TEXT NOT NULL,
    "cloudPaymentsTransactionId" TEXT,
    "providerReasonCode" INTEGER,
    "providerMessage" TEXT,
    "ambiguousReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "repeat_charge_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "repeat_charge_attempts_orderId_key" ON "repeat_charge_attempts"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "repeat_charge_attempts_idempotencyKey_key" ON "repeat_charge_attempts"("idempotencyKey");

-- CreateIndex
CREATE INDEX "repeat_charge_attempts_userId_status_idx" ON "repeat_charge_attempts"("userId", "status");

-- CreateIndex
CREATE INDEX "repeat_charge_attempts_savedCardId_idx" ON "repeat_charge_attempts"("savedCardId");

-- AddForeignKey
ALTER TABLE "repeat_charge_attempts" ADD CONSTRAINT "repeat_charge_attempts_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repeat_charge_attempts" ADD CONSTRAINT "repeat_charge_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repeat_charge_attempts" ADD CONSTRAINT "repeat_charge_attempts_savedCardId_fkey" FOREIGN KEY ("savedCardId") REFERENCES "cloudpayments_card_tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
