import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/permission.middleware.js';
import { InvoiceController } from './invoice.controller.js';

export const invoiceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', InvoiceController.listInvoices);
  fastify.get('/:id', InvoiceController.getInvoice);
  fastify.get('/:id/pdf', InvoiceController.generatePDF);
  fastify.post('/', { preHandler: [requireRole(['admin', 'executive'])] }, InvoiceController.createInvoice);
  fastify.patch('/:id', { preHandler: [requireRole(['admin', 'executive'])] }, InvoiceController.updateInvoice);
  fastify.delete('/:id', { preHandler: [requireRole(['admin'])] }, InvoiceController.deleteInvoice);
};
