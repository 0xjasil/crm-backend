import { FastifyReply, FastifyRequest } from 'fastify';
import { paginatedResponse, successResponse } from '../../utils/response.js';
import { createInvoiceSchema, invoiceFilterSchema, updateInvoiceSchema } from './invoice.schema.js';
import { InvoiceService } from './invoice.service.js';

export class InvoiceController {
  static async listInvoices(request: FastifyRequest, reply: FastifyReply) {
    const filters = invoiceFilterSchema.parse(request.query);
    const service = new InvoiceService(request.server.prisma);
    const { invoices, total } = await service.listInvoices(filters);
    return reply.send(paginatedResponse(invoices, total, filters.page, filters.limit));
  }

  static async getInvoice(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const service = new InvoiceService(request.server.prisma);
    const invoice = await service.getInvoiceById(id);
    return reply.send(successResponse(invoice));
  }

  static async createInvoice(request: FastifyRequest, reply: FastifyReply) {
    const validated = createInvoiceSchema.parse(request.body);
    const service = new InvoiceService(request.server.prisma);
    const created = await service.createInvoice(validated, request.user.id);
    return reply.status(201).send(successResponse(created, 'Invoice created successfully'));
  }

  static async updateInvoice(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const validated = updateInvoiceSchema.parse(request.body);
    const service = new InvoiceService(request.server.prisma);
    const updated = await service.updateInvoice(id, validated);
    return reply.send(successResponse(updated, 'Invoice updated successfully'));
  }

  static async deleteInvoice(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const service = new InvoiceService(request.server.prisma);
    await service.deleteInvoice(id);
    return reply.send(successResponse(null, 'Invoice deleted successfully'));
  }

  static async generatePDF(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { download } = (request.query as { download?: string }) || {};
    const service = new InvoiceService(request.server.prisma);
    const pdfBuffer = await service.generatePDF(id);

    reply.header('Content-Type', 'application/pdf');
    if (download === 'true') {
      reply.header('Content-Disposition', `attachment; filename="Invoice-${id}.pdf"`);
    } else {
      reply.header('Content-Disposition', `inline; filename="Invoice-${id}.pdf"`);
    }

    return reply.send(Buffer.from(pdfBuffer));
  }
}