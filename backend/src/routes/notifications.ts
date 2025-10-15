import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { authMiddleware } from '@/middleware/auth';
import { asyncHandler, CustomError } from '@/middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// Get notifications for current user
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const userId = (req as any).user.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const { read, type, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const where: any = { userId };

  if (read !== undefined) {
    where.read = read === 'true';
  }

  if (type) {
    where.type = type;
  }

  const orderBy: any = {};
  orderBy[sortBy as string] = sortOrder;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        submission: {
          select: {
            id: true,
            submissionId: true,
            businessName: true,
            status: true
          }
        }
      }
    }),
    prisma.notification.count({ where })
  ]);

  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  res.json({
    success: true,
    data: {
      notifications,
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

// Mark notification as read
router.put('/:id/read', authMiddleware, asyncHandler(async (req, res) => {
  const notificationId = req.params.id;
  const userId = (req as any).user.userId;

  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId
    }
  });

  if (!notification) {
    throw new CustomError('Notification not found', 404);
  }

  const updatedNotification = await prisma.notification.update({
    where: { id: notificationId },
    data: {
      read: true,
      readAt: new Date()
    }
  });

  res.json({
    success: true,
    message: 'Notification marked as read',
    data: { notification: updatedNotification }
  });
}));

// Mark all notifications as read
router.put('/read-all', authMiddleware, asyncHandler(async (req, res) => {
  const userId = (req as any).user.userId;

  await prisma.notification.updateMany({
    where: {
      userId,
      read: false
    },
    data: {
      read: true,
      readAt: new Date()
    }
  });

  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
}));

// Delete notification
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const notificationId = req.params.id;
  const userId = (req as any).user.userId;

  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId
    }
  });

  if (!notification) {
    throw new CustomError('Notification not found', 404);
  }

  await prisma.notification.delete({
    where: { id: notificationId }
  });

  res.json({
    success: true,
    message: 'Notification deleted successfully'
  });
}));

// Get notification statistics
router.get('/stats', authMiddleware, asyncHandler(async (req, res) => {
  const userId = (req as any).user.userId;

  const [
    totalNotifications,
    unreadNotifications,
    notificationsByType
  ] = await Promise.all([
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, read: false } }),
    prisma.notification.groupBy({
      by: ['type'],
      where: { userId },
      _count: { type: true }
    })
  ]);

  res.json({
    success: true,
    data: {
      totalNotifications,
      unreadNotifications,
      notificationsByType: notificationsByType.reduce((acc, item) => {
        acc[item.type] = item._count.type;
        return acc;
      }, {} as any)
    }
  });
}));

// Create notification (admin only)
router.post('/', authMiddleware, [
  body('userId').isString(),
  body('type').isIn(['SUBMISSION_NEW', 'SUBMISSION_UPDATED', 'SUBMISSION_COMPLETED', 'DOCUMENT_UPLOADED', 'FORM_GENERATED', 'SIGNATURE_REQUIRED', 'SYSTEM_ALERT']),
  body('title').trim().isLength({ min: 1 }),
  body('message').trim().isLength({ min: 1 }),
  body('data').optional().isObject(),
  body('submissionId').optional().isString()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const currentUserId = (req as any).user.userId;
  const currentUserRole = (req as any).user.role;
  const { userId, type, title, message, data, submissionId } = req.body;

  // Only admins can create notifications for other users
  if (currentUserRole !== 'ADMIN' && userId !== currentUserId) {
    throw new CustomError('Insufficient permissions', 403);
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      type: type as any,
      title,
      message,
      data: data || {},
      submissionId
    }
  });

  logger.info(`Notification created: ${title} for user ${userId} by ${currentUserId}`);

  res.status(201).json({
    success: true,
    message: 'Notification created successfully',
    data: { notification }
  });
}));

export default router;
