import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { app } from '../src/server';
import { authService } from '../src/services/authService';

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    submission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    $disconnect: jest.fn()
  }))
}));

// Mock Redis
jest.mock('../src/utils/redis', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    publish: jest.fn(),
    subscribe: jest.fn()
  }
}));

// Mock email service
jest.mock('../src/services/emailService', () => ({
  emailService: {
    sendEmail: jest.fn().mockResolvedValue(true),
    sendWelcomeEmail: jest.fn().mockResolvedValue(true),
    sendSubmissionConfirmation: jest.fn().mockResolvedValue(true)
  }
}));

describe('Authentication API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CUSTOMER'
      };

      const mockUser = {
        id: '1',
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        status: 'ACTIVE',
        createdAt: new Date()
      };

      const mockPrisma = new PrismaClient();
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
    });

    it('should return error for existing email', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const mockPrisma = new PrismaClient();
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1', email: userData.email });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const userData = {
        email: 'invalid-email',
        password: '123',
        firstName: '',
        lastName: ''
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123'
      };

      const mockUser = {
        id: '1',
        email: loginData.email,
        password: '$2a$12$hashedpassword',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        agency: null
      };

      const mockPrisma = new PrismaClient();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.userSession.create.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it('should return error for invalid credentials', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      };

      const mockPrisma = new PrismaClient();
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });
  });
});

describe('Submissions API', () => {
  let authToken: string;

  beforeEach(async () => {
    // Mock authentication
    const mockUser = {
      userId: '1',
      email: 'broker@example.com',
      role: 'BROKER',
      agencyId: 'agency-1'
    };

    authToken = 'mock-jwt-token';
  });

  describe('GET /api/submissions', () => {
    it('should get submissions with pagination', async () => {
      const mockSubmissions = [
        {
          id: '1',
          submissionId: 'SUB-001',
          businessName: 'Test Business',
          status: 'NEW',
          priority: 'HIGH',
          submittedAt: new Date(),
          broker: null,
          agency: { id: 'agency-1', name: 'Test Agency' }
        }
      ];

      const mockPrisma = new PrismaClient();
      mockPrisma.submission.findMany.mockResolvedValue(mockSubmissions);
      mockPrisma.submission.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/submissions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.submissions).toHaveLength(1);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter submissions by status', async () => {
      const mockPrisma = new PrismaClient();
      mockPrisma.submission.findMany.mockResolvedValue([]);
      mockPrisma.submission.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/submissions?status=NEW')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/submissions', () => {
    it('should create a new submission', async () => {
      const submissionData = {
        businessName: 'Test Business',
        federalId: '12-3456789',
        businessType: 'llc',
        yearsInBusiness: 5,
        businessDescription: 'Test business description',
        contactName: 'John Doe',
        email: 'john@testbusiness.com',
        phone: '(555) 123-4567',
        address: '123 Test St',
        city: 'Test City',
        state: 'CA',
        zipCode: '12345',
        coverageTypes: ['General Liability'],
        clientType: 'BUSINESS'
      };

      const mockSubmission = {
        id: '1',
        submissionId: 'SUB-001',
        ...submissionData,
        status: 'NEW',
        priority: 'LOW',
        submittedAt: new Date(),
        agency: { id: 'agency-1', name: 'Test Agency' }
      };

      const mockPrisma = new PrismaClient();
      mockPrisma.submission.findFirst.mockResolvedValue(null);
      mockPrisma.submission.create.mockResolvedValue(mockSubmission);

      const response = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(submissionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.submission.businessName).toBe(submissionData.businessName);
    });
  });
});

describe('Document Upload API', () => {
  let authToken: string;

  beforeEach(() => {
    authToken = 'mock-jwt-token';
  });

  describe('POST /api/documents/:submissionId/upload', () => {
    it('should upload files successfully', async () => {
      const mockSubmission = {
        id: '1',
        submissionId: 'SUB-001',
        agencyId: 'agency-1'
      };

      const mockDocument = {
        id: '1',
        submissionId: '1',
        fileName: 'test.pdf',
        originalName: 'test.pdf',
        filePath: '/uploads/test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        fileHash: 'hash123',
        documentType: 'APPLICATION',
        uploadedBy: '1'
      };

      const mockPrisma = new PrismaClient();
      mockPrisma.submission.findFirst.mockResolvedValue(mockSubmission);
      mockPrisma.document.create.mockResolvedValue(mockDocument);

      // Mock file upload
      const response = await request(app)
        .post('/api/documents/SUB-001/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('files', Buffer.from('test file content'), 'test.pdf')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.documents).toBeDefined();
    });
  });
});

describe('ACORD Forms API', () => {
  let authToken: string;

  beforeEach(() => {
    authToken = 'mock-jwt-token';
  });

  describe('POST /api/acord/generate/:submissionId', () => {
    it('should generate ACORD form PDF', async () => {
      const mockSubmission = {
        id: '1',
        submissionId: 'SUB-001',
        businessName: 'Test Business',
        federalId: '12-3456789',
        businessType: 'llc',
        yearsInBusiness: 5,
        businessDescription: 'Test description',
        contactName: 'John Doe',
        email: 'john@test.com',
        phone: '(555) 123-4567',
        address: '123 Test St',
        city: 'Test City',
        state: 'CA',
        zipCode: '12345',
        coverageTypes: ['General Liability'],
        agency: { name: 'Test Agency' }
      };

      const mockPrisma = new PrismaClient();
      mockPrisma.submission.findFirst.mockResolvedValue(mockSubmission);
      mockPrisma.acordForm.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/acord/generate/SUB-001')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          formType: 'ACORD 125',
          includeWatermark: false
        })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
    });
  });
});

describe('Admin API', () => {
  let authToken: string;

  beforeEach(() => {
    authToken = 'mock-jwt-token';
  });

  describe('GET /api/admin/stats/overview', () => {
    it('should return system statistics', async () => {
      const mockStats = {
        totalUsers: 10,
        totalSubmissions: 25,
        totalDocuments: 50,
        totalAcordForms: 15,
        activeAgencies: 3,
        systemUptime: 3600
      };

      const mockPrisma = new PrismaClient();
      mockPrisma.user.count.mockResolvedValue(mockStats.totalUsers);
      mockPrisma.submission.count.mockResolvedValue(mockStats.totalSubmissions);
      mockPrisma.document.count.mockResolvedValue(mockStats.totalDocuments);
      mockPrisma.acordForm.count.mockResolvedValue(mockStats.totalAcordForms);
      mockPrisma.agency.count.mockResolvedValue(mockStats.activeAgencies);

      const response = await request(app)
        .get('/api/admin/stats/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalUsers).toBe(mockStats.totalUsers);
    });
  });
});

describe('Error Handling', () => {
  it('should handle 404 errors', async () => {
    const response = await request(app)
      .get('/api/nonexistent')
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('not found');
  });

  it('should handle validation errors', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.errors).toBeDefined();
  });
});

