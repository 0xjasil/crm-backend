-- These invoice fields are part of the Prisma model and are used by invoice
-- listing/creation. Add them with defaults so existing invoices remain valid.
ALTER TABLE "invoice"
  ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "withholdingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "withholdingType" TEXT;
