import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic API endpoints for testing
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Backend API is working!',
    timestamp: new Date().toISOString()
  });
});

// Mock authentication endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }
  
  // Mock successful login
  return res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: '1',
        email: email,
        firstName: 'Test',
        lastName: 'User',
        role: 'CUSTOMER'
      },
      token: 'mock-jwt-token'
    }
  });
});

// Mock submissions endpoint
app.get('/api/submissions', (req, res) => {
  res.json({
    success: true,
    data: {
      submissions: [
        {
          id: '1',
          submissionId: 'SUB-001',
          businessName: 'Test Business',
          status: 'NEW',
          priority: 'MEDIUM',
          submittedAt: new Date().toISOString()
        }
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      }
    }
  });
});

// Mock ACORD form generation
app.post('/api/acord/generate/:submissionId', (req, res) => {
  const { submissionId } = req.params;
  
  res.json({
    success: true,
    message: 'ACORD form generated successfully',
    data: {
      formId: 'form-123',
      submissionId: submissionId,
      formType: 'ACORD 125',
      generatedAt: new Date().toISOString()
    }
  });
});

// Error handling middleware
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
app.listen(parseInt(PORT as string), HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { app };

