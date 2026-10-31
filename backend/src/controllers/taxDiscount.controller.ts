import { Request, Response } from 'express';
import prisma from '../utils/prisma.ts';
import { AuthRequest } from '../middleware/auth.middleware.ts';

// ----------------------------------------------------
// TAX RULES CONTROLLERS
// ----------------------------------------------------

export async function listTaxes(req: Request, res: Response): Promise<void> {
  try {
    const taxes = await prisma.taxRule.findMany({
      orderBy: { percentage: 'desc' },
    });
    res.json({ data: taxes });
  } catch (err: any) {
    console.error('List taxes error:', err);
    res.status(500).json({ error: 'Failed to retrieve tax rules.' });
  }
}

export async function createTax(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, percentage, appliesTo, isActive } = req.body;

    if (!name || percentage === undefined) {
      res.status(400).json({ error: 'Tax name and percentage are required.' });
      return;
    }

    const tax = await prisma.taxRule.create({
      data: {
        name: String(name).trim(),
        percentage: parseFloat(percentage) || 0,
        appliesTo: appliesTo && ['ALL', 'PRODUCT'].includes(String(appliesTo).toUpperCase())
          ? String(appliesTo).toUpperCase()
          : 'ALL',
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    res.status(201).json({
      message: 'Tax rule created successfully.',
      tax,
    });
  } catch (err: any) {
    console.error('Create tax error:', err);
    res.status(500).json({ error: 'Failed to create tax rule.' });
  }
}

export async function updateTax(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, percentage, appliesTo, isActive } = req.body;

    const updated = await prisma.taxRule.update({
      where: { id },
      data: {
        ...(name && { name: String(name).trim() }),
        ...(percentage !== undefined && { percentage: parseFloat(percentage) }),
        ...(appliesTo && { appliesTo: String(appliesTo).toUpperCase() }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    res.json({
      message: 'Tax rule updated successfully.',
      tax: updated,
    });
  } catch (err: any) {
    console.error('Update tax error:', err);
    res.status(500).json({ error: 'Failed to update tax rule.' });
  }
}

export async function deleteTax(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await prisma.taxRule.delete({ where: { id } });
    res.json({ message: 'Tax rule deleted successfully.' });
  } catch (err: any) {
    console.error('Delete tax error:', err);
    res.status(500).json({ error: 'Failed to delete tax rule.' });
  }
}

// ----------------------------------------------------
// DISCOUNTS CONTROLLERS
// ----------------------------------------------------

export async function listDiscounts(req: Request, res: Response): Promise<void> {
  try {
    const discounts = await prisma.discount.findMany({
      include: {
        product: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: discounts });
  } catch (err: any) {
    console.error('List discounts error:', err);
    res.status(500).json({ error: 'Failed to retrieve discounts.' });
  }
}

export async function createDiscount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      code,
      type,
      value,
      minPurchaseAmount,
      minQuantity,
      startDate,
      endDate,
      usageLimit,
      appliesTo,
      productId,
      isActive,
    } = req.body;

    if (!code || value === undefined) {
      res.status(400).json({ error: 'Discount code and value are required.' });
      return;
    }

    const normalizedCode = String(code).trim().toUpperCase();

    const existing = await prisma.discount.findUnique({
      where: { code: normalizedCode },
    });

    if (existing) {
      res.status(409).json({ error: 'A discount with this code already exists.' });
      return;
    }

    const discount = await prisma.discount.create({
      data: {
        code: normalizedCode,
        type: type && ['PERCENTAGE', 'FIXED'].includes(String(type).toUpperCase())
          ? String(type).toUpperCase()
          : 'PERCENTAGE',
        value: parseFloat(value) || 0,
        minPurchaseAmount: parseFloat(minPurchaseAmount) || 0,
        minQuantity: parseInt(minQuantity) || 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        usageLimit: parseInt(usageLimit) || 100,
        usageCount: 0,
        appliesTo: appliesTo && ['SUBSCRIPTION', 'PRODUCT'].includes(String(appliesTo).toUpperCase())
          ? String(appliesTo).toUpperCase()
          : 'SUBSCRIPTION',
        productId: productId || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      include: {
        product: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      message: 'Discount created successfully.',
      discount,
    });
  } catch (err: any) {
    console.error('Create discount error:', err);
    res.status(500).json({ error: 'Failed to create discount.' });
  }
}

export async function updateDiscount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const {
      code,
      type,
      value,
      minPurchaseAmount,
      minQuantity,
      startDate,
      endDate,
      usageLimit,
      appliesTo,
      productId,
      isActive,
    } = req.body;

    const updated = await prisma.discount.update({
      where: { id },
      data: {
        ...(code && { code: String(code).trim().toUpperCase() }),
        ...(type && { type: String(type).toUpperCase() }),
        ...(value !== undefined && { value: parseFloat(value) }),
        ...(minPurchaseAmount !== undefined && { minPurchaseAmount: parseFloat(minPurchaseAmount) }),
        ...(minQuantity !== undefined && { minQuantity: parseInt(minQuantity) }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(usageLimit !== undefined && { usageLimit: parseInt(usageLimit) }),
        ...(appliesTo && { appliesTo: String(appliesTo).toUpperCase() }),
        ...(productId !== undefined && { productId: productId || null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
      include: {
        product: { select: { id: true, name: true } },
      },
    });

    res.json({
      message: 'Discount updated successfully.',
      discount: updated,
    });
  } catch (err: any) {
    console.error('Update discount error:', err);
    res.status(500).json({ error: 'Failed to update discount.' });
  }
}

export async function deleteDiscount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await prisma.discount.delete({ where: { id } });
    res.json({ message: 'Discount deleted successfully.' });
  } catch (err: any) {
    console.error('Delete discount error:', err);
    res.status(500).json({ error: 'Failed to delete discount.' });
  }
}

/**
 * Validate discount code against an order amount and item quantity
 * Checks: active, date window, usage limit, minimum purchase, minimum quantity
 */
export async function validateDiscountCode(req: Request, res: Response): Promise<void> {
  try {
    const { code, amount, quantity, productId } = req.body;

    if (!code) {
      res.status(400).json({ error: 'Discount code is required.' });
      return;
    }

    const discount = await prisma.discount.findUnique({
      where: { code: String(code).trim().toUpperCase() },
    });

    if (!discount || !discount.isActive) {
      res.status(400).json({ valid: false, error: 'Discount code is invalid or inactive.' });
      return;
    }

    const now = new Date();
    if (discount.startDate && now < discount.startDate) {
      res.status(400).json({ valid: false, error: 'Discount code is not active yet.' });
      return;
    }

    if (discount.endDate && now > discount.endDate) {
      res.status(400).json({ valid: false, error: 'Discount code has expired.' });
      return;
    }

    if (discount.usageCount >= discount.usageLimit) {
      res.status(400).json({ valid: false, error: 'Discount code usage limit has been reached.' });
      return;
    }

    const orderAmount = parseFloat(amount) || 0;
    if (discount.minPurchaseAmount > 0 && orderAmount < discount.minPurchaseAmount) {
      res.status(400).json({
        valid: false,
        error: `Minimum order amount of $${discount.minPurchaseAmount.toFixed(2)} required for this discount.`,
      });
      return;
    }

    const orderQty = parseInt(quantity) || 1;
    if (discount.minQuantity > 0 && orderQty < discount.minQuantity) {
      res.status(400).json({
        valid: false,
        error: `Minimum quantity of ${discount.minQuantity} items required for this discount.`,
      });
      return;
    }

    if (discount.appliesTo === 'PRODUCT' && discount.productId && productId !== discount.productId) {
      res.status(400).json({
        valid: false,
        error: 'Discount applies to a specific product only.',
      });
      return;
    }

    // Calculate discount value
    let discountAmount = 0;
    if (discount.type === 'PERCENTAGE') {
      discountAmount = (orderAmount * discount.value) / 100;
    } else {
      discountAmount = Math.min(orderAmount, discount.value);
    }

    res.json({
      valid: true,
      code: discount.code,
      type: discount.type,
      value: discount.value,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      remainingUses: discount.usageLimit - discount.usageCount,
    });
  } catch (err: any) {
    console.error('Validate discount error:', err);
    res.status(500).json({ error: 'Failed to validate discount.' });
  }
}

