import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { body, validationResult, query } from 'express-validator';
import { logger } from '@/utils/logger';
import { authMiddleware } from '@/middleware/auth';
import { rateLimitMiddleware } from '@/middleware/rateLimit';

const router = Router();
const prisma = new PrismaClient();

// Supabase client for real-time features
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Submissions API
router.get('/submissions', authMiddleware, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['NEW', 'REVIEW', 'SIGNATURE', 'COMPLETED', 'REJECTED', 'CANCELLED']),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const agencyId = (req as any).user.agencyId;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const priority = req.query.priority as string;

    const skip = (page - 1) * limit;

    // Build where clause based on user role
    let whereClause: any = {};
    
    if (userRole === 'CUSTOMER') {
      // Customers can only see their own submissions
      whereClause.broker_id = userId;
    } else if (userRole === 'BROKER') {
      // Brokers can see submissions assigned to them or their agency
      whereClause.OR = [
        { broker_id: userId },
        { agency_id: agencyId }
      ];
    }
    // Admins can see all submissions

    if (status) {
      whereClause.status = status;
    }
    if (priority) {
      whereClause.priority = priority;
    }

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where: whereClause,
        include: {
          agencies: {
            select: {
              id: true,
              name: true,
              logo: true
            }
          },
          users: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true
            }
          },
          documents: {
            select: {
              id: true,
              file_name: true,
              document_type: true,
              uploaded_at: true
            }
          },
          acord_forms: {
            select: {
              id: true,
              form_type: true,
              status: true,
              generated_at: true
            }
          },
          _count: {
            select: {
              documents: true,
              acord_forms: true,
              notifications: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      prisma.submission.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Get submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.post('/submissions', authMiddleware, rateLimitMiddleware, [
  body('businessName').trim().notEmpty(),
  body('federalId').trim().notEmpty(),
  body('businessType').trim().notEmpty(),
  body('yearsInBusiness').isInt({ min: 0 }),
  body('businessDescription').trim().notEmpty(),
  body('contactName').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('phone').trim().notEmpty(),
  body('address').trim().notEmpty(),
  body('city').trim().notEmpty(),
  body('state').trim().notEmpty(),
  body('zipCode').trim().notEmpty(),
  body('coverageTypes').isObject()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = (req as any).user.userId;
    const agencyId = (req as any).user.agencyId;

    // Generate submission ID
    const submissionCount = await prisma.submission.count();
    const submissionId = `SUB-${String(submissionCount + 1).padStart(4, '0')}`;

    const submission = await prisma.submission.create({
      data: {
        submission_id: submissionId,
        business_name: req.body.businessName,
        federal_id: req.body.federalId,
        business_type: req.body.businessType,
        years_in_business: req.body.yearsInBusiness,
        business_description: req.body.businessDescription,
        website: req.body.website,
        contact_name: req.body.contactName,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address,
        city: req.body.city,
        state: req.body.state,
        zip_code: req.body.zipCode,
        coverage_types: req.body.coverageTypes,
        coverage_responses: req.body.coverageResponses,
        client_type: req.body.clientType || 'BUSINESS',
        status: 'NEW',
        priority: req.body.priority || 'MEDIUM',
        broker_id: userId,
        agency_id: agencyId
      },
      include: {
        agencies: true,
        users: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        user_id: userId,
        action: 'CREATE',
        resource: 'SUBMISSION',
        resource_id: submission.id,
        details: {
          submission_id: submissionId,
          business_name: req.body.businessName
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }
    });

    // Send real-time notification
    await supabase.channel('submissions').send({
      type: 'broadcast',
      event: 'submission_created',
      payload: {
        submission: submission,
        message: `New submission created: ${submissionId}`
      }
    });

    logger.info(`New submission created: ${submissionId}`);

    res.status(201).json({
      success: true,
      message: 'Submission created successfully',
      data: { submission }
    });

  } catch (error) {
    logger.error('Create submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.get('/submissions/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const agencyId = (req as any).user.agencyId;

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        agencies: true,
        users: true,
        documents: {
          orderBy: { uploaded_at: 'desc' }
        },
        acord_forms: {
          orderBy: { generated_at: 'desc' }
        },
        notifications: {
          where: { user_id: userId },
          orderBy: { created_at: 'desc' }
        },
        audit_logs: {
          include: {
            users: {
              select: {
                first_name: true,
                last_name: true
              }
            }
          },
          orderBy: { created_at: 'desc' }
        }
      }
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check permissions
    if (userRole === 'CUSTOMER' && submission.broker_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (userRole === 'BROKER' && submission.broker_id !== userId && submission.agency_id !== agencyId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { submission }
    });

  } catch (error) {
    logger.error('Get submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.put('/submissions/:id', authMiddleware, [
  body('status').optional().isIn(['NEW', 'REVIEW', 'SIGNATURE', 'COMPLETED', 'REJECTED', 'CANCELLED']),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    const submission = await prisma.submission.findUnique({
      where: { id }
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check permissions
    if (userRole === 'CUSTOMER') {
      return res.status(403).json({
        success: false,
        message: 'Customers cannot update submissions'
      });
    }

    const updateData: any = {};
    if (req.body.status) updateData.status = req.body.status;
    if (req.body.priority) updateData.priority = req.body.priority;
    if (req.body.brokerId) updateData.broker_id = req.body.brokerId;

    // Set timestamps based on status
    if (req.body.status === 'REVIEW') {
      updateData.reviewed_at = new Date();
    } else if (req.body.status === 'COMPLETED') {
      updateData.completed_at = new Date();
    }

    const updatedSubmission = await prisma.submission.update({
      where: { id },
      data: updateData,
      include: {
        agencies: true,
        users: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        user_id: userId,
        action: 'UPDATE',
        resource: 'SUBMISSION',
        resource_id: id,
        details: {
          changes: updateData,
          submission_id: submission.submission_id
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }
    });

    // Send real-time notification
    await supabase.channel('submissions').send({
      type: 'broadcast',
      event: 'submission_updated',
      payload: {
        submission: updatedSubmission,
        message: `Submission ${submission.submission_id} updated`
      }
    });

    res.json({
      success: true,
      message: 'Submission updated successfully',
      data: { submission: updatedSubmission }
    });

  } catch (error) {
    logger.error('Update submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Documents API
router.post('/submissions/:id/documents', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    // Check if submission exists and user has access
    const submission = await prisma.submission.findUnique({
      where: { id }
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // For now, we'll handle file uploads in a separate endpoint
    // This endpoint is for creating document records
    const document = await prisma.document.create({
      data: {
        submission_id: id,
        file_name: req.body.fileName,
        original_name: req.body.originalName,
        file_path: req.body.filePath,
        file_size: req.body.fileSize,
        mime_type: req.body.mimeType,
        file_hash: req.body.fileHash,
        document_type: req.body.documentType,
        description: req.body.description,
        uploaded_by: userId
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        user_id: userId,
        action: 'CREATE',
        resource: 'DOCUMENT',
        resource_id: document.id,
        details: {
          file_name: req.body.fileName,
          submission_id: submission.submission_id
        },
        submission_id: id,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: { document }
    });

  } catch (error) {
    logger.error('Upload document error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ACORD Forms API
router.post('/submissions/:id/acord-forms', authMiddleware, [
  body('formType').trim().notEmpty(),
  body('formData').isObject(),
  body('generatedBy').trim().notEmpty()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const userId = (req as any).user.userId;

    const acordForm = await prisma.acordForm.create({
      data: {
        submission_id: id,
        form_type: req.body.formType,
        form_data: req.body.formData,
        generated_by: req.body.generatedBy,
        status: 'GENERATED',
        file_path: req.body.filePath,
        file_hash: req.body.fileHash
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        user_id: userId,
        action: 'CREATE',
        resource: 'ACORD_FORM',
        resource_id: acordForm.id,
        details: {
          form_type: req.body.formType,
          submission_id: id
        },
        submission_id: id,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }
    });

    res.status(201).json({
      success: true,
      message: 'ACORD form generated successfully',
      data: { acordForm }
    });

  } catch (error) {
    logger.error('Generate ACORD form error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Notifications API
router.get('/notifications', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { user_id: userId },
        include: {
          submissions: {
            select: {
              id: true,
              submission_id: true,
              business_name: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      prisma.notification.count({ where: { user_id: userId } })
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.put('/notifications/:id/read', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    const notification = await prisma.notification.updateMany({
      where: {
        id,
        user_id: userId
      },
      data: {
        read: true,
        read_at: new Date()
      }
    });

    if (notification.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    logger.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Dashboard stats API
router.get('/dashboard/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const agencyId = (req as any).user.agencyId;

    let whereClause: any = {};
    
    if (userRole === 'CUSTOMER') {
      whereClause.broker_id = userId;
    } else if (userRole === 'BROKER') {
      whereClause.OR = [
        { broker_id: userId },
        { agency_id: agencyId }
      ];
    }

    const [
      totalSubmissions,
      newSubmissions,
      completedSubmissions,
      pendingSubmissions,
      unreadNotifications
    ] = await Promise.all([
      prisma.submission.count({ where: whereClause }),
      prisma.submission.count({ where: { ...whereClause, status: 'NEW' } }),
      prisma.submission.count({ where: { ...whereClause, status: 'COMPLETED' } }),
      prisma.submission.count({ where: { ...whereClause, status: { in: ['REVIEW', 'SIGNATURE'] } } }),
      prisma.notification.count({ where: { user_id: userId, read: false } })
    ]);

    res.json({
      success: true,
      data: {
        totalSubmissions,
        newSubmissions,
        completedSubmissions,
        pendingSubmissions,
        unreadNotifications
      }
    });

  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
