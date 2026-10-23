-- Add only the customer schema used by invoice creation and listing. These
-- additions preserve all existing invoice and customer data.
CREATE TABLE IF NOT EXISTS "customer" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "state" TEXT,
  "gstin" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "invoice"
  ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "withholdingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "withholdingType" TEXT,
  ADD COLUMN IF NOT EXISTS "customerId" TEXT,
  ADD COLUMN IF NOT EXISTS "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "balanceDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "shareToken" TEXT,
  ADD COLUMN IF NOT EXISTS "remindersEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "reminderRules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS "customer_name_idx" ON "customer"("name");
CREATE INDEX IF NOT EXISTS "customer_email_idx" ON "customer"("email");
CREATE INDEX IF NOT EXISTS "customer_phone_idx" ON "customer"("phone");
CREATE INDEX IF NOT EXISTS "customer_createdByUserId_idx" ON "customer"("createdByUserId");
CREATE INDEX IF NOT EXISTS "invoice_customerId_idx" ON "invoice"("customerId");
