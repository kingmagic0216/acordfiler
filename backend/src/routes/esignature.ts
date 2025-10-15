import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { authMiddleware, requireBrokerOrAdmin } from '@/middleware/auth';
import { asyncHandler, CustomError } from '@/middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// DocuSign Integration Service
class DocuSignService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private baseUrl: string;

  constructor() {
    this.clientId = process.env.DOCUSIGN_CLIENT_ID || '';
    this.clientSecret = process.env.DOCUSIGN_CLIENT_SECRET || '';
    this.redirectUri = process.env.DOCUSIGN_REDIRECT_URI || '';
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://account.docusign.com' 
      : 'https://account-d.docusign.com';
  }

  async getAuthUrl(userId: string): Promise<string> {
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    const params = new URLSearchParams({
      response_type: 'code',
      scope: 'signature',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state: state
    });

    return `${this.baseUrl}/oauth/auth?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret
      })
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    return response.json();
  }

  async createEnvelope(accessToken: string, envelopeData: any): Promise<any> {
    const accountId = await this.getAccountId(accessToken);
    
    const response = await fetch(`https://demo.docusign.net/restapi/v2.1/accounts/${accountId}/envelopes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(envelopeData)
    });

    if (!response.ok) {
      throw new Error('Failed to create envelope');
    }

    return response.json();
  }

  private async getAccountId(accessToken: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/oauth/userinfo`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get account info');
    }

    const data = await response.json();
    return data.accounts[0].account_id;
  }

  async getEnvelopeStatus(accessToken: string, envelopeId: string): Promise<any> {
    const accountId = await this.getAccountId(accessToken);
    
    const response = await fetch(`https://demo.docusign.net/restapi/v2.1/accounts/${accountId}/envelopes/${envelopeId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get envelope status');
    }

    return response.json();
  }
}

const docuSignService = new DocuSignService();

// Get DocuSign authorization URL
router.get('/docusign/auth', authMiddleware, requireBrokerOrAdmin, asyncHandler(async (req, res) => {
  const userId = (req as any).user.userId;
  
  try {
    const authUrl = await docuSignService.getAuthUrl(userId);
    
    res.json({
      success: true,
      data: { authUrl }
    });
  } catch (error) {
    logger.error('DocuSign auth URL generation failed:', error);
    throw new CustomError('Failed to generate DocuSign authorization URL', 500);
  }
}));

// Handle DocuSign callback
router.post('/docusign/callback', [
  body('code').isString(),
  body('state').isString()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { code, state } = req.body;
  
  try {
    // Decode state to get userId
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const userId = stateData.userId;

    // Exchange code for access token
    const tokenData = await docuSignService.exchangeCodeForToken(code);

    // Store token data in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        // Store DocuSign tokens (in real app, encrypt these)
        settings: {
          docusign: {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
          }
        }
      }
    });

    logger.info(`DocuSign integration completed for user ${userId}`);

    res.json({
      success: true,
      message: 'DocuSign integration completed successfully'
    });
  } catch (error) {
    logger.error('DocuSign callback failed:', error);
    throw new CustomError('DocuSign integration failed', 500);
  }
}));

