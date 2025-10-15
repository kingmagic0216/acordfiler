import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { authMiddleware, requireAdmin } from '@/middleware/auth';
import { asyncHandler, CustomError } from '@/middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// Get field mappings
router.get('/field-mappings', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const { acordForm, fieldType, required, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const where: any = {};

  if (acordForm) {
    where.acordForm = acordForm;
  }

  if (fieldType) {
    where.fieldType = fieldType;
  }

  if (required !== undefined) {
    where.required = required === 'true';
  }

  const orderBy: any = {};
  orderBy[sortBy as string] = sortOrder;

  const [fieldMappings, total] = await Promise.all([
    prisma.fieldMapping.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        agency: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }),
    prisma.fieldMapping.count({ where })
  ]);

  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  res.json({
    success: true,
    data: {
      fieldMappings,
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

// Create field mapping
router.post('/field-mappings', authMiddleware, requireAdmin, [
  body('acordForm').trim().isLength({ min: 1 }),
  body('fieldName').trim().isLength({ min: 1 }),
  body('intakeField').trim().isLength({ min: 1 }),
  body('fieldType').isIn(['TEXT', 'TEXTAREA', 'NUMBER', 'SELECT', 'CHECKBOX', 'DATE', 'EMAIL', 'PHONE']),
  body('required').isBoolean(),
  body('agencyId').optional().isString()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { acordForm, fieldName, intakeField, fieldType, required, agencyId } = req.body;
  const userId = (req as any).user.userId;

  const fieldMapping = await prisma.fieldMapping.create({
    data: {
      acordForm,
      fieldName,
      intakeField,
      fieldType: fieldType as any,
      required,
      agencyId
    }
  });

  logger.info(`Field mapping created: ${fieldName} by admin ${userId}`);

  res.status(201).json({
    success: true,
    message: 'Field mapping created successfully',
    data: { fieldMapping }
  });
}));

// Update field mapping
router.put('/field-mappings/:id', authMiddleware, requireAdmin, [
  body('acordForm').optional().trim().isLength({ min: 1 }),
  body('fieldName').optional().trim().isLength({ min: 1 }),
  body('intakeField').optional().trim().isLength({ min: 1 }),
  body('fieldType').optional().isIn(['TEXT', 'TEXTAREA', 'NUMBER', 'SELECT', 'CHECKBOX', 'DATE', 'EMAIL', 'PHONE']),
  body('required').optional().isBoolean()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const mappingId = req.params.id;
  const userId = (req as any).user.userId;
  const { acordForm, fieldName, intakeField, fieldType, required } = req.body;

  const existingMapping = await prisma.fieldMapping.findUnique({
    where: { id: mappingId }
  });

  if (!existingMapping) {
    throw new CustomError('Field mapping not found', 404);
  }

  const updateData: any = {};
  if (acordForm) updateData.acordForm = acordForm;
  if (fieldName) updateData.fieldName = fieldName;
  if (intakeField) updateData.intakeField = intakeField;
  if (fieldType) updateData.fieldType = fieldType;
  if (required !== undefined) updateData.required = required;

  const fieldMapping = await prisma.fieldMapping.update({
    where: { id: mappingId },
    data: updateData
  });

  logger.info(`Field mapping updated: ${fieldMapping.fieldName} by admin ${userId}`);

  res.json({
    success: true,
    message: 'Field mapping updated successfully',
    data: { fieldMapping }
  });
}));

// Delete field mapping
router.delete('/field-mappings/:id', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const mappingId = req.params.id;
  const userId = (req as any).user.userId;

  const fieldMapping = await prisma.fieldMapping.findUnique({
    where: { id: mappingId },
    select: { fieldName: true }
  });

  if (!fieldMapping) {
    throw new CustomError('Field mapping not found', 404);
  }

  await prisma.fieldMapping.delete({
    where: { id: mappingId }
  });

  logger.info(`Field mapping deleted: ${fieldMapping.fieldName} by admin ${userId}`);

  res.json({
    success: true,
    message: 'Field mapping deleted successfully'
  });
}));

// Get audit logs
router.get('/audit-logs', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const { action, resource, userId, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const where: any = {};

  if (action) {
    where.action = { contains: action as string, mode: 'insensitive' };
  }

  if (resource) {
    where.resource = { contains: resource as string, mode: 'insensitive' };
  }

  if (userId) {
    where.userId = userId;
  }

  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string)
    };
  }

  const orderBy: any = {};
  orderBy[sortBy as string] = sortOrder;

  const [auditLogs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    }),
    prisma.auditLog.count({ where })
  ]);

  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  res.json({
    success: true,
    data: {
      auditLogs,
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

// Get system settings
router.get('/settings', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const settings = await prisma.systemSetting.findMany({
    orderBy: { key: 'asc' }
  });

  // Convert array to object
  const settingsObject = settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as any);

  res.json({
    success: true,
    data: { settings: settingsObject }
  });
}));

// Update system settings
router.put('/settings', authMiddleware, requireAdmin, [
  body('settings').isObject()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { settings } = req.body;
  const userId = (req as any).user.userId;

  // Update settings in transaction
  await prisma.$transaction(async (tx) => {
    for (const [key, value] of Object.entries(settings)) {
      await tx.systemSetting.upsert({
        where: { key },
        update: { value: value as any },
        create: { key, value: value as any }
      });
    }
  });

  logger.info(`System settings updated by admin ${userId}`);

  res.json({
    success: true,
    message: 'System settings updated successfully'
  });
}));

// Export audit logs
router.get('/export/audit-logs', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { startDate, endDate, format = 'csv' } = req.query;
  const userId = (req as any).user.userId;

  const where: any = {};
  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string)
    };
  }

  const auditLogs = await prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (format === 'csv') {
    // Generate CSV
    const csvHeader = 'Date,User,Action,Resource,Resource ID,IP Address,User Agent\n';
    const csvRows = auditLogs.map(log => {
      const user = log.user ? `${log.user.firstName} ${log.user.lastName} (${log.user.email})` : 'System';
      return [
        log.createdAt.toISOString(),
        user,
        log.action,
        log.resource,
        log.resourceId || '',
        log.ipAddress || '',
        log.userAgent || ''
      ].join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } else {
    res.json({
      success: true,
      data: { auditLogs }
    });
  }

  logger.info(`Audit logs exported by admin ${userId}`);
}));

// Get system statistics
router.get('/stats/overview', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalSubmissions,
    totalDocuments,
    totalAcordForms,
    activeAgencies,
    systemUptime
  ] = await Promise.all([
    prisma.user.count(),
    prisma.submission.count(),
    prisma.document.count(),
    prisma.acordForm.count(),
    prisma.agency.count(),
    process.uptime()
  ]);

  res.json({
    success: true,
    data: {
      totalUsers,
      totalSubmissions,
      totalDocuments,
      totalAcordForms,
      activeAgencies,
      systemUptime: Math.floor(systemUptime)
    }
  });
}));

export default router;

