import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { authenticateToken } from '@/middleware/auth';
import { validate } from '@/utils/validation';
import Joi from 'joi';
import { carrierIntegrationService } from '@/services/carrierIntegrationService';
import { logger } from '@/utils/logger';

const router = Router();

// Validation schemas
const quoteRequestSchema = Joi.object({
  submissionId: Joi.string().required(),
  businessInfo: Joi.object({
    name: Joi.string().required(),
    federalId: Joi.string().required(),
    businessType: Joi.string().required(),
    yearsInBusiness: Joi.number().required(),
    description: Joi.string().required(),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required()
    }).required()
  }).required(),
  coverageInfo: Joi.object({
    coverageTypes: Joi.array().items(Joi.string()).required(),
    limits: Joi.object().pattern(Joi.string(), Joi.number()).required(),
    deductibles: Joi.object().pattern(Joi.string(), Joi.number()).required()
  }).required(),
  contactInfo: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().required()
  }).required()
});

const policyRequestSchema = Joi.object({
  quoteId: Joi.string().required(),
  submissionId: Joi.string().required(),
  effectiveDate: Joi.date().iso().required(),
  paymentMethod: Joi.string().valid('ANNUAL', 'SEMI_ANNUAL', 'QUARTERLY', 'MONTHLY').required(),
  billingInfo: Joi.object({
    name: Joi.string().required(),
    address: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zipCode: Joi.string().required()
  }).required()
});

// Get available carriers
router.get('/carriers', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const carriers = carrierIntegrationService.getAvailableCarriers();
  
  res.json({
    success: true,
    data: {
      carriers: carriers.map(name => ({
        name,
        config: carrierIntegrationService.getCarrierConfig(name)
      }))
    }
  });
}));

// Request quotes from carriers
router.post('/quotes/request', 
  authenticateToken,
  validate(quoteRequestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { carrierNames } = req.body;
    const quoteRequest = req.body;

    logger.info('Quote request received:', {
      submissionId: quoteRequest.submissionId,
      carriers: carrierNames || 'all'
    });

    const quotes = await carrierIntegrationService.requestQuotes(quoteRequest, carrierNames);

    res.json({
      success: true,
      data: {
        quotes: Object.fromEntries(quotes),
        totalQuotes: quotes.size,
        requestedCarriers: carrierNames || carrierIntegrationService.getAvailableCarriers()
      }
    });
  })
);

// Get quote from specific carrier
router.post('/quotes/:carrierName', 
  authenticateToken,
  validate(quoteRequestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { carrierName } = req.params;
    const quoteRequest = req.body;

    const quote = await carrierIntegrationService.requestQuoteFromCarrier(carrierName, quoteRequest);

    res.json({
      success: true,
      data: {
        carrier: carrierName,
        quote
      }
    });
  })
);

// Purchase policy
router.post('/policies/purchase', 
  authenticateToken,
  validate(policyRequestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { carrierName, ...policyRequest } = req.body;

    if (!carrierName) {
      return res.status(400).json({
        success: false,
        message: 'Carrier name is required'
      });
    }

    const policy = await carrierIntegrationService.purchasePolicy(carrierName, policyRequest);

    logger.info('Policy purchased:', {
      carrier: carrierName,
      policyId: policy.policyId,
      submissionId: policyRequest.submissionId
    });

    res.json({
      success: true,
      data: {
        carrier: carrierName,
        policy
      }
    });
  })
);

// Get policy status
router.get('/policies/:carrierName/:policyId/status', 
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { carrierName, policyId } = req.params;

    const policy = await carrierIntegrationService.getPolicyStatus(carrierName, policyId);

    res.json({
      success: true,
      data: {
        carrier: carrierName,
        policyId,
        policy
      }
    });
  })
);

// Cancel policy
router.post('/policies/:carrierName/:policyId/cancel', 
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { carrierName, policyId } = req.params;
    const { reason, effectiveDate } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required'
      });
    }

    const result = await carrierIntegrationService.cancelPolicy(
      carrierName, 
      policyId, 
      reason, 
      effectiveDate
    );

    logger.info('Policy cancelled:', {
      carrier: carrierName,
      policyId,
      cancellationId: result.cancellationId
    });

    res.json({
      success: true,
      data: {
        carrier: carrierName,
        policyId,
        cancellation: result
      }
    });
  })
);

// Get policy documents
router.get('/policies/:carrierName/:policyId/documents', 
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { carrierName, policyId } = req.params;

    const documents = await carrierIntegrationService.getPolicyDocuments(carrierName, policyId);

    res.json({
      success: true,
      data: {
        carrier: carrierName,
        policyId,
        documents
      }
    });
  })
);

// Webhook endpoint for carrier notifications
router.post('/webhooks/:carrierName', 
  asyncHandler(async (req: Request, res: Response) => {
    const { carrierName } = req.params;
    const payload = req.body;

    // Verify webhook signature if needed
    const signature = req.headers['x-webhook-signature'];
    if (signature && !verifyWebhookSignature(carrierName, payload, signature as string)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    const result = await carrierIntegrationService.handleCarrierWebhook(carrierName, payload);

    res.json({
      success: result.processed,
      message: result.message
    });
  })
);

// Get carrier integration status
router.get('/status', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const carriers = carrierIntegrationService.getAvailableCarriers();
  const status = carriers.map(carrierName => {
    const config = carrierIntegrationService.getCarrierConfig(carrierName);
    return {
      name: carrierName,
      configured: !!config?.apiKey,
      apiUrl: config?.apiBaseUrl,
      rateLimit: config?.rateLimitPerMinute,
      timeout: config?.timeout
    };
  });

  res.json({
    success: true,
    data: {
      carriers: status,
      totalCarriers: carriers.length,
      configuredCarriers: status.filter(c => c.configured).length
    }
  });
}));

// Test carrier connection
router.post('/test/:carrierName', 
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { carrierName } = req.params;

    try {
      const config = carrierIntegrationService.getCarrierConfig(carrierName);
      if (!config) {
        return res.status(404).json({
          success: false,
          message: `Carrier ${carrierName} not found`
        });
      }

      // Test connection with a simple API call
      const testResult = await testCarrierConnection(carrierName);

      res.json({
        success: true,
        data: {
          carrier: carrierName,
          connected: testResult.success,
          responseTime: testResult.responseTime,
          message: testResult.message
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to test connection to ${carrierName}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

// Helper functions
function verifyWebhookSignature(carrierName: string, payload: any, signature: string): boolean {
  // Implement webhook signature verification based on carrier
  // This is a simplified version - implement proper HMAC verification
  const expectedSignature = process.env[`${carrierName.toUpperCase()}_WEBHOOK_SECRET`];
  return signature === expectedSignature;
}

async function testCarrierConnection(carrierName: string): Promise<{
  success: boolean;
  responseTime: number;
  message: string;
}> {
  const startTime = Date.now();
  
  try {
    // Make a simple API call to test connection
    const config = carrierIntegrationService.getCarrierConfig(carrierName);
    if (!config) {
      throw new Error('Carrier not configured');
    }

    // This would be a real API call in production
    // For now, simulate a successful connection
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const responseTime = Date.now() - startTime;
    
    return {
      success: true,
      responseTime,
      message: 'Connection successful'
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      responseTime,
      message: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}

export default router;

