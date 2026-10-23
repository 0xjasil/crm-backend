import { InvoiceStatus } from '@prisma/client';

export function calculateInvoicePaymentStatus(totalAmount: number, amountPaid: number) {
  const normalizedTotal = roundMoney(totalAmount);
  const normalizedPaid = roundMoney(amountPaid);
  if (normalizedPaid <= 0) return null;
  return normalizedPaid >= normalizedTotal ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
}

export function formatPaymentNumber(prefix: string, nextNumber: number, padding: number, fiscalYear?: number) {
  const year = fiscalYear === undefined ? '' : `${fiscalYear}-${String(fiscalYear + 1).slice(-2)}-`;
  return `${prefix}${year}${String(nextNumber).padStart(padding, '0')}`;
}

export function getIndiaFiscalYear(date: Date) {
  const parts = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric' }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  return month >= 4 ? year : year - 1;
}

export function roundMoney(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }
