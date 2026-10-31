import prisma from './prisma.ts';

let subSeq: number | null = null;
let invSeq: number | null = null;
let paySeq: number | null = null;
let cnSeq: number | null = null;

export async function generateSubscriptionNumber(): Promise<string> {
  if (subSeq === null) {
    const total = await prisma.subscription.count();
    subSeq = total + 1;
  } else {
    subSeq++;
  }

  let candidate = `SUB-${String(subSeq).padStart(5, '0')}`;
  while (await prisma.subscription.findUnique({ where: { subscriptionNumber: candidate } })) {
    subSeq++;
    candidate = `SUB-${String(subSeq).padStart(5, '0')}`;
  }

  return candidate;
}

export async function generateInvoiceNumber(): Promise<string> {
  if (invSeq === null) {
    const total = await prisma.invoice.count();
    invSeq = total + 1;
  } else {
    invSeq++;
  }

  let candidate = `INV-${String(invSeq).padStart(5, '0')}`;
  while (await prisma.invoice.findUnique({ where: { invoiceNumber: candidate } })) {
    invSeq++;
    candidate = `INV-${String(invSeq).padStart(5, '0')}`;
  }

  return candidate;
}

export async function generatePaymentNumber(): Promise<string> {
  if (paySeq === null) {
    const total = await prisma.payment.count();
    paySeq = total + 1;
  } else {
    paySeq++;
  }

  let candidate = `PAY-${String(paySeq).padStart(5, '0')}`;
  while (await prisma.payment.findUnique({ where: { paymentNumber: candidate } })) {
    paySeq++;
    candidate = `PAY-${String(paySeq).padStart(5, '0')}`;
  }

  return candidate;
}

export async function generateCreditNoteNumber(): Promise<string> {
  if (cnSeq === null) {
    const total = await prisma.creditNote.count();
    cnSeq = total + 1;
  } else {
    cnSeq++;
  }

  let candidate = `CN-${String(cnSeq).padStart(5, '0')}`;
  while (await prisma.creditNote.findUnique({ where: { creditNoteNumber: candidate } })) {
    cnSeq++;
    candidate = `CN-${String(cnSeq).padStart(5, '0')}`;
  }

  return candidate;
}
