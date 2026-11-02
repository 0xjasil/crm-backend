import assert from 'node:assert/strict';
import test from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { InvoiceService } from './invoice.service.js';
import { createInvoiceSchema, updateInvoiceSchema } from './invoice.schema.js';

function fixture(amountPaid = 0) {
  let saved: Record<string, any> | undefined;
  const existing = {
    subtotal: 1000, taxRate: 0.18, taxAmount: 180, totalAmount: 1180,
    serviceCharge: 0, otherCharges: 0, discountAmount: 0,
    withholdingAmount: 0, amountPaid, payments: [],
  };
  const tx = {
    $queryRaw: async () => [],
    invoice: {
      findUnique: async () => existing,
      update: async ({ data }: { data: Record<string, any> }) => { saved = data; return data; },
      findUniqueOrThrow: async () => saved,
    },
    invoiceItem: {
      deleteMany: async () => ({}),
      createMany: async () => ({}),
    },
  };
  const client = { $transaction: async (run: (value: typeof tx) => Promise<unknown>) => run(tx) } as unknown as PrismaClient;
  return { service: new InvoiceService(client), saved: () => saved };
}

for (const rate of [0, 0.05, 0.12, 0.18, 0.1825, 0.28]) {
  test(`tax-only edit to ${rate * 100}% recalculates totals without resubmitting items`, async () => {
    const { service, saved } = fixture();
    const input = updateInvoiceSchema.parse({ taxRate: rate });
    await service.updateInvoice('invoice-1', input, 'admin-1');
    assert.equal(saved()?.taxRate, rate);
    assert.equal(saved()?.taxAmount, 1000 * rate);
    assert.equal(saved()?.totalAmount, 1000 + 1000 * rate);
    assert.equal(saved()?.balanceDue, 1000 + 1000 * rate);
  });
}

test('omitting the tax rate preserves the existing rate', async () => {
  const { service, saved } = fixture();
  await service.updateInvoice('invoice-1', updateInvoiceSchema.parse({ notes: 'Updated' }), 'admin-1');
  assert.equal(saved()?.taxRate, 0.18);
  assert.equal(saved()?.taxAmount, 180);
});

test('changing items and tax together recalculates from the new subtotal', async () => {
  const { service, saved } = fixture();
  await service.updateInvoice('invoice-1', updateInvoiceSchema.parse({
    taxRate: 0.05,
    items: [{ itemDescription: 'Solar service', quantity: 2, unitPrice: 1000 }],
  }), 'admin-1');
  assert.equal(saved()?.subtotal, 2000);
  assert.equal(saved()?.taxAmount, 100);
  assert.equal(saved()?.totalAmount, 2100);
});

test('invoice discount reduces the taxable base and extra charges are added outside it', async () => {
  const { service, saved } = fixture();
  await service.updateInvoice('invoice-1', updateInvoiceSchema.parse({
    taxRate: 0.1825,
    discountAmount: 200,
    serviceCharge: 50,
    otherCharges: 20,
  }), 'admin-1');
  assert.equal(saved()?.taxAmount, 146);
  assert.equal(saved()?.totalAmount, 1016);
});

test('invoice creation uses the discounted taxable base and preserves withholding', async () => {
  let saved: Record<string, any> | undefined;
  let created: Record<string, any> | undefined;
  const tx = {
    invoice: {
      findUnique: async () => null,
      create: async ({ data }: { data: Record<string, any> }) => {
        saved = data;
        created = { id: 'invoice-1', ...data, items: data.items.create };
        return created;
      },
      findUniqueOrThrow: async () => created,
    },
    invoiceActivity: { create: async () => ({}) },
  };
  const prisma = { $transaction: async (run: (client: typeof tx) => Promise<unknown>) => run(tx) } as unknown as PrismaClient;
  const service = new InvoiceService(prisma);
  const input = createInvoiceSchema.parse({
    invoiceNumber: 'INV-TAX-1825',
    billedTo: 'Customer',
    taxRate: 0.1825,
    discountAmount: 200,
    withholdingAmount: 10,
    withholdingType: 'TDS',
    serviceCharge: 50,
    otherCharges: 20,
    items: [{ itemDescription: 'System', quantity: 1, unitPrice: 1000 }],
  });
  await service.createInvoice(input, 'admin-1');
  assert.equal(saved?.taxAmount, 146);
  assert.equal(saved?.totalAmount, 1006);
  assert.equal(saved?.withholdingAmount, 10);
});

test('tax reduction updates a partially paid invoice balance', async () => {
  const { service, saved } = fixture(500);
  await service.updateInvoice('invoice-1', updateInvoiceSchema.parse({ taxRate: 0 }), 'admin-1');
  assert.equal(saved()?.balanceDue, 500);
  assert.equal(saved()?.status, 'PARTIALLY_PAID');
});

test('tax reduction cannot reduce the invoice below payments already recorded', async () => {
  const { service, saved } = fixture(1100);
  await assert.rejects(service.updateInvoice('invoice-1', updateInvoiceSchema.parse({ taxRate: 0 }), 'admin-1'), /already paid/);
  assert.equal(saved(), undefined);
});
