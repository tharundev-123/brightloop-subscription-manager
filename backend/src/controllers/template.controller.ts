import { Request, Response } from 'express';
import prisma from '../utils/prisma.ts';
import { AuthRequest } from '../middleware/auth.middleware.ts';

export async function listTemplates(req: Request, res: Response): Promise<void> {
  try {
    const templates = await prisma.quotationTemplate.findMany({
      include: {
        plan: true,
        lines: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: templates });
  } catch (err: any) {
    console.error('List templates error:', err);
    res.status(500).json({ error: 'Failed to retrieve quotation templates.' });
  }
}

export async function getTemplate(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const template = await prisma.quotationTemplate.findUnique({
      where: { id },
      include: {
        plan: true,
        lines: {
          include: { product: true },
        },
      },
    });

    if (!template) {
      res.status(404).json({ error: 'Template not found.' });
      return;
    }

    res.json({ template });
  } catch (err: any) {
    console.error('Get template error:', err);
    res.status(500).json({ error: 'Failed to retrieve template.' });
  }
}

export async function createTemplate(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, planId, validDays, notes, lines } = req.body;

    if (!name || !planId) {
      res.status(400).json({ error: 'Template name and default plan are required.' });
      return;
    }

    const template = await prisma.quotationTemplate.create({
      data: {
        name: String(name).trim(),
        planId,
        validDays: parseInt(validDays) || 30,
        notes: notes ? String(notes).trim() : null,
        ...(Array.isArray(lines) && lines.length > 0 && {
          lines: {
            create: lines.map((l: any) => ({
              productId: l.productId,
              quantity: parseInt(l.quantity) || 1,
              unitPrice: parseFloat(l.unitPrice) || 0,
            })),
          },
        }),
      },
      include: {
        plan: true,
        lines: { include: { product: true } },
      },
    });

    res.status(201).json({
      message: 'Quotation template created successfully.',
      template,
    });
  } catch (err: any) {
    console.error('Create template error:', err);
    res.status(500).json({ error: 'Failed to create quotation template.' });
  }
}

export async function deleteTemplate(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await prisma.quotationTemplate.delete({ where: { id } });
    res.json({ message: 'Template deleted successfully.' });
  } catch (err: any) {
    console.error('Delete template error:', err);
    res.status(500).json({ error: 'Failed to delete template.' });
  }
}

