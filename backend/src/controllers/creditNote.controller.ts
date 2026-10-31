import { Request, Response } from 'express';
import prisma from '../utils/prisma.ts';
import { generateCreditNoteNumber } from '../utils/numberGenerators.ts';
import { logAudit } from '../utils/audit.ts';

export async function getCreditNotes(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [total, creditNotes] = await Promise.all([
      prisma.creditNote.count(),
      prisma.creditNote.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } },
        },
      }),
    ]);

    res.json({
      data: creditNotes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function createCreditNote(req: Request, res: Response) {
  try {
    const { invoiceId, amount, reason } = req.body;
    const currentUser = (req as any).user;

    if (!invoiceId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid invoiceId and positive amount are required.' });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const creditNoteNumber = await generateCreditNoteNumber();

    const creditNote = await prisma.creditNote.create({
      data: {
        creditNoteNumber,
        invoiceId,
        customerId: invoice.customerId,
        amount: parseFloat(amount),
        reason: reason || 'Customer credit adjustment',
        status: 'ISSUED',
      },
      include: {
        customer: true,
        invoice: true,
      },
    });

    // Reduce invoice outstanding amount if applicable
    const newOutstanding = Math.max(0, invoice.outstandingAmount - parseFloat(amount));
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        outstandingAmount: newOutstanding,
        status: newOutstanding === 0 && invoice.paidAmount > 0 ? 'PAID' : invoice.status,
      },
    });

    await logAudit({
      userId: currentUser?.id,
      userName: currentUser?.name,
      action: 'CREDIT_NOTE_ISSUED',
      entityType: 'CreditNote',
      entityId: creditNote.id,
      details: `Issued Credit Note ${creditNoteNumber} for $${amount} against Invoice ${invoice.invoiceNumber}. Reason: ${reason}`,
    });

    res.status(201).json(creditNote);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getCreditNoteById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const creditNote = await prisma.creditNote.findUnique({
      where: { id },
      include: {
        customer: true,
        invoice: true,
      },
    });

    if (!creditNote) {
      return res.status(404).json({ error: 'Credit Note not found.' });
    }

    res.json(creditNote);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

