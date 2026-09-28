import { z } from 'zod';

export const invoiceFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const invoiceItemInputSchema = z.object({
  itemDescription: z.string().min(1, 'Item description is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
});

export const createInvoiceSchema = z.object({
  billedTo: z.string().min(1, 'Billed to information is required'),
  invoiceDate: z.string().or(z.date()).default(() => new Date()),
  dueDate: z.string().or(z.date()).optional().nullable(),
  taxRate: z.coerce.number().min(0).max(1).default(0.18),
  serviceCharge: z.coerce.number().min(0).default(0),
  otherCharges: z.coerce.number().min(0).default(0),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).default('DRAFT'),
  notes: z.string().optional().nullable(),
  items: z.array(invoiceItemInputSchema).min(1, 'At least one invoice item is required'),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

export type InvoiceFilterInput = z.infer<typeof invoiceFilterSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
