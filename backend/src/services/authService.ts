import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { cacheService } from '@/utils/redis';
import { CustomError } from '@/middleware/errorHandler';

const prisma = new PrismaClient();

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserPayload {
  userId: string;
  email: string;
  role: string;
  agencyId?: string;
}

class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  private readonly REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
  private readonly REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

  async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    return bcrypt.hash(password, saltRounds);
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  generateAccessToken(payload: UserPayload): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'acord-intake-platform',
      audience: 'acord-intake-users'
    });
  }

  generateRefreshToken(payload: UserPayload): string {
    return jwt.sign(payload, this.REFRESH_SECRET, {
      expiresIn: this.REFRESH_EXPIRES_IN,
      issuer: 'acord-intake-platform',
      audience: 'acord-intake-users'
    });
  }

  verifyAccessToken(token: string): UserPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET, {
        issuer: 'acord-intake-platform',
        audience: 'acord-intake-users'
      }) as UserPayload;
    } catch (error) {
      throw new CustomError('Invalid or expired token', 401);
    }
  }

  verifyRefreshToken(token: string): UserPayload {
    try {
      return jwt.verify(token, this.REFRESH_SECRET, {
        issuer: 'acord-intake-platform',
        audience: 'acord-intake-users'
      }) as UserPayload;
    } catch (error) {
      throw new CustomError('Invalid or expired refresh token', 401);
    }
  }

  async registerUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
    agencyId?: string;
  }): Promise<{ user: any; tokens: AuthTokens }> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        throw new CustomError('User with this email already exists', 409);
      }

      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role || 'CUSTOMER',
          agencyId: userData.agencyId,
          status: 'ACTIVE'
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          agencyId: true,
          createdAt: true
        }
      });

      // Generate tokens
      const payload: UserPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        agencyId: user.agencyId
      };

      const tokens = {
        accessToken: this.generateAccessToken(payload),
        refreshToken: this.generateRefreshToken(payload)
      };

      // Store refresh token in cache
      await cacheService.set(
        `refresh_token:${user.id}`,
        tokens.refreshToken,
        30 * 24 * 60 * 60 // 30 days in seconds
      );

      logger.info(`User registered successfully: ${user.email}`);

      return { user, tokens };
    } catch (error) {
      logger.error('Registration failed:', error);
      throw error;
    }
  }

  async loginUser(email: string, password: string): Promise<{ user: any; tokens: AuthTokens }> {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          agency: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!user) {
        throw new CustomError('Invalid credentials', 401);
      }

      // Check if user is active
      if (user.status !== 'ACTIVE') {
        throw new CustomError('Account is not active', 401);
      }

      // Verify password
      const isPasswordValid = await this.comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw new CustomError('Invalid credentials', 401);
      }

      // Generate tokens
      const payload: UserPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        agencyId: user.agencyId
      };

      const tokens = {
        accessToken: this.generateAccessToken(payload),
        refreshToken: this.generateRefreshToken(payload)
      };

      // Store refresh token in cache
      await cacheService.set(
        `refresh_token:${user.id}`,
        tokens.refreshToken,
        30 * 24 * 60 * 60 // 30 days in seconds
      );

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Create user session
      await prisma.userSession.create({
        data: {
          userId: user.id,
          token: tokens.accessToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      logger.info(`User logged in successfully: ${user.email}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          agency: user.agency
        },
        tokens
      };
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const payload = this.verifyRefreshToken(refreshToken);

      // Check if refresh token exists in cache
      const cachedToken = await cacheService.get(`refresh_token:${payload.userId}`);
      if (!cachedToken || cachedToken !== refreshToken) {
        throw new CustomError('Invalid refresh token', 401);
      }

      // Generate new tokens
      const newTokens = {
        accessToken: this.generateAccessToken(payload),
        refreshToken: this.generateRefreshToken(payload)
      };

      // Update refresh token in cache
      await cacheService.set(
        `refresh_token:${payload.userId}`,
        newTokens.refreshToken,
        30 * 24 * 60 * 60 // 30 days in seconds
      );

      return newTokens;
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  async logoutUser(userId: string): Promise<void> {
    try {
      // Remove refresh token from cache
      await cacheService.del(`refresh_token:${userId}`);

      // Invalidate all user sessions
      await prisma.userSession.deleteMany({
        where: { userId }
      });

      logger.info(`User logged out successfully: ${userId}`);
    } catch (error) {
      logger.error('Logout failed:', error);
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new CustomError('User not found', 404);
      }

      // Verify current password
      const isCurrentPasswordValid = await this.comparePassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new CustomError('Current password is incorrect', 400);
      }

      // Hash new password
      const hashedNewPassword = await this.hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword }
      });

      // Invalidate all sessions
      await this.logoutUser(userId);

      logger.info(`Password changed successfully for user: ${userId}`);
    } catch (error) {
      logger.error('Password change failed:', error);
      throw error;
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        // Don't reveal if user exists or not
        return;
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user.id, email: user.email },
        this.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Store reset token in cache
      await cacheService.set(
        `password_reset:${user.id}`,
        resetToken,
        3600 // 1 hour in seconds
      );

      // TODO: Send reset email
      logger.info(`Password reset token generated for user: ${email}`);
    } catch (error) {
      logger.error('Password reset failed:', error);
      throw error;
    }
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    try {
      // Verify reset token
      const payload = jwt.verify(token, this.JWT_SECRET) as { userId: string; email: string };

      // Check if reset token exists in cache
      const cachedToken = await cacheService.get(`password_reset:${payload.userId}`);
      if (!cachedToken || cachedToken !== token) {
        throw new CustomError('Invalid or expired reset token', 400);
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: payload.userId },
        data: { password: hashedPassword }
      });

      // Remove reset token from cache
      await cacheService.del(`password_reset:${payload.userId}`);

      // Invalidate all sessions
      await this.logoutUser(payload.userId);

      logger.info(`Password reset completed for user: ${payload.email}`);
    } catch (error) {
      logger.error('Password reset confirmation failed:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();

