import { Template } from '@pdfme/common';
import { generate } from '@pdfme/generator';
import { text, table, svg, line, multiVariableText } from '@pdfme/schemas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { InvoiceTemplateMapper, InvoiceWithItems } from './invoice-template-mapper.js';
import { ReceiptTemplateMapper, ReceiptWithAdmission } from './receipt-template-mapper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PDFService {
  static async generateInvoicePDF(invoice: InvoiceWithItems): Promise<Uint8Array> {
    try {
      InvoiceTemplateMapper.validateInvoiceData(invoice);
      const template = await this.loadTemplate('invoice_template.json');
      const templateInputs = InvoiceTemplateMapper.mapToTemplateInputs(invoice);

      return await generate({
        template,
        inputs: [templateInputs as any],
        plugins: {
          text,
          table,
          svg,
          line,
          multiVariableText,
        },
      });
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      throw new Error('Failed to generate invoice PDF');
    }
  }

  static async generateReceiptPDF(data: ReceiptWithAdmission): Promise<Uint8Array> {
    try {
      ReceiptTemplateMapper.validateReceiptData(data);
      const template = await this.loadTemplate('receipt_template.json');
      const templateInputs = ReceiptTemplateMapper.mapToTemplateInputs(data);

      return await generate({
        template,
        inputs: [templateInputs as any],
        plugins: {
          text,
          table,
          svg,
          line,
          multiVariableText,
        },
      });
    } catch (error) {
      console.error('Error generating receipt PDF:', error);
      throw new Error('Failed to generate receipt PDF');
    }
  }

  private static async loadTemplate(templateFileName: string): Promise<Template> {
    const templatePath = path.join(__dirname, 'templates', templateFileName);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found at: ${templatePath}`);
    }
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    return JSON.parse(templateContent) as Template;
  }
}
