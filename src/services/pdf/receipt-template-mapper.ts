import { formatCurrency } from '../../utils/format.js';

export interface ReceiptWithAdmission {
  id: string;
  receiptNumber: string;
  amountCollected: number;
  collectedTowards: string;
  paymentDate: Date | string;
  paymentMode: string | null;
  admission: {
    admissionNumber: string;
    candidateName: string;
    nextDueDate: Date | string | null;
    course: {
      name: string;
      courseFee: number | null;
      admissionFee: number | null;
      semesterFee: number | null;
    };
    receipts: Array<{
      amountCollected: number;
    }>;
  };
}

export interface ReceiptTemplateInputs {
  billedToInput: string;
  info: string;
  orders: string[][];
  balance: string;
  balanceFormatted: string;
  dueDate: string;
  date: string;
  amountPaidFormatted: string;
}

export class ReceiptTemplateMapper {
  static mapToTemplateInputs(data: ReceiptWithAdmission): ReceiptTemplateInputs {
    const paymentDate = new Date(data.paymentDate).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const courseFee = data.admission.course.courseFee || 0;
    const admissionFee = data.admission.course.admissionFee || 0;
    const semesterFee = data.admission.course.semesterFee || 0;
    const totalCourseFee = courseFee + admissionFee + semesterFee;

    const totalPaid = data.admission.receipts.reduce((sum, r) => sum + r.amountCollected, 0);
    const remainingBalance = totalCourseFee - totalPaid;

    const studentInfo = `${data.admission.candidateName}\nAdmission No: ${data.admission.admissionNumber}`;

    const feeBreakdown: string[][] = [];
    if (courseFee > 0) feeBreakdown.push([`Course: ${data.admission.course.name}`, formatCurrency(courseFee)]);
    if (admissionFee > 0) feeBreakdown.push(['Admission Fee', formatCurrency(admissionFee)]);
    if (semesterFee > 0) feeBreakdown.push(['Semester Fee', formatCurrency(semesterFee)]);
    feeBreakdown.push(['Total Course Fee', formatCurrency(totalCourseFee)]);
    feeBreakdown.push([`Amount Paid toward ${data.collectedTowards.replace(/_/g, ' ')}`, formatCurrency(data.amountCollected)]);

    const nextDueDate = data.admission.nextDueDate
      ? new Date(data.admission.nextDueDate).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'N/A';

    return {
      billedToInput: studentInfo,
      info: JSON.stringify({
        ReceiptNo: data.receiptNumber,
        Date: paymentDate,
      }),
      orders: feeBreakdown,
      balance: formatCurrency(remainingBalance),
      balanceFormatted: formatCurrency(remainingBalance),
      dueDate: nextDueDate,
      date: paymentDate,
      amountPaidFormatted: formatCurrency(data.amountCollected),
    };
  }

  static validateReceiptData(data: ReceiptWithAdmission): boolean {
    if (!data.receiptNumber) throw new Error('Receipt number is required');
    if (!data.paymentDate) throw new Error('Payment date is required');
    if (data.amountCollected <= 0) throw new Error('Amount collected must be greater than 0');
    if (!data.admission?.candidateName) throw new Error('Student name is required');
    if (!data.admission?.admissionNumber) throw new Error('Admission number is required');
    if (!data.admission?.course?.name) throw new Error('Course information is required');
    return true;
  }
}
