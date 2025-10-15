import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

// Validation schemas
export const validationSchemas = {
  // User validation
  user: {
    register: Joi.object({
      email: Joi.string().email().required().normalizeEmail(),
      password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])')).required(),
      firstName: Joi.string().min(1).max(50).required(),
      lastName: Joi.string().min(1).max(50).required(),
      role: Joi.string().valid('ADMIN', 'BROKER', 'CUSTOMER').default('CUSTOMER'),
      phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
      agencyId: Joi.string().optional()
    }),

    login: Joi.object({
      email: Joi.string().email().required().normalizeEmail(),
      password: Joi.string().required()
    }),

    update: Joi.object({
      firstName: Joi.string().min(1).max(50).optional(),
      lastName: Joi.string().min(1).max(50).optional(),
      role: Joi.string().valid('ADMIN', 'BROKER', 'CUSTOMER').optional(),
      status: Joi.string().valid('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING').optional(),
      phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
      agencyId: Joi.string().optional()
    }),

    changePassword: Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])')).required()
    })
  },

  // Submission validation
  submission: {
    create: Joi.object({
      businessName: Joi.string().min(1).max(200).required(),
      federalId: Joi.string().pattern(/^[0-9]{2}-[0-9]{7}$/).required(),
      businessType: Joi.string().valid('sole-proprietorship', 'partnership', 'llc', 'corporation', 'non-profit').required(),
      yearsInBusiness: Joi.number().integer().min(0).max(100).required(),
      businessDescription: Joi.string().min(10).max(1000).required(),
      website: Joi.string().uri().optional(),
      contactName: Joi.string().min(1).max(100).required(),
      email: Joi.string().email().required().normalizeEmail(),
      phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).required(),
      address: Joi.string().min(1).max(200).required(),
      city: Joi.string().min(1).max(100).required(),
      state: Joi.string().length(2).uppercase().required(),
      zipCode: Joi.string().pattern(/^[0-9]{5}(-[0-9]{4})?$/).required(),
      coverageTypes: Joi.array().items(Joi.string()).min(1).required(),
      coverageResponses: Joi.object().optional(),
      clientType: Joi.string().valid('PERSONAL', 'BUSINESS', 'BOTH').default('BUSINESS')
    }),

    update: Joi.object({
      status: Joi.string().valid('NEW', 'REVIEW', 'SIGNATURE', 'COMPLETED', 'REJECTED', 'CANCELLED').optional(),
      priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').optional(),
      brokerId: Joi.string().optional()
    })
  },

  // Document validation
  document: {
    upload: Joi.object({
      submissionId: Joi.string().required(),
      files: Joi.array().items(Joi.object({
        fieldname: Joi.string().required(),
        originalname: Joi.string().required(),
        encoding: Joi.string().required(),
        mimetype: Joi.string().required(),
        size: Joi.number().max(10485760).required() // 10MB max
      })).min(1).max(10).required()
    })
  },

  // ACORD form validation
  acordForm: {
    generate: Joi.object({
      formType: Joi.string().valid('ACORD 125', 'ACORD 126', 'ACORD 127', 'ACORD 130', 'ACORD 140').required(),
      includeWatermark: Joi.boolean().default(false),
      watermarkText: Joi.string().max(100).optional()
    }),

    coi: Joi.object({
      holderName: Joi.string().min(1).max(200).required(),
      holderAddress: Joi.string().min(1).max(200).required(),
      holderCity: Joi.string().min(1).max(100).required(),
      holderState: Joi.string().length(2).uppercase().required(),
      holderZipCode: Joi.string().pattern(/^[0-9]{5}(-[0-9]{4})?$/).required(),
      coverageTypes: Joi.array().items(Joi.string()).min(1).required(),
      effectiveDate: Joi.date().iso().optional(),
      expirationDate: Joi.date().iso().min(Joi.ref('effectiveDate')).optional()
    })
  },

  // Field mapping validation
  fieldMapping: {
    create: Joi.object({
      acordForm: Joi.string().min(1).max(50).required(),
      fieldName: Joi.string().min(1).max(100).required(),
      intakeField: Joi.string().min(1).max(100).required(),
      fieldType: Joi.string().valid('TEXT', 'TEXTAREA', 'NUMBER', 'SELECT', 'CHECKBOX', 'DATE', 'EMAIL', 'PHONE').required(),
      required: Joi.boolean().default(false),
      agencyId: Joi.string().optional()
    }),

    update: Joi.object({
      acordForm: Joi.string().min(1).max(50).optional(),
      fieldName: Joi.string().min(1).max(100).optional(),
      intakeField: Joi.string().min(1).max(100).optional(),
      fieldType: Joi.string().valid('TEXT', 'TEXTAREA', 'NUMBER', 'SELECT', 'CHECKBOX', 'DATE', 'EMAIL', 'PHONE').optional(),
      required: Joi.boolean().optional()
    })
  },

  // Notification validation
  notification: {
    create: Joi.object({
      userId: Joi.string().required(),
      type: Joi.string().valid('SUBMISSION_NEW', 'SUBMISSION_UPDATED', 'SUBMISSION_COMPLETED', 'DOCUMENT_UPLOADED', 'FORM_GENERATED', 'SIGNATURE_REQUIRED', 'SYSTEM_ALERT').required(),
      title: Joi.string().min(1).max(200).required(),
      message: Joi.string().min(1).max(1000).required(),
      data: Joi.object().optional(),
      submissionId: Joi.string().optional()
    })
  },

  // E-signature validation
  esignature: {
    send: Joi.object({
      submissionId: Joi.string().required(),
      documentId: Joi.string().required(),
      signerEmail: Joi.string().email().required().normalizeEmail(),
      signerName: Joi.string().min(1).max(100).required(),
      emailSubject: Joi.string().max(200).optional(),
      emailMessage: Joi.string().max(1000).optional()
    })
  }
};

