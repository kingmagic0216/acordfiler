import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { cacheService } from '@/utils/redis';

const prisma = new PrismaClient();

interface AuthenticatedSocket extends SocketIO.Socket {
  userId?: string;
  userRole?: string;
  agencyId?: string;
}

class NotificationService {
  private io: SocketIOServer;
  private userSockets: Map<string, string> = new Map(); // userId -> socketId

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`Socket connected: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', async (token: string) => {
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
          
          // Get user info
          const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
              id: true,
              role: true,
              agencyId: true,
              status: true
            }
          });

          if (!user || user.status !== 'ACTIVE') {
            socket.emit('auth_error', 'Invalid or inactive user');
            return;
          }

          // Store user info in socket
          socket.userId = user.id;
          socket.userRole = user.role;
          socket.userAgencyId = user.agencyId;

          // Map user to socket
          this.userSockets.set(user.id, socket.id);

          // Join user-specific room
          socket.join(`user:${user.id}`);

          // Join role-specific room
          socket.join(`role:${user.role}`);

          // Join agency room if applicable
          if (user.agencyId) {
            socket.join(`agency:${user.agencyId}`);
          }

          socket.emit('authenticated', {
            userId: user.id,
            role: user.role,
            agencyId: user.agencyId
          });

          logger.info(`User ${user.id} authenticated on socket ${socket.id}`);

          // Send any pending notifications
          await this.sendPendingNotifications(user.id);

        } catch (error) {
          logger.error('Socket authentication failed:', error);
          socket.emit('auth_error', 'Authentication failed');
        }
      });

      // Handle joining submission room
      socket.on('join_submission', (submissionId: string) => {
        if (socket.userId) {
          socket.join(`submission:${submissionId}`);
          logger.info(`User ${socket.userId} joined submission room: ${submissionId}`);
        }
      });

      // Handle leaving submission room
      socket.on('leave_submission', (submissionId: string) => {
        if (socket.userId) {
          socket.leave(`submission:${submissionId}`);
          logger.info(`User ${socket.userId} left submission room: ${submissionId}`);
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        if (socket.userId) {
          this.userSockets.delete(socket.userId);
          logger.info(`User ${socket.userId} disconnected from socket ${socket.id}`);
        }
      });
    });
  }

  // Send notification to specific user
  async sendNotificationToUser(userId: string, notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
    submissionId?: string;
  }): Promise<void> {
    try {
      // Create notification in database
      const dbNotification = await prisma.notification.create({
        data: {
          userId,
          type: notification.type as any,
          title: notification.title,
          message: notification.message,
          data: notification.data || {},
          submissionId: notification.submissionId
        }
      });

      // Send via socket if user is connected
      const socketId = this.userSockets.get(userId);
      if (socketId) {
        this.io.to(socketId).emit('notification', {
          id: dbNotification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          createdAt: dbNotification.createdAt
        });
      }

      // Publish to Redis for other instances
      await cacheService.publish('notifications', {
        userId,
        notification: {
          id: dbNotification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          createdAt: dbNotification.createdAt
        }
      });

      logger.info(`Notification sent to user ${userId}: ${notification.title}`);
    } catch (error) {
      logger.error('Failed to send notification:', error);
    }
  }

  // Send notification to all users with specific role
  async sendNotificationToRole(role: string, notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }): Promise<void> {
    try {
      // Get all users with this role
      const users = await prisma.user.findMany({
        where: { role: role as any, status: 'ACTIVE' },
        select: { id: true }
      });

      // Send to each user
      for (const user of users) {
        await this.sendNotificationToUser(user.id, notification);
      }

      logger.info(`Notification sent to all ${role}s: ${notification.title}`);
    } catch (error) {
      logger.error('Failed to send role notification:', error);
    }
  }

  // Send notification to all users in an agency
  async sendNotificationToAgency(agencyId: string, notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }): Promise<void> {
    try {
      // Get all users in this agency
      const users = await prisma.user.findMany({
        where: { agencyId, status: 'ACTIVE' },
        select: { id: true }
      });

      // Send to each user
      for (const user of users) {
        await this.sendNotificationToUser(user.id, notification);
      }

      logger.info(`Notification sent to agency ${agencyId}: ${notification.title}`);
    } catch (error) {
      logger.error('Failed to send agency notification:', error);
    }
  }

  // Send real-time update for submission
  async sendSubmissionUpdate(submissionId: string, update: {
    type: 'status_change' | 'document_uploaded' | 'form_generated' | 'signed';
    data: any;
  }): Promise<void> {
    try {
      // Send to submission room
      this.io.to(`submission:${submissionId}`).emit('submission_update', {
        submissionId,
        type: update.type,
        data: update.data,
        timestamp: new Date().toISOString()
      });

      // Get submission details for targeted notifications
      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          broker: true,
          agency: true
        }
      });

      if (submission) {
        // Notify broker if assigned
        if (submission.broker) {
          await this.sendNotificationToUser(submission.broker.id, {
            type: 'SUBMISSION_UPDATED',
            title: 'Submission Updated',
            message: `Submission ${submission.submissionId} has been updated`,
            data: update.data,
            submissionId: submission.id
          });
        }

        // Notify agency users
        if (submission.agencyId) {
          await this.sendNotificationToAgency(submission.agencyId, {
            type: 'SUBMISSION_UPDATED',
            title: 'Submission Updated',
            message: `Submission ${submission.submissionId} has been updated`,
            data: update.data
          });
        }
      }

      logger.info(`Submission update sent for ${submissionId}: ${update.type}`);
    } catch (error) {
      logger.error('Failed to send submission update:', error);
    }
  }

  // Send system-wide announcement
  async sendSystemAnnouncement(announcement: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error';
    targetRoles?: string[];
  }): Promise<void> {
    try {
      const notification = {
        type: 'SYSTEM_ALERT',
        title: announcement.title,
        message: announcement.message,
        data: {
          announcementType: announcement.type,
          timestamp: new Date().toISOString()
        }
      };

      if (announcement.targetRoles && announcement.targetRoles.length > 0) {
        // Send to specific roles
        for (const role of announcement.targetRoles) {
          await this.sendNotificationToRole(role, notification);
        }
      } else {
        // Send to all users
        this.io.emit('system_announcement', {
          title: announcement.title,
          message: announcement.message,
          type: announcement.type,
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`System announcement sent: ${announcement.title}`);
    } catch (error) {
      logger.error('Failed to send system announcement:', error);
    }
  }

  // Send pending notifications to user
  private async sendPendingNotifications(userId: string): Promise<void> {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          userId,
          read: false
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      const socketId = this.userSockets.get(userId);
      if (socketId && notifications.length > 0) {
        this.io.to(socketId).emit('pending_notifications', notifications);
      }
    } catch (error) {
      logger.error('Failed to send pending notifications:', error);
    }
  }

  // Get online users count
  getOnlineUsersCount(): number {
    return this.userSockets.size;
  }

  // Get online users by role
  async getOnlineUsersByRole(): Promise<Record<string, number>> {
    const roleCounts: Record<string, number> = {};
    
    for (const [userId, socketId] of this.userSockets) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });
      
      if (user) {
        roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
      }
    }
    
    return roleCounts;
  }
}

// Initialize notification service
export function initializeNotificationService(io: SocketIOServer): NotificationService {
  const notificationService = new NotificationService(io);

  // Subscribe to Redis notifications from other instances
  cacheService.subscribe('notifications', (data: any) => {
    const { userId, notification } = data;
    const socketId = notificationService['userSockets'].get(userId);
    
    if (socketId) {
      io.to(socketId).emit('notification', notification);
    }
  });

  return notificationService;
}

export default NotificationService;