describe('Rate Limiting', () => {
  it('should apply rate limiting to auth endpoints', async () => {
    const loginData = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    // Make multiple requests to trigger rate limiting
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/auth/login')
        .send(loginData);
    }

    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(429);

    expect(response.body.message).toContain('Too many requests');
  });
});

// Integration tests
describe('Integration Tests', () => {
  it('should complete full submission workflow', async () => {
    // 1. Register user
    const userData = {
      email: 'integration@test.com',
      password: 'Password123',
      firstName: 'Integration',
      lastName: 'Test',
      role: 'CUSTOMER'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    const token = registerResponse.body.data.token;

    // 2. Create submission
    const submissionData = {
      businessName: 'Integration Test Business',
      federalId: '12-3456789',
      businessType: 'llc',
      yearsInBusiness: 3,
      businessDescription: 'Integration test business',
      contactName: 'Integration Test',
      email: 'integration@test.com',
      phone: '(555) 123-4567',
      address: '123 Integration St',
      city: 'Test City',
      state: 'CA',
      zipCode: '12345',
      coverageTypes: ['General Liability'],
      clientType: 'BUSINESS'
    };

    const submissionResponse = await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${token}`)
      .send(submissionData)
      .expect(201);

    expect(submissionResponse.body.success).toBe(true);
    expect(submissionResponse.body.data.submission.businessName).toBe(submissionData.businessName);
  });
});

// Performance tests
describe('Performance Tests', () => {
  it('should handle concurrent requests', async () => {
    const promises = [];
    
    for (let i = 0; i < 10; i++) {
      promises.push(
        request(app)
          .get('/api/submissions')
          .set('Authorization', 'Bearer mock-token')
      );
    }

    const responses = await Promise.all(promises);
    
    responses.forEach(response => {
      expect(response.status).toBeLessThan(500);
    });
  });

  it('should respond within acceptable time', async () => {
    const startTime = Date.now();
    
    await request(app)
      .get('/api/submissions')
      .set('Authorization', 'Bearer mock-token')
      .expect(200);

    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
  });
});

export default {};
