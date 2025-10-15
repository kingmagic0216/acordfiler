import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { authMiddleware, requireAdmin } from '@/middleware/auth';
import { asyncHandler, CustomError } from '@/middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// Get all users
router.get('/', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const { role, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const where: any = {};

  if (role) {
    where.role = role;
  }

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } }
    ];
  }

  const orderBy: any = {};
  orderBy[sortBy as string] = sortOrder;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        avatar: true,
        phone: true,
        agency: {
          select: {
            id: true,
            name: true
          }
        },
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            submissions: true
          }
        }
      }
    }),
    prisma.user.count({ where })
  ]);

  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    }
  });
}));

// Get single user
router.get('/:id', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      avatar: true,
      phone: true,
      timezone: true,
      agency: {
        select: {
          id: true,
          name: true,
          domain: true
        }
      },
      createdAt: true,
      lastLoginAt: true,
      submissions: {
        select: {
          id: true,
          submissionId: true,
          businessName: true,
          status: true,
          submittedAt: true
        },
        orderBy: { submittedAt: 'desc' },
        take: 10
      }
    }
  });

  if (!user) {
    throw new CustomError('User not found', 404);
  }

  res.json({
    success: true,
    data: { user }
  });
}));

// Create user
router.post('/', authMiddleware, requireAdmin, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('role').isIn(['ADMIN', 'BROKER', 'CUSTOMER']),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING']),
  body('phone').optional().isString(),
  body('agencyId').optional().isString()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { email, password, firstName, lastName, role, status = 'ACTIVE', phone, agencyId } = req.body;
  const currentUserId = (req as any).user.userId;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new CustomError('User with this email already exists', 409);
  }

  // Hash password
  const bcrypt = require('bcryptjs');
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: role as any,
      status: status as any,
      phone,
      agencyId
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      phone: true,
      agency: {
        select: {
          id: true,
          name: true
        }
      },
      createdAt: true
    }
  });

  logger.info(`User created: ${email} by admin ${currentUserId}`);

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: { user }
  });
}));

// Update user
router.put('/:id', authMiddleware, requireAdmin, [
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 }),
  body('role').optional().isIn(['ADMIN', 'BROKER', 'CUSTOMER']),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING']),
  body('phone').optional().isString(),
  body('agencyId').optional().isString()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const userId = req.params.id;
  const currentUserId = (req as any).user.userId;
  const { firstName, lastName, role, status, phone, agencyId } = req.body;

  const existingUser = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!existingUser) {
    throw new CustomError('User not found', 404);
  }

  const updateData: any = {};
  if (firstName) updateData.firstName = firstName;
  if (lastName) updateData.lastName = lastName;
  if (role) updateData.role = role;
  if (status) updateData.status = status;
  if (phone !== undefined) updateData.phone = phone;
  if (agencyId !== undefined) updateData.agencyId = agencyId;

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      phone: true,
      agency: {
        select: {
          id: true,
          name: true
        }
      },
      updatedAt: true
    }
  });

  logger.info(`User updated: ${user.email} by admin ${currentUserId}`);

  res.json({
    success: true,
    message: 'User updated successfully',
    data: { user }
  });
}));

// Delete user
router.delete('/:id', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const currentUserId = (req as any).user.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true }
  });

  if (!user) {
    throw new CustomError('User not found', 404);
  }

  // Prevent self-deletion
  if (userId === currentUserId) {
    throw new CustomError('Cannot delete your own account', 400);
  }

  await prisma.user.delete({
    where: { id: userId }
  });

  logger.info(`User deleted: ${user.email} by admin ${currentUserId}`);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

// Get user statistics
router.get('/stats/overview', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const [
    totalUsers,
    activeUsers,
    inactiveUsers,
    adminUsers,
    brokerUsers,
    customerUsers
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { status: 'INACTIVE' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { role: 'BROKER' } }),
    prisma.user.count({ where: { role: 'CUSTOMER' } })
  ]);

  res.json({
    success: true,
    data: {
      totalUsers,
      activeUsers,
      inactiveUsers,
      adminUsers,
      brokerUsers,
      customerUsers
    }
  });
}));

export default router;

