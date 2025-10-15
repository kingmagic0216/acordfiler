import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { authMiddleware, requireBrokerOrAdmin } from '@/middleware/auth';
import { asyncHandler, CustomError } from '@/middleware/errorHandler';
import { generateACORDPDF, generateCOI } from '@/services/pdfService';

const router = Router();
const prisma = new PrismaClient();

// Validation rules
const generateFormValidation = [
  body('formType').isIn(['ACORD 125', 'ACORD 126', 'ACORD 127', 'ACORD 130', 'ACORD 140']),
  body('includeWatermark').optional().isBoolean(),
  body('watermarkText').optional().isString()
];

// Generate ACORD form PDF
router.post('/generate/:submissionId', 
  authMiddleware, 
  requireBrokerOrAdmin,
  generateFormValidation,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError('Validation failed', 400);
    }

    const { submissionId } = req.params;
    const { formType, includeWatermark = false, watermarkText } = req.body;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const agencyId = (req as any).user.agencyId;

    // Verify submission exists and user has access
    const where: any = {
      OR: [
        { id: submissionId },
        { submissionId: submissionId }
      ]
    };

    if (userRole === 'BROKER' && agencyId) {
      where.agencyId = agencyId;
    }

    const submission = await prisma.submission.findFirst({
      where,
      include: {
        agency: {
          select: {
            name: true,
            primaryColor: true,
            accentColor: true
          }
        }
      }
    });

    if (!submission) {
      throw new CustomError('Submission not found', 404);
    }

    try {
      // Generate PDF
      const pdfBuffer = await generateACORDPDF(submission, formType, {
        includeWatermark,
        watermarkText: watermarkText || `${submission.agency?.name || 'ACORD Intake Platform'} - Generated ${new Date().toLocaleDateString()}`
      });

      // Create ACORD form record
      const acordForm = await prisma.acordForm.create({
        data: {
          submissionId: submission.id,
          formType,
          formData: {
            submissionId: submission.submissionId,
            businessName: submission.businessName,
            federalId: submission.federalId,
            businessType: submission.businessType,
            yearsInBusiness: submission.yearsInBusiness,
            businessDescription: submission.businessDescription,
            contactName: submission.contactName,
            email: submission.email,
            phone: submission.phone,
            address: submission.address,
            city: submission.city,
            state: submission.state,
            zipCode: submission.zipCode,
            coverageTypes: submission.coverageTypes,
            coverageResponses: submission.coverageResponses,
            generatedAt: new Date().toISOString(),
            generatedBy: userId
          },
          generatedBy: userId,
          status: 'GENERATED'
        }
      });

      logger.info(`ACORD form generated: ${formType} for submission ${submission.submissionId} by user ${userId}`);

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${formType.replace(' ', '_')}_${submission.submissionId}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);

    } catch (error) {
      logger.error('ACORD form generation failed:', error);
      throw new CustomError('Failed to generate ACORD form', 500);
    }
  })
);

// Generate Certificate of Insurance (COI)
router.post('/coi/:submissionId',
  authMiddleware,
  requireBrokerOrAdmin,
  [
    body('holderName').trim().isLength({ min: 1 }),
    body('holderAddress').trim().isLength({ min: 1 }),
    body('holderCity').trim().isLength({ min: 1 }),
    body('holderState').trim().isLength({ min: 1 }),
    body('holderZipCode').trim().isLength({ min: 1 }),
    body('coverageTypes').isArray({ min: 1 }),
    body('effectiveDate').optional().isISO8601(),
    body('expirationDate').optional().isISO8601()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError('Validation failed', 400);
    }

    const { submissionId } = req.params;
    const {
      holderName,
      holderAddress,
      holderCity,
      holderState,
      holderZipCode,
      coverageTypes,
      effectiveDate,
      expirationDate
    } = req.body;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const agencyId = (req as any).user.agencyId;

    // Verify submission exists and user has access
    const where: any = {
      OR: [
        { id: submissionId },
        { submissionId: submissionId }
      ]
    };

    if (userRole === 'BROKER' && agencyId) {
      where.agencyId = agencyId;
    }

    const submission = await prisma.submission.findFirst({
      where,
      include: {
        agency: {
          select: {
            name: true,
            primaryColor: true,
            accentColor: true
          }
        }
      }
    });

    if (!submission) {
      throw new CustomError('Submission not found', 404);
    }

    try {
      // Generate COI PDF
      const pdfBuffer = await generateCOI(submission, {
        holderName,
        holderAddress,
        holderCity,
        holderState,
        holderZipCode,
        coverageTypes,
        effectiveDate: effectiveDate || new Date().toISOString(),
        expirationDate: expirationDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
      });

      logger.info(`COI generated for submission ${submission.submissionId} by user ${userId}`);

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="COI_${submission.submissionId}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);

    } catch (error) {
      logger.error('COI generation failed:', error);
      throw new CustomError('Failed to generate COI', 500);
    }
  })
);

