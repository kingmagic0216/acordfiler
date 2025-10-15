import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { authMiddleware, requireBrokerOrAdmin } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { CustomError } from '@/middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// Validation rules
const createSubmissionValidation = [
  body('businessName').trim().isLength({ min: 1 }),
  body('federalId').trim().isLength({ min: 1 }),
  body('businessType').trim().isLength({ min: 1 }),
  body('yearsInBusiness').isInt({ min: 0 }),
  body('businessDescription').trim().isLength({ min: 1 }),
  body('contactName').trim().isLength({ min: 1 }),
  body('email').isEmail().normalizeEmail(),
  body('phone').trim().isLength({ min: 1 }),
  body('address').trim().isLength({ min: 1 }),
  body('city').trim().isLength({ min: 1 }),
  body('state').trim().isLength({ min: 1 }),
  body('zipCode').trim().isLength({ min: 1 }),
  body('coverageTypes').isArray({ min: 1 }),
  body('clientType').optional().isIn(['PERSONAL', 'BUSINESS', 'BOTH'])
];

const updateSubmissionValidation = [
  body('status').optional().isIn(['NEW', 'REVIEW', 'SIGNATURE', 'COMPLETED', 'REJECTED', 'CANCELLED']),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('brokerId').optional().isString()
];

