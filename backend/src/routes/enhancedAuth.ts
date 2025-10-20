import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { enhancedAuthService } from '@/services/enhancedAuthService';
import { logger } from '@/utils/logger';
import { authMiddleware } from '@/middleware/auth';
import { rateLimitMiddleware } from '@/middleware/rateLimit';

const router = Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('role').optional().isIn(['ADMIN', 'BROKER', 'CUSTOMER'])
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Register new user with Supabase
router.post('/register', rateLimitMiddleware, registerValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, firstName, lastName, role = 'CUSTOMER', agencyId } = req.body;

    const result = await enhancedAuthService.signUpWithSupabase({
      email,
      password,
      firstName,
      lastName,
      role,
      agencyId
    });

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: result.user,
        tokens: result.tokens
      }
    });

  } catch (error: any) {
    logger.error('Registration error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

// Login user (hybrid - Supabase + traditional)
router.post('/login', rateLimitMiddleware, loginValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    const result = await enhancedAuthService.authenticateUser(email, password);

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        tokens: result.tokens
      }
    });

  } catch (error: any) {
    logger.error('Login error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    const tokens = await enhancedAuthService.refreshTokens(refreshToken);

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: { tokens }
    });

  } catch (error: any) {
    logger.error('Token refresh error:', error);
    res.status(error.statusCode || 401).json({
      success: false,
      message: error.message || 'Invalid refresh token'
    });
  }
});

// Logout
router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    await enhancedAuthService.logoutUser(userId);

    logger.info(`User logged out: ${userId}`);

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error: any) {
    logger.error('Logout error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    // Get user from database with agency info
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        status: true,
        avatar: true,
        phone: true,
        timezone: true,
        agencies: {
          select: {
            id: true,
            name: true,
            domain: true,
            logo: true,
            primary_color: true,
            accent_color: true
          }
        },
        created_at: true,
        last_login_at: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error: any) {
    logger.error('Get user error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

// Change password
router.post('/change-password', authMiddleware, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
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
    const { currentPassword, newPassword } = req.body;

    // Update password in Supabase
    await enhancedAuthService.updatePasswordInSupabase(userId, newPassword);

    logger.info(`Password changed for user: ${userId}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error: any) {
    logger.error('Change password error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

// Reset password
router.post('/reset-password', rateLimitMiddleware, [
  body('email').isEmail().normalizeEmail()
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

    const { email } = req.body;

    await enhancedAuthService.resetPasswordWithSupabase(email);

    res.json({
      success: true,
      message: 'Password reset email sent'
    });

  } catch (error: any) {
    logger.error('Reset password error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

// Supabase webhook for user events
router.post('/webhook/supabase', async (req: Request, res: Response) => {
  try {
    const { type, record } = req.body;

    logger.info(`Supabase webhook received: ${type}`);

    switch (type) {
      case 'user.created':
        // Handle user creation from Supabase
        logger.info('User created in Supabase:', record.email);
        break;
      
      case 'user.updated':
        // Handle user updates from Supabase
        logger.info('User updated in Supabase:', record.email);
        break;
      
      case 'user.deleted':
        // Handle user deletion from Supabase
        logger.info('User deleted in Supabase:', record.email);
        break;
      
      default:
        logger.info('Unknown webhook type:', type);
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(500).json({ success: false });
  }
});

export default router;
