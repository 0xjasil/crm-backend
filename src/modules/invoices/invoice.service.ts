import { PrismaClient, Prisma, InvoiceStatus } from '@prisma/client';
import { NotFoundError } from '../../errors/app-error.js';
import { PDFService } from '../../services/pdf/pdf.service.js';
import { CreateInvoiceInput, InvoiceFilterInput, UpdateInvoiceInput } from './invoice.schema.js';

export class InvoiceService {
  constructor(private prisma: PrismaClient) {}

  async listInvoices(filters: InvoiceFilterInput) {
    const { search, status, startDate, endDate, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {};
    if (status) where.status = status as InvoiceStatus;

    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate);
      if (endDate) where.invoiceDate.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { billedTo: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { invoiceDate: 'desc' },
        include: {
          items: true,
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { invoices, total };
  }

  async getInvoiceById(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!invoice) throw new NotFoundError('Invoice');
    return invoice;
  }

  async createInvoice(input: CreateInvoiceInput, currentUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Generate unique invoice number: INV-YYYYMM-XXXX
      const count = await tx.invoice.count();
      const datePrefix = new Date().toISOString().slice(0, 7).replace('-', '');
      const invoiceNumber = `INV-${datePrefix}-${String(count + 1).padStart(4, '0')}`;

      // Calculate totals
      let subtotal = 0;
      const itemsWithTotals = input.items.map((item) => {
        const lineTotal = item.quantity * item.unitPrice;
        subtotal += lineTotal;
        return {
          itemDescription: item.itemDescription,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal,
        };
      });

      const taxRate = input.taxRate ?? 0.18;
      const taxAmount = subtotal * taxRate;
      const serviceCharge = input.serviceCharge ?? 0;
      const otherCharges = input.otherCharges ?? 0;
      const totalAmount = subtotal + taxAmount + serviceCharge + otherCharges;

      return tx.invoice.create({
        data: {
          invoiceNumber,
          billedTo: input.billedTo,
          invoiceDate: input.invoiceDate ? new Date(input.invoiceDate) : new Date(),
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          taxRate,
          subtotal,
          taxAmount,
          serviceCharge,
          otherCharges,
          totalAmount,
          status: (input.status as InvoiceStatus) || InvoiceStatus.DRAFT,
          notes: input.notes,
          createdByUserId: currentUserId,
          items: {
            create: itemsWithTotals,
          },
        },
        include: { items: true },
      });
    });
  }

  async updateInvoice(id: string, input: UpdateInvoiceInput) {
    const existing = await this.getInvoiceById(id);

    return this.prisma.$transaction(async (tx) => {
      let subtotal = existing.subtotal;
      let taxAmount = existing.taxAmount;
      let totalAmount = existing.totalAmount;
      const taxRate = input.taxRate !== undefined ? input.taxRate : existing.taxRate;
      const serviceCharge = input.serviceCharge !== undefined ? input.serviceCharge : existing.serviceCharge;
      const otherCharges = input.otherCharges !== undefined ? input.otherCharges : existing.otherCharges;

      // If items are updated, recalculate
      if (input.items && input.items.length > 0) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

        subtotal = 0;
        const newItems = input.items.map((item) => {
          const lineTotal = item.quantity * item.unitPrice;
          subtotal += lineTotal;
          return {
            invoiceId: id,
            itemDescription: item.itemDescription,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal,
          };
        });

        await tx.invoiceItem.createMany({ data: newItems });

        taxAmount = subtotal * taxRate;
        totalAmount = subtotal + taxAmount + serviceCharge + otherCharges;
      }

      return tx.invoice.update({
        where: { id },
        data: {
          billedTo: input.billedTo,
          invoiceDate: input.invoiceDate ? new Date(input.invoiceDate) : undefined,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          taxRate,
          subtotal,
          taxAmount,
          serviceCharge,
          otherCharges,
          totalAmount,
          status: input.status as InvoiceStatus,
          notes: input.notes,
        },
        include: { items: true },
      });
    });
  }

  async deleteInvoice(id: string) {
    await this.getInvoiceById(id);
    return this.prisma.invoice.delete({ where: { id } });
  }

  async generatePDF(id: string) {
    const invoice = await this.getInvoiceById(id);
    return PDFService.generateInvoicePDF(invoice as any);
  }
}
