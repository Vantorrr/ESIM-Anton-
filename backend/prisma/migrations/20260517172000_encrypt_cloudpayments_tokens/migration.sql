ALTER TABLE "cloudpayments_card_tokens"
ADD COLUMN "tokenFingerprint" TEXT;

UPDATE "cloudpayments_card_tokens"
SET "tokenFingerprint" = md5("cloudPaymentsToken")
WHERE "tokenFingerprint" IS NULL;

ALTER TABLE "cloudpayments_card_tokens"
ALTER COLUMN "tokenFingerprint" SET NOT NULL;

DROP INDEX IF EXISTS "cloudpayments_card_tokens_cloudPaymentsToken_key";

CREATE UNIQUE INDEX "cloudpayments_card_tokens_tokenFingerprint_key"
ON "cloudpayments_card_tokens"("tokenFingerprint");
