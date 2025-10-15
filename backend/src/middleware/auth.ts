import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { cacheService } from '@/utils/redis';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    agencyId?: string;
    sessionId: string;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token required'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required'
      });
      return;
    }

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, jwtSecret) as any;

    // Check if session exists in cache
    const sessionId = `${decoded.userId}-${Date.now()}`;
    const sessionData = await cacheService.getSession(sessionId);

    if (!sessionData) {
      // Check database for active session
      const session = await prisma.userSession.findFirst({
        where: {
          userId: decoded.userId,
          expiresAt: { gt: new Date() }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              status: true,
              agencyId: true
            }
          }
        }
      });

      if (!session || session.user.status !== 'ACTIVE') {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired session'
        });
        return;
      }

      // Cache session data
      await cacheService.setSession(sessionId, {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        agencyId: session.user.agencyId,
        loginTime: session.createdAt.toISOString(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }, 7 * 24 * 60 * 60); // 7 days
    }

    // Add user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      agencyId: decoded.agencyId,
      sessionId
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  }
};

// Role-based authorization middleware
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

// Admin only middleware
export const requireAdmin = requireRole(['ADMIN']);

// Broker or Admin middleware
export const requireBrokerOrAdmin = requireRole(['BROKER', 'ADMIN']);

// Agency access middleware
export const requireAgencyAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  // Admin can access all agencies
  if (req.user.role === 'ADMIN') {
    next();
    return;
  }

  // Check if user belongs to the requested agency
  const requestedAgencyId = req.params.agencyId || req.body.agencyId;
  
  if (requestedAgencyId && req.user.agencyId !== requestedAgencyId) {
    res.status(403).json({
      success: false,
      message: 'Access denied to this agency'
    });
    return;
  }

  next();
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      next();
      return;
    }

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, jwtSecret) as any;

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        agencyId: true
      }
    });

    if (user && user.status === 'ACTIVE') {
      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
        agencyId: user.agencyId,
        sessionId: `${user.id}-${Date.now()}`
      };
    }

    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};

