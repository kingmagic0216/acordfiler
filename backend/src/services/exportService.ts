import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import ExcelJS from 'exceljs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const prisma = new PrismaClient();

interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  dateRange?: { start: Date; end: Date };
  filters?: any;
  includeDocuments?: boolean;
  includeForms?: boolean;
}

class ExportService {
  // Export submissions to Excel
  async exportSubmissionsToExcel(options: ExportOptions = {}): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Submissions');

      // Get submissions data
      const submissions = await this.getSubmissionsForExport(options);

      // Define columns
      worksheet.columns = [
        { header: 'Submission ID', key: 'submissionId', width: 15 },
        { header: 'Business Name', key: 'businessName', width: 30 },
        { header: 'Federal ID', key: 'federalId', width: 15 },
        { header: 'Business Type', key: 'businessType', width: 20 },
        { header: 'Years in Business', key: 'yearsInBusiness', width: 15 },
        { header: 'Contact Name', key: 'contactName', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 20 },
        { header: 'Address', key: 'address', width: 40 },
        { header: 'City', key: 'city', width: 20 },
        { header: 'State', key: 'state', width: 10 },
        { header: 'ZIP Code', key: 'zipCode', width: 15 },
        { header: 'Coverage Types', key: 'coverageTypes', width: 40 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Priority', key: 'priority', width: 15 },
        { header: 'Submitted At', key: 'submittedAt', width: 20 },
        { header: 'Broker', key: 'brokerName', width: 25 }
      ];

      // Add data rows
      submissions.forEach(submission => {
        worksheet.addRow({
          submissionId: submission.submissionId,
          businessName: submission.businessName,
          federalId: submission.federalId,
          businessType: submission.businessType,
          yearsInBusiness: submission.yearsInBusiness,
          contactName: submission.contactName,
          email: submission.email,
          phone: submission.phone,
          address: submission.address,
          city: submission.city,
          state: submission.state,
          zipCode: submission.zipCode,
          coverageTypes: submission.coverageTypes.join(', '),
          status: submission.status,
          priority: submission.priority,
          submittedAt: submission.submittedAt.toLocaleDateString(),
          brokerName: submission.broker?.firstName + ' ' + submission.broker?.lastName || 'Unassigned'
        });
      });

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1e3a8a' }
      };
      worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        if (column.width) {
          column.width = Math.min(column.width, 50);
        }
      });

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      logger.error('Excel export failed:', error);
      throw error;
    }
  }

  // Export submissions to CSV
  async exportSubmissionsToCSV(options: ExportOptions = {}): Promise<string> {
    try {
      const submissions = await this.getSubmissionsForExport(options);

      // CSV headers
      const headers = [
        'Submission ID',
        'Business Name',
        'Federal ID',
        'Business Type',
        'Years in Business',
        'Contact Name',
        'Email',
        'Phone',
        'Address',
        'City',
        'State',
        'ZIP Code',
        'Coverage Types',
        'Status',
        'Priority',
        'Submitted At',
        'Broker'
      ];

      // CSV rows
      const rows = submissions.map(submission => [
        submission.submissionId,
        submission.businessName,
        submission.federalId,
        submission.businessType,
        submission.yearsInBusiness,
        submission.contactName,
        submission.email,
        submission.phone,
        submission.address,
        submission.city,
        submission.state,
        submission.zipCode,
        submission.coverageTypes.join(', '),
        submission.status,
        submission.priority,
        submission.submittedAt.toLocaleDateString(),
        submission.broker?.firstName + ' ' + submission.broker?.lastName || 'Unassigned'
      ]);

      // Combine headers and rows
      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      return csvContent;
    } catch (error) {
      logger.error('CSV export failed:', error);
      throw error;
    }
  }

  // Export submissions to PDF report
  async exportSubmissionsToPDF(options: ExportOptions = {}): Promise<Buffer> {
    try {
      const submissions = await this.getSubmissionsForExport(options);
      
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]); // Letter size
      const { width, height } = page.getSize();

      // Load fonts
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Colors
      const primaryColor = rgb(0.12, 0.23, 0.54);
      const textColor = rgb(0.06, 0.09, 0.16);

      let yPosition = height - 50;

      // Header
      page.drawText('ACORD Intake Platform - Submissions Report', {
        x: 50,
        y: yPosition,
        size: 18,
        font: boldFont,
        color: primaryColor,
      });

      yPosition -= 30;
      page.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
        x: 50,
        y: yPosition,
        size: 12,
        font: font,
        color: textColor,
      });

      yPosition -= 20;
      page.drawText(`Total Submissions: ${submissions.length}`, {
        x: 50,
        y: yPosition,
        size: 12,
        font: font,
        color: textColor,
      });

      yPosition -= 40;

      // Summary statistics
      const stats = this.calculateSubmissionStats(submissions);
      page.drawText('Summary Statistics', {
        x: 50,
        y: yPosition,
        size: 14,
        font: boldFont,
        color: primaryColor,
      });

      yPosition -= 25;
      page.drawText(`New: ${stats.new} | In Review: ${stats.review} | Completed: ${stats.completed}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: font,
        color: textColor,
      });

      yPosition -= 20;
      page.drawText(`High Priority: ${stats.highPriority} | Medium Priority: ${stats.mediumPriority} | Low Priority: ${stats.lowPriority}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: font,
        color: textColor,
      });

      yPosition -= 40;

      // Submissions list
      page.drawText('Submissions List', {
        x: 50,
        y: yPosition,
        size: 14,
        font: boldFont,
        color: primaryColor,
      });

      yPosition -= 30;

      // Table headers
      const headers = ['ID', 'Business', 'Contact', 'Status', 'Priority', 'Date'];
      const colWidths = [60, 120, 100, 60, 60, 80];
      let xPosition = 50;

      headers.forEach((header, index) => {
        page.drawText(header, {
          x: xPosition,
          y: yPosition,
          size: 10,
          font: boldFont,
          color: primaryColor,
        });
        xPosition += colWidths[index];
      });

      yPosition -= 20;

      // Table rows
      submissions.forEach((submission, index) => {
        // Check if we need a new page
        if (yPosition < 100) {
          const newPage = pdfDoc.addPage([612, 792]);
          yPosition = newPage.getHeight() - 50;
        }

        xPosition = 50;
        const rowData = [
          submission.submissionId,
          submission.businessName.substring(0, 20),
          submission.contactName.substring(0, 20),
          submission.status,
          submission.priority,
          submission.submittedAt.toLocaleDateString()
        ];

        rowData.forEach((data, colIndex) => {
          page.drawText(String(data), {
            x: xPosition,
            y: yPosition,
            size: 9,
            font: font,
            color: textColor,
          });
          xPosition += colWidths[colIndex];
        });

        yPosition -= 15;
      });

      // Footer
      page.drawText('This report was generated by ACORD Intake Platform', {
        x: 50,
        y: 30,
        size: 8,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });

      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      logger.error('PDF export failed:', error);
      throw error;
    }
  }

  // Export users to Excel
  async exportUsersToExcel(options: ExportOptions = {}): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Users');

      const users = await this.getUsersForExport(options);

      worksheet.columns = [
        { header: 'ID', key: 'id', width: 15 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'First Name', key: 'firstName', width: 20 },
        { header: 'Last Name', key: 'lastName', width: 20 },
        { header: 'Role', key: 'role', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Phone', key: 'phone', width: 20 },
        { header: 'Agency', key: 'agencyName', width: 30 },
        { header: 'Created At', key: 'createdAt', width: 20 },
        { header: 'Last Login', key: 'lastLoginAt', width: 20 },
        { header: 'Submissions Count', key: 'submissionsCount', width: 15 }
      ];

      users.forEach(user => {
        worksheet.addRow({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          phone: user.phone || '',
          agencyName: user.agency?.name || '',
          createdAt: user.createdAt.toLocaleDateString(),
          lastLoginAt: user.lastLoginAt?.toLocaleDateString() || 'Never',
          submissionsCount: user._count.submissions
        });
      });

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1e3a8a' }
      };
      worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      logger.error('Users Excel export failed:', error);
      throw error;
    }
  }

  // Export audit logs
  async exportAuditLogsToCSV(options: ExportOptions = {}): Promise<string> {
    try {
      const where: any = {};

      if (options.dateRange) {
        where.createdAt = {
          gte: options.dateRange.start,
          lte: options.dateRange.end
        };
      }

      const auditLogs = await prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const headers = ['Date', 'User', 'Action', 'Resource', 'Resource ID', 'IP Address', 'User Agent'];
      const rows = auditLogs.map(log => [
        log.createdAt.toISOString(),
        log.user ? `${log.user.firstName} ${log.user.lastName} (${log.user.email})` : 'System',
        log.action,
        log.resource,
        log.resourceId || '',
        log.ipAddress || '',
        log.userAgent || ''
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      return csvContent;
    } catch (error) {
      logger.error('Audit logs CSV export failed:', error);
      throw error;
    }
  }

  // Helper methods
  private async getSubmissionsForExport(options: ExportOptions) {
    const where: any = {};

    if (options.dateRange) {
      where.submittedAt = {
        gte: options.dateRange.start,
        lte: options.dateRange.end
      };
    }

    if (options.filters) {
      Object.assign(where, options.filters);
    }

    return prisma.submission.findMany({
      where,
      include: {
        broker: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        agency: {
          select: {
            name: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });
  }

  private async getUsersForExport(options: ExportOptions) {
    const where: any = {};

    if (options.filters) {
      Object.assign(where, options.filters);
    }

    return prisma.user.findMany({
      where,
      include: {
        agency: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            submissions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  private calculateSubmissionStats(submissions: any[]) {
    const stats = {
      new: 0,
      review: 0,
      completed: 0,
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0
    };

    submissions.forEach(submission => {
      switch (submission.status) {
        case 'NEW':
          stats.new++;
          break;
        case 'REVIEW':
          stats.review++;
          break;
        case 'COMPLETED':
          stats.completed++;
          break;
      }

      switch (submission.priority) {
        case 'HIGH':
          stats.highPriority++;
          break;
        case 'MEDIUM':
          stats.mediumPriority++;
          break;
        case 'LOW':
          stats.lowPriority++;
          break;
      }
    });

    return stats;
  }
}

export const exportService = new ExportService();
export default exportService;
