import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@acordintake.com';
    this.fromName = process.env.FROM_NAME || 'ACORD Intake Platform';

    // Create transporter
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Verify connection
    this.verifyConnection();
  }

  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
    } catch (error) {
      logger.error('Email service connection failed:', error);
    }
  }

  // Send email
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully: ${result.messageId}`);
      return true;
    } catch (error) {
      logger.error('Email sending failed:', error);
      return false;
    }
  }

  // Send welcome email to new user
  async sendWelcomeEmail(user: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  }): Promise<boolean> {
    const template = this.getWelcomeTemplate(user);
    
    return this.sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  // Send submission confirmation email
  async sendSubmissionConfirmation(submission: {
    submissionId: string;
    businessName: string;
    contactName: string;
    email: string;
    coverageTypes: string[];
  }): Promise<boolean> {
    const template = this.getSubmissionConfirmationTemplate(submission);
    
    return this.sendEmail({
      to: submission.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  // Send submission status update email
  async sendStatusUpdateEmail(submission: {
    submissionId: string;
    businessName: string;
    contactName: string;
    email: string;
    status: string;
    brokerName?: string;
    brokerEmail?: string;
  }): Promise<boolean> {
    const template = this.getStatusUpdateTemplate(submission);
    
    return this.sendEmail({
      to: submission.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  // Send signature request email
  async sendSignatureRequestEmail(signer: {
    email: string;
    name: string;
    documentName: string;
    submissionId: string;
    businessName: string;
    signUrl?: string;
  }): Promise<boolean> {
    const template = this.getSignatureRequestTemplate(signer);
    
    return this.sendEmail({
      to: signer.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  // Send password reset email
  async sendPasswordResetEmail(user: {
    email: string;
    firstName: string;
    resetToken: string;
  }): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${user.resetToken}`;
    const template = this.getPasswordResetTemplate(user, resetUrl);
    
    return this.sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  // Send notification email to broker
  async sendBrokerNotification(broker: {
    email: string;
    firstName: string;
    submissionId: string;
    businessName: string;
    notificationType: string;
  }): Promise<boolean> {
    const template = this.getBrokerNotificationTemplate(broker);
    
    return this.sendEmail({
      to: broker.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  // Template methods
  private getWelcomeTemplate(user: any): EmailTemplate {
    const subject = `Welcome to ACORD Intake Platform, ${user.firstName}!`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to ACORD Intake Platform</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e3a8a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ACORD Intake Platform</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName}!</h2>
            <p>Welcome to ACORD Intake Platform! Your account has been created successfully.</p>
            <p><strong>Account Details:</strong></p>
            <ul>
              <li>Email: ${user.email}</li>
              <li>Role: ${user.role}</li>
            </ul>
            <p>You can now access the platform and start managing insurance applications.</p>
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}" class="button">Access Platform</a>
            </p>
          </div>
          <div class="footer">
            <p>This email was sent from ACORD Intake Platform. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to ACORD Intake Platform, ${user.firstName}!
      
      Your account has been created successfully.
      
      Account Details:
      - Email: ${user.email}
      - Role: ${user.role}
      
      You can now access the platform at: ${process.env.FRONTEND_URL}
      
      This email was sent from ACORD Intake Platform.
    `;

    return { subject, html, text };
  }

  private getSubmissionConfirmationTemplate(submission: any): EmailTemplate {
    const subject = `Submission Confirmation - ${submission.submissionId}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Submission Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e3a8a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Submission Confirmation</h1>
          </div>
          <div class="content">
            <h2>Thank you, ${submission.contactName}!</h2>
            <p>Your insurance application has been submitted successfully.</p>
            <p><strong>Submission Details:</strong></p>
            <ul>
              <li>Submission ID: ${submission.submissionId}</li>
              <li>Business Name: ${submission.businessName}</li>
              <li>Coverage Types: ${submission.coverageTypes.join(', ')}</li>
              <li>Submitted: ${new Date().toLocaleDateString()}</li>
            </ul>
            <p>We will review your application and contact you within 2-3 business days.</p>
          </div>
          <div class="footer">
            <p>This email was sent from ACORD Intake Platform.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Submission Confirmation - ${submission.submissionId}
      
      Thank you, ${submission.contactName}!
      
      Your insurance application has been submitted successfully.
      
      Submission Details:
      - Submission ID: ${submission.submissionId}
      - Business Name: ${submission.businessName}
      - Coverage Types: ${submission.coverageTypes.join(', ')}
      - Submitted: ${new Date().toLocaleDateString()}
      
      We will review your application and contact you within 2-3 business days.
    `;

    return { subject, html, text };
  }

  private getStatusUpdateTemplate(submission: any): EmailTemplate {
    const subject = `Status Update - ${submission.submissionId}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Status Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e3a8a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Status Update</h1>
          </div>
          <div class="content">
            <h2>Hello ${submission.contactName}!</h2>
            <p>Your insurance application status has been updated.</p>
            <p><strong>Submission Details:</strong></p>
            <ul>
              <li>Submission ID: ${submission.submissionId}</li>
              <li>Business Name: ${submission.businessName}</li>
              <li>New Status: ${submission.status}</li>
            </ul>
            ${submission.brokerName ? `
              <p><strong>Your assigned broker:</strong> ${submission.brokerName}</p>
              <p>You can contact them at: ${submission.brokerEmail}</p>
            ` : ''}
          </div>
          <div class="footer">
            <p>This email was sent from ACORD Intake Platform.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Status Update - ${submission.submissionId}
      
      Hello ${submission.contactName}!
      
      Your insurance application status has been updated.
      
      Submission Details:
      - Submission ID: ${submission.submissionId}
      - Business Name: ${submission.businessName}
      - New Status: ${submission.status}
      
      ${submission.brokerName ? `
      Your assigned broker: ${submission.brokerName}
      Contact: ${submission.brokerEmail}
      ` : ''}
    `;

    return { subject, html, text };
  }

  private getSignatureRequestTemplate(signer: any): EmailTemplate {
    const subject = `Signature Required - ${signer.documentName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Signature Required</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e3a8a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Signature Required</h1>
          </div>
          <div class="content">
            <h2>Hello ${signer.name}!</h2>
            <p>You have a document that requires your signature.</p>
            <p><strong>Document Details:</strong></p>
            <ul>
              <li>Document: ${signer.documentName}</li>
              <li>Submission ID: ${signer.submissionId}</li>
              <li>Business: ${signer.businessName}</li>
            </ul>
            ${signer.signUrl ? `
              <p style="text-align: center;">
                <a href="${signer.signUrl}" class="button">Sign Document</a>
              </p>
            ` : ''}
          </div>
          <div class="footer">
            <p>This email was sent from ACORD Intake Platform.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Signature Required - ${signer.documentName}
      
      Hello ${signer.name}!
      
      You have a document that requires your signature.
      
      Document Details:
      - Document: ${signer.documentName}
      - Submission ID: ${signer.submissionId}
      - Business: ${signer.businessName}
      
      ${signer.signUrl ? `Please sign the document at: ${signer.signUrl}` : ''}
    `;

    return { subject, html, text };
  }

  private getPasswordResetTemplate(user: any, resetUrl: string): EmailTemplate {
    const subject = 'Password Reset Request';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e3a8a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName}!</h2>
            <p>You have requested to reset your password for ACORD Intake Platform.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>This link will expire in 24 hours.</p>
            <p>If you did not request this password reset, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>This email was sent from ACORD Intake Platform.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Password Reset Request
      
      Hello ${user.firstName}!
      
      You have requested to reset your password for ACORD Intake Platform.
      
      Please click the following link to reset your password:
      ${resetUrl}
      
      This link will expire in 24 hours.
      
      If you did not request this password reset, please ignore this email.
    `;

    return { subject, html, text };
  }

  private getBrokerNotificationTemplate(broker: any): EmailTemplate {
    const subject = `New ${broker.notificationType} - ${broker.submissionId}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Broker Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e3a8a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Broker Notification</h1>
          </div>
          <div class="content">
            <h2>Hello ${broker.firstName}!</h2>
            <p>You have a new ${broker.notificationType.toLowerCase()} that requires your attention.</p>
            <p><strong>Submission Details:</strong></p>
            <ul>
              <li>Submission ID: ${broker.submissionId}</li>
              <li>Business Name: ${broker.businessName}</li>
            </ul>
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/broker" class="button">View Submission</a>
            </p>
          </div>
          <div class="footer">
            <p>This email was sent from ACORD Intake Platform.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Broker Notification - ${broker.submissionId}
      
      Hello ${broker.firstName}!
      
      You have a new ${broker.notificationType.toLowerCase()} that requires your attention.
      
      Submission Details:
      - Submission ID: ${broker.submissionId}
      - Business Name: ${broker.businessName}
      
      Please log in to the platform to review this submission.
    `;

    return { subject, html, text };
  }
}

export const emailService = new EmailService();
export default emailService;