// Send document for signature
router.post('/docusign/send', authMiddleware, requireBrokerOrAdmin, [
  body('submissionId').isString(),
  body('documentId').isString(),
  body('signerEmail').isEmail(),
  body('signerName').trim().isLength({ min: 1 }),
  body('emailSubject').optional().isString(),
  body('emailMessage').optional().isString()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const userId = (req as any).user.userId;
  const { submissionId, documentId, signerEmail, signerName, emailSubject, emailMessage } = req.body;

  try {
    // Get user's DocuSign tokens
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true }
    });

    if (!user?.settings?.docusign?.accessToken) {
      throw new CustomError('DocuSign not integrated for this user', 400);
    }

    // Get submission and document
    const submission = await prisma.submission.findFirst({
      where: {
        OR: [
          { id: submissionId },
          { submissionId: submissionId }
        ]
      }
    });

    if (!submission) {
      throw new CustomError('Submission not found', 404);
    }

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        submissionId: submission.id
      }
    });

    if (!document) {
      throw new CustomError('Document not found', 404);
    }

    // Read document file
    const fs = require('fs');
    const documentBuffer = fs.readFileSync(document.filePath);
    const documentBase64 = documentBuffer.toString('base64');

    // Create DocuSign envelope
    const envelopeData = {
      emailSubject: emailSubject || `Please sign: ${document.originalName}`,
      emailBlurb: emailMessage || `Please review and sign the attached document for ${submission.businessName}.`,
      documents: [{
        documentId: '1',
        name: document.originalName,
        documentBase64: documentBase64
      }],
      recipients: {
        signers: [{
          email: signerEmail,
          name: signerName,
          recipientId: '1',
          routingOrder: '1',
          tabs: {
            signHereTabs: [{
              documentId: '1',
              pageNumber: '1',
              xPosition: '100',
              yPosition: '100'
            }]
          }
        }]
      },
      status: 'sent'
    };

    const envelope = await docuSignService.createEnvelope(
      user.settings.docusign.accessToken,
      envelopeData
    );

    // Store envelope info in database
    await prisma.acordForm.create({
      data: {
        submissionId: submission.id,
        formType: 'DocuSign Envelope',
        formData: {
          envelopeId: envelope.envelopeId,
          status: envelope.status,
          signerEmail,
          signerName,
          sentAt: new Date().toISOString()
        },
        generatedBy: userId,
        status: 'SIGNED'
      }
    });

    logger.info(`DocuSign envelope sent: ${envelope.envelopeId} for submission ${submission.submissionId}`);

    res.json({
      success: true,
      message: 'Document sent for signature successfully',
      data: {
        envelopeId: envelope.envelopeId,
        status: envelope.status
      }
    });
  } catch (error) {
    logger.error('DocuSign send failed:', error);
    throw new CustomError('Failed to send document for signature', 500);
  }
}));

// Check signature status
router.get('/docusign/status/:envelopeId', authMiddleware, requireBrokerOrAdmin, asyncHandler(async (req, res) => {
  const { envelopeId } = req.params;
  const userId = (req as any).user.userId;

  try {
    // Get user's DocuSign tokens
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true }
    });

    if (!user?.settings?.docusign?.accessToken) {
      throw new CustomError('DocuSign not integrated for this user', 400);
    }

    // Get envelope status
    const envelopeStatus = await docuSignService.getEnvelopeStatus(
      user.settings.docusign.accessToken,
      envelopeId
    );

    // Update database if signed
    if (envelopeStatus.status === 'completed') {
      await prisma.acordForm.updateMany({
        where: {
          formData: {
            path: ['envelopeId'],
            equals: envelopeId
          }
        },
        data: {
          status: 'SIGNED',
          signedAt: new Date(envelopeStatus.completedDateTime)
        }
      });
    }

    res.json({
      success: true,
      data: {
        envelopeId: envelopeStatus.envelopeId,
        status: envelopeStatus.status,
        completedDateTime: envelopeStatus.completedDateTime,
        recipients: envelopeStatus.recipients
      }
    });
  } catch (error) {
    logger.error('DocuSign status check failed:', error);
    throw new CustomError('Failed to check signature status', 500);
  }
}));

// Webhook endpoint for DocuSign events
router.post('/docusign/webhook', asyncHandler(async (req, res) => {
  try {
    const { event, envelopeId } = req.body;

    logger.info(`DocuSign webhook received: ${event} for envelope ${envelopeId}`);

    // Update envelope status in database
    if (event === 'envelope-completed') {
      await prisma.acordForm.updateMany({
        where: {
          formData: {
            path: ['envelopeId'],
            equals: envelopeId
          }
        },
        data: {
          status: 'SIGNED',
          signedAt: new Date()
        }
      });

      // Create notification for broker
      const acordForm = await prisma.acordForm.findFirst({
        where: {
          formData: {
            path: ['envelopeId'],
            equals: envelopeId
          }
        },
        include: {
          submission: {
            include: {
              broker: true
            }
          }
        }
      });

      if (acordForm?.submission?.broker) {
        await prisma.notification.create({
          data: {
            userId: acordForm.submission.broker.id,
            type: 'SIGNATURE_REQUIRED',
            title: 'Document Signed',
            message: `Document for ${acordForm.submission.businessName} has been signed`,
            submissionId: acordForm.submission.id,
            data: {
              envelopeId,
              signedAt: new Date().toISOString()
            }
          }
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('DocuSign webhook failed:', error);
    res.status(500).json({ success: false });
  }
}));

export default router;