// Get ACORD forms for a submission
router.get('/:submissionId',
  authMiddleware,
  requireBrokerOrAdmin,
  asyncHandler(async (req, res) => {
    const { submissionId } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const agencyId = (req as any).user.agencyId;

    // Verify submission exists and user has access
    const where: any = {
      OR: [
        { id: submissionId },
        { submissionId: submissionId }
      ]
    };

    if (userRole === 'BROKER' && agencyId) {
      where.agencyId = agencyId;
    }

    const submission = await prisma.submission.findFirst({
      where
    });

    if (!submission) {
      throw new CustomError('Submission not found', 404);
    }

    const acordForms = await prisma.acordForm.findMany({
      where: { submissionId: submission.id },
      orderBy: { generatedAt: 'desc' }
    });

    res.json({
      success: true,
      data: { acordForms }
    });
  })
);

// Get all ACORD forms with filtering
router.get('/',
  authMiddleware,
  requireBrokerOrAdmin,
  asyncHandler(async (req, res) => {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const agencyId = (req as any).user.agencyId;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const { formType, status, sortBy = 'generatedAt', sortOrder = 'desc' } = req.query;

    // Build where clause
    const where: any = {};

    if (formType) {
      where.formType = formType;
    }

    if (status) {
      where.status = status;
    }

    // Agency filtering
    if (userRole === 'BROKER' && agencyId) {
      where.submission = {
        agencyId: agencyId
      };
    }

    // Build orderBy clause
    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder;

    const [acordForms, total] = await Promise.all([
      prisma.acordForm.findMany({
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
              contactName: true,
              email: true,
              agency: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      }),
      prisma.acordForm.count({ where })
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
        acordForms,
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
  })
);

// Update ACORD form status
router.put('/:acordFormId/status',
  authMiddleware,
  requireBrokerOrAdmin,
  [
    body('status').isIn(['GENERATED', 'SIGNED', 'REJECTED', 'EXPIRED']),
    body('signedBy').optional().isString(),
    body('signedAt').optional().isISO8601()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError('Validation failed', 400);
    }

    const { acordFormId } = req.params;
    const { status, signedBy, signedAt } = req.body;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const agencyId = (req as any).user.agencyId;

    // Get ACORD form with submission
    const acordForm = await prisma.acordForm.findUnique({
      where: { id: acordFormId },
      include: {
        submission: {
          include: {
            agency: true
          }
        }
      }
    });

    if (!acordForm) {
      throw new CustomError('ACORD form not found', 404);
    }

    // Agency access check
    if (userRole === 'BROKER' && agencyId && acordForm.submission.agencyId !== agencyId) {
      throw new CustomError('Access denied', 403);
    }

    const updateData: any = { status };

    if (status === 'SIGNED') {
      updateData.signedBy = signedBy || userId;
      updateData.signedAt = signedAt ? new Date(signedAt) : new Date();
    }

    const updatedForm = await prisma.acordForm.update({
      where: { id: acordFormId },
      data: updateData,
      include: {
        submission: {
          select: {
            id: true,
            submissionId: true,
            businessName: true,
            contactName: true,
            email: true
          }
        }
      }
    });

    logger.info(`ACORD form status updated: ${acordFormId} to ${status} by user ${userId}`);

    res.json({
      success: true,
      message: 'ACORD form status updated successfully',
      data: { acordForm: updatedForm }
    });
  })
);

// Delete ACORD form
router.delete('/:acordFormId',
  authMiddleware,
  requireBrokerOrAdmin,
  asyncHandler(async (req, res) => {
    const { acordFormId } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const agencyId = (req as any).user.agencyId;

    // Get ACORD form with submission
    const acordForm = await prisma.acordForm.findUnique({
      where: { id: acordFormId },
      include: {
        submission: {
          include: {
            agency: true
          }
        }
      }
    });

    if (!acordForm) {
      throw new CustomError('ACORD form not found', 404);
    }

    // Agency access check
    if (userRole === 'BROKER' && agencyId && acordForm.submission.agencyId !== agencyId) {
      throw new CustomError('Access denied', 403);
    }

    await prisma.acordForm.delete({
      where: { id: acordFormId }
    });

    logger.info(`ACORD form deleted: ${acordFormId} by user ${userId}`);

    res.json({
      success: true,
      message: 'ACORD form deleted successfully'
    });
  })
);

export default router;

