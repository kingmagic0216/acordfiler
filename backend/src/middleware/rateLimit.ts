import { Request, Response, NextFunction } from 'express';
import { cacheService } from '@/utils/redis';
import { logger } from '@/utils/logger';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
}

const defaultOptions: RateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  keyGenerator: (req: Request) => req.ip || 'unknown',
  message: 'Too many requests from this IP, please try again later.'
};

export const rateLimitMiddleware = (options: Partial<RateLimitOptions> = {}) => {
  const config = { ...defaultOptions, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = `rate_limit:${config.keyGenerator!(req)}`;
      const current = await cacheService.incrementRateLimit(key, Math.ceil(config.windowMs / 1000));

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, config.maxRequests - current).toString(),
        'X-RateLimit-Reset': new Date(Date.now() + config.windowMs).toISOString()
      });

      if (current > config.maxRequests) {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}, requests: ${current}`);
        
        res.status(429).json({
          success: false,
          message: config.message,
          retryAfter: Math.ceil(config.windowMs / 1000)
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Rate limiting error:', error);
      // If rate limiting fails, allow the request to proceed
      next();
    }
  };
};

// Specific rate limiters for different endpoints
export const authRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later.'
});

export const apiRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 API calls per 15 minutes
  message: 'API rate limit exceeded, please try again later.'
});

export const uploadRateLimit = rateLimitMiddleware({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50, // 50 uploads per hour
  message: 'Upload rate limit exceeded, please try again later.'
});

export const passwordResetRateLimit = rateLimitMiddleware({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 password reset attempts per hour
  message: 'Too many password reset attempts, please try again later.'
});
