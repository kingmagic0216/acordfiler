import { Request, Response } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ACORD Intake Platform API',
      version: '1.0.0',
      description: 'A comprehensive API for managing insurance application processes, ACORD form generation, and document management.',
      contact: {
        name: 'ACORD Intake Platform Support',
        email: 'support@acordintake.com',
        url: 'https://acordintake.com/support'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'https://api.acordintake.com',
        description: 'Production server'
      },
      {
        url: 'https://staging-api.acordintake.com',
        description: 'Staging server'
      },
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['id', 'email', 'firstName', 'lastName', 'role'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique user identifier'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            firstName: {
              type: 'string',
              description: 'User first name'
            },
            lastName: {
              type: 'string',
              description: 'User last name'
            },
            role: {
              type: 'string',
              enum: ['ADMIN', 'BROKER', 'CUSTOMER'],
              description: 'User role'
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'],
              description: 'User status'
            },
            phone: {
              type: 'string',
              description: 'User phone number'
            },
            avatar: {
              type: 'string',
              format: 'uri',
              description: 'User avatar URL'
            },
            agencyId: {
              type: 'string',
              format: 'uuid',
              description: 'Associated agency ID'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp'
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last login timestamp'
            }
          }
        },
        Submission: {
          type: 'object',
          required: ['id', 'submissionId', 'businessName', 'status', 'priority'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique submission identifier'
            },
            submissionId: {
              type: 'string',
              description: 'Human-readable submission ID'
            },
            businessName: {
              type: 'string',
              description: 'Business name'
            },
            federalId: {
              type: 'string',
              description: 'Federal ID/EIN'
            },
            businessType: {
              type: 'string',
              enum: ['sole-proprietorship', 'partnership', 'llc', 'corporation', 'non-profit'],
              description: 'Business type'
            },
            yearsInBusiness: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              description: 'Years in business'
            },
            businessDescription: {
              type: 'string',
              description: 'Business description'
            },
            website: {
              type: 'string',
              format: 'uri',
              description: 'Business website'
            },
            contactName: {
              type: 'string',
              description: 'Primary contact name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Contact email'
            },
            phone: {
              type: 'string',
              description: 'Contact phone number'
            },
            address: {
              type: 'string',
              description: 'Business address'
            },
            city: {
              type: 'string',
              description: 'City'
            },
            state: {
              type: 'string',
              description: 'State abbreviation'
            },
            zipCode: {
              type: 'string',
              description: 'ZIP code'
            },
            coverageTypes: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Selected coverage types'
            },
            coverageResponses: {
              type: 'object',
              description: 'Coverage-specific responses'
            },
            clientType: {
              type: 'string',
              enum: ['PERSONAL', 'BUSINESS', 'BOTH'],
              description: 'Client type'
            },
            status: {
              type: 'string',
              enum: ['NEW', 'REVIEW', 'SIGNATURE', 'COMPLETED', 'REJECTED', 'CANCELLED'],
              description: 'Submission status'
            },
            priority: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
              description: 'Submission priority'
            },
            brokerId: {
              type: 'string',
              format: 'uuid',
              description: 'Assigned broker ID'
            },
            agencyId: {
              type: 'string',
              format: 'uuid',
              description: 'Associated agency ID'
            },
            submittedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Submission timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        Document: {
          type: 'object',
          required: ['id', 'fileName', 'filePath', 'fileSize', 'mimeType'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique document identifier'
            },
            submissionId: {
              type: 'string',
              format: 'uuid',
              description: 'Associated submission ID'
            },
            fileName: {
              type: 'string',
              description: 'Stored file name'
            },
            originalName: {
              type: 'string',
              description: 'Original file name'
            },
            filePath: {
              type: 'string',
              description: 'File storage path'
            },
            fileSize: {
              type: 'integer',
              description: 'File size in bytes'
            },
            mimeType: {
              type: 'string',
              description: 'File MIME type'
            },
            fileHash: {
              type: 'string',
              description: 'File hash for integrity'
            },
            documentType: {
              type: 'string',
              enum: ['APPLICATION', 'CERTIFICATE', 'POLICY', 'ENDORSEMENT', 'OTHER'],
              description: 'Document type'
            },
            uploadedBy: {
              type: 'string',
              format: 'uuid',
              description: 'User who uploaded the document'
            },
            uploadedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Upload timestamp'
            }
          }
        },
        ACORDForm: {
          type: 'object',
          required: ['id', 'submissionId', 'formType', 'status'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique ACORD form identifier'
            },
            submissionId: {
              type: 'string',
              format: 'uuid',
              description: 'Associated submission ID'
            },
            formType: {
              type: 'string',
              enum: ['ACORD 125', 'ACORD 126', 'ACORD 127', 'ACORD 130', 'ACORD 140'],
              description: 'ACORD form type'
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'GENERATED', 'SIGNED', 'ARCHIVED'],
              description: 'Form status'
            },
            filePath: {
              type: 'string',
              description: 'Generated PDF file path'
            },
            generatedBy: {
              type: 'string',
              format: 'uuid',
              description: 'User who generated the form'
            },
            generatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Generation timestamp'
            },
            signedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Signature timestamp'
            }
          }
        },
        FieldMapping: {
          type: 'object',
          required: ['id', 'acordForm', 'fieldName', 'intakeField', 'fieldType'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique field mapping identifier'
            },
            acordForm: {
              type: 'string',
              description: 'ACORD form name'
            },
            fieldName: {
              type: 'string',
              description: 'ACORD field name'
            },
            intakeField: {
              type: 'string',
              description: 'Intake form field path'
            },
            fieldType: {
              type: 'string',
              enum: ['TEXT', 'TEXTAREA', 'NUMBER', 'SELECT', 'CHECKBOX', 'DATE', 'EMAIL', 'PHONE'],
              description: 'Field data type'
            },
            required: {
              type: 'boolean',
              description: 'Whether field is required'
            },
            agencyId: {
              type: 'string',
              format: 'uuid',
              description: 'Associated agency ID'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        Error: {
          type: 'object',
          required: ['success', 'message'],
          properties: {
            success: {
              type: 'boolean',
              example: false,
              description: 'Request success status'
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Field name with error'
                  },
                  message: {
                    type: 'string',
                    description: 'Field-specific error message'
                  }
                }
              },
              description: 'Validation errors'
            },
            stack: {
              type: 'string',
              description: 'Error stack trace (development only)'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              description: 'Current page number'
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              description: 'Items per page'
            },
            total: {
              type: 'integer',
              minimum: 0,
              description: 'Total number of items'
            },
            totalPages: {
              type: 'integer',
              minimum: 0,
              description: 'Total number of pages'
            },
            hasNextPage: {
              type: 'boolean',
              description: 'Whether there is a next page'
            },
            hasPrevPage: {
              type: 'boolean',
              description: 'Whether there is a previous page'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication information is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Authentication required'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Access denied',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Access denied'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Resource not found'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Validation failed',
                errors: [
                  {
                    field: 'email',
                    message: 'Invalid email format'
                  }
                ]
              }
            }
          }
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Too many requests'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and session management'
      },
      {
        name: 'Users',
        description: 'User management operations'
      },
      {
        name: 'Submissions',
        description: 'Insurance application submissions'
      },
      {
        name: 'Documents',
        description: 'Document upload and management'
      },
      {
        name: 'ACORD Forms',
        description: 'ACORD form generation and management'
      },
      {
        name: 'Field Mapping',
        description: 'Field mapping configuration'
      },
      {
        name: 'Admin',
        description: 'Administrative operations'
      },
      {
        name: 'Notifications',
        description: 'Notification management'
      },
      {
        name: 'E-signature',
        description: 'Electronic signature operations'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/routes/**/*.ts'
  ]
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: any) => {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'ACORD Intake Platform API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true
    }
  }));

  // JSON endpoint
  app.get('/api-docs.json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    });
  });
};

export default specs;