// Get all submissions with filtering and pagination
router.get('/', authMiddleware, requireBrokerOrAdmin, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['NEW', 'REVIEW', 'SIGNATURE', 'COMPLETED', 'REJECTED', 'CANCELLED']),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  query('search').optional().isString(),
  query('sortBy').optional().isIn(['submittedAt', 'status', 'priority', 'businessName']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const userId = (req as any).user.userId;
  const userRole = (req as any).user.role;
  const agencyId = (req as any).user.agencyId;

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const {
    status,
    priority,
    search,
    sortBy = 'submittedAt',
    sortOrder = 'desc'
  } = req.query;

  // Build where clause
  const where: any = {};

  // Agency filtering
  if (userRole === 'BROKER' && agencyId) {
    where.agencyId = agencyId;
  }

  // Status filtering
  if (status) {
    where.status = status;
  }

  // Priority filtering
  if (priority) {
    where.priority = priority;
  }

  // Search filtering
  if (search) {
    where.OR = [
      { businessName: { contains: search as string, mode: 'insensitive' } },
      { contactName: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } },
      { submissionId: { contains: search as string, mode: 'insensitive' } }
    ];
  }

  // Build orderBy clause
  const orderBy: any = {};
  orderBy[sortBy as string] = sortOrder;

  // Get submissions
  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        broker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        agency: {
          select: {
            id: true,
            name: true
          }
        },
        documents: {
          select: {
            id: true,
            fileName: true,
            documentType: true,
            uploadedAt: true
          }
        },
        _count: {
          select: {
            documents: true,
            acordForms: true
          }
        }
      }
    }),
    prisma.submission.count({ where })
  ]);

  // Calculate pagination info
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  res.json({
    success: true,
    data: {
      submissions,
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

// Get single submission
router.get('/:id', authMiddleware, requireBrokerOrAdmin, asyncHandler(async (req, res) => {
  const submissionId = req.params.id;
  const userId = (req as any).user.userId;
  const userRole = (req as any).user.role;
  const agencyId = (req as any).user.agencyId;

  const where: any = {
    OR: [
      { id: submissionId },
      { submissionId: submissionId }
    ]
  };

  // Agency filtering
  if (userRole === 'BROKER' && agencyId) {
    where.agencyId = agencyId;
  }

  const submission = await prisma.submission.findFirst({
    where,
    include: {
      broker: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      agency: {
        select: {
          id: true,
          name: true
        }
      },
      documents: {
        select: {
          id: true,
          fileName: true,
          originalName: true,
          documentType: true,
          fileSize: true,
          mimeType: true,
          uploadedAt: true
        }
      },
      acordForms: {
        select: {
          id: true,
          formType: true,
          status: true,
          generatedAt: true,
          signedAt: true
        }
      }
    }
  });

  if (!submission) {
    throw new CustomError('Submission not found', 404);
  }

  res.json({
    success: true,
    data: { submission }
  });
}));

// Create new submission
router.post('/', authMiddleware, createSubmissionValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const userId = (req as any).user.userId;
  const agencyId = (req as any).user.agencyId;

  // Generate submission ID
  const lastSubmission = await prisma.submission.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { submissionId: true }
  });

  let nextId = 1;
  if (lastSubmission) {
    const match = lastSubmission.submissionId.match(/SUB-(\d+)/);
    if (match) {
      nextId = parseInt(match[1]) + 1;
    }
  }

  const submissionId = `SUB-${String(nextId).padStart(3, '0')}`;

  // Calculate priority based on coverage types
  const calculatePriority = (coverageTypes: string[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' => {
    const highPriorityTypes = ['Cyber Liability', 'Umbrella/Excess'];
    const mediumPriorityTypes = ['Commercial Property', 'Workers\' Compensation'];
    
    if (coverageTypes.some(type => highPriorityTypes.includes(type))) {
      return 'HIGH';
    }
    if (coverageTypes.some(type => mediumPriorityTypes.includes(type))) {
      return 'MEDIUM';
    }
    return 'LOW';
  };

  const submission = await prisma.submission.create({
    data: {
      submissionId,
      businessName: req.body.businessName,
      federalId: req.body.federalId,
      businessType: req.body.businessType,
      yearsInBusiness: req.body.yearsInBusiness,
      businessDescription: req.body.businessDescription,
      website: req.body.website,
      contactName: req.body.contactName,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      city: req.body.city,
      state: req.body.state,
      zipCode: req.body.zipCode,
      coverageTypes: req.body.coverageTypes,
      coverageResponses: req.body.coverageResponses || {},
      clientType: req.body.clientType || 'BUSINESS',
      priority: calculatePriority(req.body.coverageTypes),
      agencyId: agencyId
    },
    include: {
      agency: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  logger.info(`New submission created: ${submissionId} by user ${userId}`);

  res.status(201).json({
    success: true,
    message: 'Submission created successfully',
    data: { submission }
  });
}));

// Update submission
router.put('/:id', authMiddleware, requireBrokerOrAdmin, updateSubmissionValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const submissionId = req.params.id;
  const userId = (req as any).user.userId;
  const userRole = (req as any).user.role;
  const agencyId = (req as any).user.agencyId;

  const where: any = {
    OR: [
      { id: submissionId },
      { submissionId: submissionId }
    ]
  };

  // Agency filtering
  if (userRole === 'BROKER' && agencyId) {
    where.agencyId = agencyId;
  }

  const existingSubmission = await prisma.submission.findFirst({
    where
  });

  if (!existingSubmission) {
    throw new CustomError('Submission not found', 404);
  }

  const updateData: any = {};

  if (req.body.status) {
    updateData.status = req.body.status;
    
    // Set timestamps based on status
    if (req.body.status === 'REVIEW' && existingSubmission.status !== 'REVIEW') {
      updateData.reviewedAt = new Date();
    }
    if (req.body.status === 'COMPLETED' && existingSubmission.status !== 'COMPLETED') {
      updateData.completedAt = new Date();
    }
  }

  if (req.body.priority) {
    updateData.priority = req.body.priority;
  }

  if (req.body.brokerId) {
    updateData.brokerId = req.body.brokerId;
  }

  const submission = await prisma.submission.update({
    where: { id: existingSubmission.id },
    data: updateData,
    include: {
      broker: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      agency: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  logger.info(`Submission updated: ${submission.submissionId} by user ${userId}`);

  res.json({
    success: true,
    message: 'Submission updated successfully',
    data: { submission }
  });
}));

// Delete submission
router.delete('/:id', authMiddleware, requireBrokerOrAdmin, asyncHandler(async (req, res) => {
  const submissionId = req.params.id;
  const userId = (req as any).user.userId;
  const userRole = (req as any).user.role;
  const agencyId = (req as any).user.agencyId;

  const where: any = {
    OR: [
      { id: submissionId },
      { submissionId: submissionId }
    ]
  };

  // Agency filtering
  if (userRole === 'BROKER' && agencyId) {
    where.agencyId = agencyId;
  }

  const submission = await prisma.submission.findFirst({
    where
  });

  if (!submission) {
    throw new CustomError('Submission not found', 404);
  }

  await prisma.submission.delete({
    where: { id: submission.id }
  });

  logger.info(`Submission deleted: ${submission.submissionId} by user ${userId}`);

  res.json({
    success: true,
    message: 'Submission deleted successfully'
  });
}));

// Get submission statistics
router.get('/stats/overview', authMiddleware, requireBrokerOrAdmin, asyncHandler(async (req, res) => {
  const userId = (req as any).user.userId;
  const userRole = (req as any).user.role;
  const agencyId = (req as any).user.agencyId;

  const where: any = {};

  // Agency filtering
  if (userRole === 'BROKER' && agencyId) {
    where.agencyId = agencyId;
  }

  const [
    totalSubmissions,
    newSubmissions,
    reviewSubmissions,
    completedSubmissions,
    activeClients
  ] = await Promise.all([
    prisma.submission.count({ where }),
    prisma.submission.count({ where: { ...where, status: 'NEW' } }),
    prisma.submission.count({ where: { ...where, status: 'REVIEW' } }),
    prisma.submission.count({ where: { ...where, status: 'COMPLETED' } }),
    prisma.submission.count({ 
      where: { 
        ...where, 
        status: { in: ['NEW', 'REVIEW', 'SIGNATURE'] }
      } 
    })
  ]);

  res.json({
    success: true,
    data: {
      totalSubmissions,
      newSubmissions,
      reviewSubmissions,
      completedSubmissions,
      activeClients
    }
  });
}));

export default router;