// Validation middleware factory
export function validate(schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Validation failed:', {
        path: req.path,
        method: req.method,
        errors: errorDetails
      });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errorDetails
      });
    }

    // Replace the original property with validated and sanitized value
    req[property] = value;
    next();
  };
}

// Custom validation functions
export const customValidators = {
  // Validate business type based on years in business
  businessTypeConsistency: (businessType: string, yearsInBusiness: number) => {
    if (businessType === 'corporation' && yearsInBusiness < 1) {
      return 'Corporations must be in business for at least 1 year';
    }
    return null;
  },

  // Validate coverage types based on business type
  coverageTypeCompatibility: (businessType: string, coverageTypes: string[]) => {
    const incompatibleTypes: Record<string, string[]> = {
      'sole-proprietorship': ['Workers\' Compensation'],
      'partnership': ['Workers\' Compensation']
    };

    const incompatible = incompatibleTypes[businessType] || [];
    const hasIncompatible = coverageTypes.some(type => incompatible.includes(type));

    if (hasIncompatible) {
      return `${businessType} businesses cannot have ${incompatible.join(', ')} coverage`;
    }
    return null;
  },

  // Validate state and ZIP code consistency
  stateZipConsistency: (state: string, zipCode: string) => {
    const stateZipRanges: Record<string, { min: number; max: number }> = {
      'CA': { min: 90000, max: 96199 },
      'NY': { min: 10000, max: 14999 },
      'TX': { min: 75000, max: 79999 },
      'FL': { min: 32000, max: 34999 }
    };

    const range = stateZipRanges[state];
    if (range) {
      const zip = parseInt(zipCode.substring(0, 5));
      if (zip < range.min || zip > range.max) {
        return `ZIP code ${zipCode} is not valid for state ${state}`;
      }
    }
    return null;
  },

  // Validate email domain for business emails
  businessEmailDomain: (email: string, website?: string) => {
    if (website) {
      try {
        const domain = new URL(website).hostname.replace('www.', '');
        const emailDomain = email.split('@')[1];
        
        if (emailDomain !== domain) {
          return 'Email domain should match business website domain';
        }
      } catch (error) {
        // Invalid website URL, skip validation
      }
    }
    return null;
  },

  // Validate phone number format
  phoneNumberFormat: (phone: string) => {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    
    if (!phoneRegex.test(cleaned)) {
      return 'Invalid phone number format';
    }
    
    if (cleaned.length < 10 || cleaned.length > 16) {
      return 'Phone number must be between 10 and 16 digits';
    }
    
    return null;
  },

  // Validate federal ID format
  federalIdFormat: (federalId: string) => {
    const cleaned = federalId.replace(/[\s\-]/g, '');
    const federalIdRegex = /^[0-9]{9}$/;
    
    if (!federalIdRegex.test(cleaned)) {
      return 'Federal ID must be 9 digits in format XX-XXXXXXX';
    }
    
    return null;
  }
};

// Sanitization functions
export const sanitizers = {
  // Sanitize HTML content
  sanitizeHtml: (html: string): string => {
    // Remove script tags and dangerous attributes
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:/gi, '');
  },

  // Sanitize file name
  sanitizeFileName: (fileName: string): string => {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255);
  },

  // Sanitize text input
  sanitizeText: (text: string): string => {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[<>]/g, '');
  },

  // Sanitize email
  sanitizeEmail: (email: string): string => {
    return email.toLowerCase().trim();
  }
};

// Error handling for validation
export function handleValidationError(error: Joi.ValidationError) {
  const details = error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value,
    type: detail.type
  }));

  return {
    success: false,
    message: 'Validation failed',
    errors: details
  };
}

// Rate limiting validation
export function validateRateLimit(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // This would integrate with Redis in production
    // For now, just pass through
    next();
  };
}

export default {
  validationSchemas,
  validate,
  customValidators,
  sanitizers,
  handleValidationError
};

