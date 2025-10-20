import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';
import { cacheService } from '@/utils/redis';
import { CustomError } from '@/middleware/errorHandler';

const prisma = new PrismaClient();

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  supabaseAccessToken?: string;
  supabaseRefreshToken?: string;
}

export interface UserPayload {
  userId: string;
  email: string;
  role: string;
  agencyId?: string;
}

export interface SupabaseUser {
  id: string;
  email: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    role?: string;
    agency_id?: string;
  };
}

class EnhancedAuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  private readonly REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
  private readonly REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

  // Traditional password methods (for backward compatibility)
  async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    return bcrypt.hash(password, saltRounds);
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Supabase Auth integration
  async signUpWithSupabase(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
    agencyId?: string;
  }): Promise<{ user: any; tokens: AuthTokens }> {
    try {
      // Check if user already exists in our database
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        throw new CustomError('User with this email already exists', 409);
      }

      // Create user in Supabase Auth
      const { data: supabaseAuthData, error: supabaseError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role || 'CUSTOMER',
          agency_id: userData.agencyId
        },
        email_confirm: true // Auto-confirm email for now
      });

      if (supabaseError) {
        logger.error('Supabase auth error:', supabaseError);
        throw new CustomError('Failed to create user account', 500);
      }

      // Create user in our database
      const user = await prisma.user.create({
        data: {
          id: supabaseAuthData.user.id, // Use Supabase user ID
          email: userData.email,
          password: await this.hashPassword(userData.password), // Keep local password for compatibility
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role || 'CUSTOMER',
          agency_id: userData.agencyId,
          status: 'ACTIVE'
        },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          role: true,
          status: true,
          agency_id: true,
          created_at: true
        }
      });

      // Generate our custom tokens
      const payload: UserPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        agencyId: user.agency_id
      };

      const tokens = {
        accessToken: this.generateAccessToken(payload),
        refreshToken: this.generateRefreshToken(payload),
        supabaseAccessToken: supabaseAuthData.session?.access_token,
        supabaseRefreshToken: supabaseAuthData.session?.refresh_token
      };

      // Store refresh token in cache
      await cacheService.set(
        `refresh_token:${user.id}`,
        tokens.refreshToken,
        30 * 24 * 60 * 60 // 30 days in seconds
      );

      logger.info(`User registered with Supabase: ${user.email}`);

      return { user, tokens };
    } catch (error) {
      logger.error('Supabase registration failed:', error);
      throw error;
    }
  }

  async signInWithSupabase(email: string, password: string): Promise<{ user: any; tokens: AuthTokens }> {
    try {
      // Authenticate with Supabase
      const { data: supabaseAuthData, error: supabaseError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (supabaseError) {
        logger.error('Supabase auth error:', supabaseError);
        throw new CustomError('Invalid credentials', 401);
      }

      // Get user from our database
      const user = await prisma.user.findUnique({
        where: { id: supabaseAuthData.user.id },
        include: {
          agencies: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!user) {
        throw new CustomError('User not found in database', 404);
      }

      if (user.status !== 'ACTIVE') {
        throw new CustomError('Account is not active', 401);
      }

      // Generate our custom tokens
      const payload: UserPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        agencyId: user.agency_id
      };

      const tokens = {
        accessToken: this.generateAccessToken(payload),
        refreshToken: this.generateRefreshToken(payload),
        supabaseAccessToken: supabaseAuthData.session?.access_token,
        supabaseRefreshToken: supabaseAuthData.session?.refresh_token
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
        data: { last_login_at: new Date() }
      });

      // Create user session
      await prisma.userSession.create({
        data: {
          user_id: user.id,
          token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          ip_address: '', // Will be set by the route handler
          user_agent: '' // Will be set by the route handler
        }
      });

      logger.info(`User signed in with Supabase: ${user.email}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          status: user.status,
          agency: user.agencies
        },
        tokens
      };
    } catch (error) {
      logger.error('Supabase sign-in failed:', error);
      throw error;
    }
  }

  async signOutWithSupabase(userId: string): Promise<void> {
    try {
      // Sign out from Supabase
      await supabase.auth.admin.signOut(userId);

      // Remove refresh token from cache
      await cacheService.del(`refresh_token:${userId}`);

      // Invalidate all user sessions
      await prisma.userSession.deleteMany({
        where: { user_id: userId }
      });

      logger.info(`User signed out from Supabase: ${userId}`);
    } catch (error) {
      logger.error('Supabase sign-out failed:', error);
      throw error;
    }
  }

  // Traditional JWT methods (for backward compatibility)
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

  // Hybrid authentication - supports both Supabase and traditional auth
  async authenticateUser(email: string, password: string): Promise<{ user: any; tokens: AuthTokens }> {
    try {
      // First try Supabase authentication
      return await this.signInWithSupabase(email, password);
    } catch (supabaseError) {
      // If Supabase fails, fall back to traditional authentication
      logger.info('Supabase auth failed, trying traditional auth:', supabaseError);
      
      // Find user in our database
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          agencies: {
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
        agencyId: user.agency_id
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
        data: { last_login_at: new Date() }
      });

      // Create user session
      await prisma.userSession.create({
        data: {
          user_id: user.id,
          token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          ip_address: '',
          user_agent: ''
        }
      });

      logger.info(`User authenticated with traditional auth: ${user.email}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          status: user.status,
          agency: user.agencies
        },
        tokens
      };
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
      // Try Supabase logout first
      try {
        await supabase.auth.admin.signOut(userId);
      } catch (error) {
        // Ignore Supabase logout errors for traditional users
        logger.info('Supabase logout failed (user might be traditional):', error);
      }

      // Remove refresh token from cache
      await cacheService.del(`refresh_token:${userId}`);

      // Invalidate all user sessions
      await prisma.userSession.deleteMany({
        where: { user_id: userId }
      });

      logger.info(`User logged out successfully: ${userId}`);
    } catch (error) {
      logger.error('Logout failed:', error);
      throw error;
    }
  }

  // Password reset with Supabase
  async resetPasswordWithSupabase(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/reset-password`
      });

      if (error) {
        logger.error('Supabase password reset error:', error);
        throw new CustomError('Failed to send password reset email', 500);
      }

      logger.info(`Password reset email sent to: ${email}`);
    } catch (error) {
      logger.error('Password reset failed:', error);
      throw error;
    }
  }

  // Update password in Supabase
  async updatePasswordInSupabase(userId: string, newPassword: string): Promise<void> {
    try {
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (error) {
        logger.error('Supabase password update error:', error);
        throw new CustomError('Failed to update password', 500);
      }

      // Also update in our database
      const hashedPassword = await this.hashPassword(newPassword);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      logger.info(`Password updated for user: ${userId}`);
    } catch (error) {
      logger.error('Password update failed:', error);
      throw error;
    }
  }
}

export const enhancedAuthService = new EnhancedAuthService();
