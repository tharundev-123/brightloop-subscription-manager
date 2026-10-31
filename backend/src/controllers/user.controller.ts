import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.ts';
import { validatePassword } from '../utils/password.ts';
import { AuthRequest } from '../middleware/auth.middleware.ts';

/**
 * Admin Creates Staff User
 * Rule: Only admin can create staff
 */
export async function createStaff(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Name, email, and temporary password are required.' });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      res.status(400).json({ error: 'Invalid email address format.' });
      return;
    }

    // Validate password rules
    const pwdValidation = validatePassword(password);
    if (!pwdValidation.isValid) {
      res.status(400).json({ error: pwdValidation.message });
      return;
    }

    // Check uniqueness
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const staffUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: String(name).trim(),
        passwordHash,
        role: 'STAFF',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: 'Internal staff account created successfully.',
      user: staffUser,
    });
  } catch (err: any) {
    console.error('Create staff error:', err);
    res.status(500).json({ error: 'Failed to create staff account.' });
  }
}

/**
 * List Users with pagination & role filtering (Admin and Staff)
 */
export async function listUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const role = req.query.role as string | undefined;
    const search = req.query.search as string | undefined;

    const where: any = {};
    if (role) {
      where.role = role.toUpperCase();
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
}

