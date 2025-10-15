import { Express } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { logger } from './logger';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ACORD Intake Platform API',
      version: '1.0.0',
      description: 'A comprehensive API for managing insurance application processes with ACORD form automation',
      contact: {
        name: 'ACORD Intake Platform Team',
        email: 'support@acordintake.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.acordintake.com' 
          : `http://localhost:${process.env.PORT || 3001}`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { 
              type: 'string', 
              enum: ['ADMIN', 'BROKER', 'CUSTOMER'] 
            },
            status: { 
              type: 'string', 
              enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'] 
            },
            createdAt: { type: 'string', format: 'date-time' },
            lastLoginAt: { type: 'string', format: 'date-time' }
          }
        },
        Submission: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            submissionId: { type: 'string' },
            businessName: { type: 'string' },
            federalId: { type: 'string' },
            businessType: { type: 'string' },
            yearsInBusiness: { type: 'integer' },
            businessDescription: { type: 'string' },
            contactName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            zipCode: { type: 'string' },
            coverageTypes: { 
              type: 'array', 
              items: { type: 'string' } 
            },
            status: { 
              type: 'string', 
              enum: ['NEW', 'REVIEW', 'SIGNATURE', 'COMPLETED', 'REJECTED', 'CANCELLED'] 
            },
            priority: { 
              type: 'string', 
              enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] 
            },
            submittedAt: { type: 'string', format: 'date-time' }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
            errors: { type: 'array', items: { type: 'string' } }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            details: { type: 'object' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts'
  ]
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  try {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'ACORD Intake Platform API Documentation'
    }));

    // JSON endpoint for the OpenAPI spec
    app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(specs);
    });

    logger.info('Swagger documentation setup complete');
  } catch (error) {
    logger.error('Failed to setup Swagger documentation:', error);
  }
}
