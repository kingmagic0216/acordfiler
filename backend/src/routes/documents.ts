import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { authMiddleware, requireBrokerOrAdmin } from '@/middleware/auth';
import { asyncHandler, CustomError } from '@/middleware/errorHandler';
import { uploadRateLimit } from '@/middleware/rateLimit';

const router = Router();
const prisma = new PrismaClient();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const submissionId = req.params.submissionId;
    const submissionDir = path.join(uploadsDir, submissionId);
    
    if (!fs.existsSync(submissionDir)) {
      fs.mkdirSync(submissionDir, { recursive: true });
    }
    
    cb(null, submissionDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(file.originalname);
    const filename = `${timestamp}-${randomString}${extension}`;
    cb(null, filename);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = (process.env.UPLOAD_ALLOWED_TYPES || 'pdf,doc,docx,jpg,jpeg,png').split(',');
  const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
  
  if (allowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new CustomError(`File type .${fileExtension} is not allowed`, 400));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.UPLOAD_MAX_SIZE || '10485760'), // 10MB default
    files: 10 // Maximum 10 files per request
  }
});

// Upload files for a submission
router.post('/:submissionId/upload', 
  authMiddleware, 
  requireBrokerOrAdmin, 
  uploadRateLimit,
  upload.array('files', 10),
  asyncHandler(async (req, res) => {
    const submissionId = req.params.submissionId;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const agencyId = (req as any).user.agencyId;

    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      throw new CustomError('No files uploaded', 400);
    }

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

    const uploadedFiles = req.files as Express.Multer.File[];
    const documents = [];

    for (const file of uploadedFiles) {
      // Calculate file hash for integrity checking
      const fileBuffer = fs.readFileSync(file.path);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Determine document type based on file extension
      const extension = path.extname(file.originalname).toLowerCase();
      let documentType = 'OTHER';
      
      if (['.pdf'].includes(extension)) {
        documentType = 'APPLICATION';
      } else if (['.doc', '.docx'].includes(extension)) {
        documentType = 'POLICY';
      } else if (['.jpg', '.jpeg', '.png'].includes(extension)) {
        documentType = 'CERTIFICATE';
      }

      // Create document record
      const document = await prisma.document.create({
        data: {
          submissionId: submission.id,
          fileName: file.filename,
          originalName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
          fileHash,
          documentType: documentType as any,
          uploadedBy: userId
        }
      });

      documents.push(document);
    }

    logger.info(`Files uploaded for submission ${submission.submissionId}: ${documents.length} files by user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Files uploaded successfully',
      data: { documents }
    });
  })
);

// Get files for a submission
router.get('/:submissionId/files', 
  authMiddleware, 
  requireBrokerOrAdmin,
  asyncHandler(async (req, res) => {
    const submissionId = req.params.submissionId;
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

    const documents = await prisma.document.findMany({
      where: { submissionId: submission.id },
      orderBy: { uploadedAt: 'desc' }
    });

    res.json({
      success: true,
      data: { documents }
    });
  })
);

// Download a file
router.get('/:submissionId/files/:documentId/download',
  authMiddleware,
  requireBrokerOrAdmin,
  asyncHandler(async (req, res) => {
    const { submissionId, documentId } = req.params;
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

    // Get document
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        submissionId: submission.id
      }
    });

    if (!document) {
      throw new CustomError('Document not found', 404);
    }

    // Check if file exists
    if (!fs.existsSync(document.filePath)) {
      throw new CustomError('File not found on disk', 404);
    }

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Length', document.fileSize);

    // Stream file to response
    const fileStream = fs.createReadStream(document.filePath);
    fileStream.pipe(res);

    logger.info(`File downloaded: ${document.originalName} by user ${userId}`);
  })
);

// Delete a file
router.delete('/:submissionId/files/:documentId',
  authMiddleware,
  requireBrokerOrAdmin,
  asyncHandler(async (req, res) => {
    const { submissionId, documentId } = req.params;
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

    // Get document
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        submissionId: submission.id
      }
    });

    if (!document) {
      throw new CustomError('Document not found', 404);
    }

    // Delete file from disk
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    // Delete document record
    await prisma.document.delete({
      where: { id: document.id }
    });

    logger.info(`File deleted: ${document.originalName} by user ${userId}`);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  })
);

// Get file metadata
router.get('/:submissionId/files/:documentId',
  authMiddleware,
  requireBrokerOrAdmin,
  asyncHandler(async (req, res) => {
    const { submissionId, documentId } = req.params;
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

    // Get document
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        submissionId: submission.id
      }
    });

    if (!document) {
      throw new CustomError('Document not found', 404);
    }

    res.json({
      success: true,
      data: { document }
    });
  })
);

export default router;
