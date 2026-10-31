import { Request, Response } from 'express';
import prisma from '../utils/prisma.ts';
import { AuthRequest } from '../middleware/auth.middleware.ts';

/**
 * List products with server-side pagination, search & type filters
 */
export async function listProducts(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const search = req.query.search as string | undefined;
    const type = req.query.type as string | undefined;

    const where: any = {};
    if (type) {
      where.type = type.toUpperCase();
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          variants: true,
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      data: products,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('List products error:', err);
    res.status(500).json({ error: 'Failed to retrieve products.' });
  }
}

/**
 * Get product by ID
 */
export async function getProduct(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    res.json({ product });
  } catch (err: any) {
    console.error('Get product error:', err);
    res.status(500).json({ error: 'Failed to retrieve product.' });
  }
}

/**
 * Create product (Admin only)
 * Supports creating initial variants along with the product
 */
export async function createProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, type, salesPrice, costPrice, notes, variants } = req.body;

    if (!name || salesPrice === undefined) {
      res.status(400).json({ error: 'Product name and sales price are required.' });
      return;
    }

    const validTypes = ['SOFTWARE', 'SERVICE', 'ADDON'];
    const productType = type && validTypes.includes(type.toUpperCase()) ? type.toUpperCase() : 'SOFTWARE';

    const product = await prisma.product.create({
      data: {
        name: String(name).trim(),
        type: productType,
        salesPrice: parseFloat(salesPrice) || 0,
        costPrice: parseFloat(costPrice) || 0,
        notes: notes ? String(notes).trim() : null,
        ...(Array.isArray(variants) && variants.length > 0 && {
          variants: {
            create: variants.map((v: any) => ({
              attributeName: String(v.attributeName).trim(),
              attributeValue: String(v.attributeValue).trim(),
              extraPrice: parseFloat(v.extraPrice) || 0,
            })),
          },
        }),
      },
      include: {
        variants: true,
      },
    });

    res.status(201).json({
      message: 'Product created successfully.',
      product,
    });
  } catch (err: any) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Failed to create product.' });
  }
}

/**
 * Update product (Admin only)
 */
export async function updateProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, type, salesPrice, costPrice, notes } = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name: String(name).trim() }),
        ...(type && { type: String(type).toUpperCase() }),
        ...(salesPrice !== undefined && { salesPrice: parseFloat(salesPrice) }),
        ...(costPrice !== undefined && { costPrice: parseFloat(costPrice) }),
        ...(notes !== undefined && { notes: notes ? String(notes).trim() : null }),
      },
      include: { variants: true },
    });

    res.json({
      message: 'Product updated successfully.',
      product: updated,
    });
  } catch (err: any) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Failed to update product.' });
  }
}

/**
 * Delete product (Admin only)
 */
export async function deleteProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Check if product is in active subscriptions
    const subLineCount = await prisma.subscriptionLine.count({
      where: { productId: id },
    });

    if (subLineCount > 0) {
      res.status(400).json({
        error: `Cannot delete product: it is associated with ${subLineCount} subscription item(s).`,
      });
      return;
    }

    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Product deleted successfully.' });
  } catch (err: any) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Failed to delete product.' });
  }
}

/**
 * Add a variant to a product (Admin only)
 * e.g. Attribute: Brand, Value: Odoo, Extra Price: 560
 */
export async function addVariant(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id: productId } = req.params;
    const { attributeName, attributeValue, extraPrice } = req.body;

    if (!attributeName || !attributeValue) {
      res.status(400).json({ error: 'Attribute name (e.g. Brand) and attribute value (e.g. Odoo) are required.' });
      return;
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        attributeName: String(attributeName).trim(),
        attributeValue: String(attributeValue).trim(),
        extraPrice: parseFloat(extraPrice) || 0,
      },
    });

    res.status(201).json({
      message: 'Product variant added successfully.',
      variant,
    });
  } catch (err: any) {
    console.error('Add variant error:', err);
    res.status(500).json({ error: 'Failed to add product variant.' });
  }
}

/**
 * Delete a variant (Admin only)
 */
export async function deleteVariant(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await prisma.productVariant.delete({ where: { id } });
    res.json({ message: 'Product variant deleted successfully.' });
  } catch (err: any) {
    console.error('Delete variant error:', err);
    res.status(500).json({ error: 'Failed to delete product variant.' });
  }
}

