import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

export interface PDFGenerationOptions {
  includeWatermark?: boolean;
  watermarkText?: string;
}

export interface COIGenerationOptions {
  holderName: string;
  holderAddress: string;
  holderCity: string;
  holderState: string;
  holderZipCode: string;
  coverageTypes: string[];
  effectiveDate: string;
  expirationDate: string;
}

export async function generateACORDPDF(
  submission: any,
  formType: string,
  options: PDFGenerationOptions = {}
): Promise<Buffer> {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();

    // Load fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Set up colors
    const primaryColor = rgb(0.12, 0.23, 0.54); // Dark blue
    const secondaryColor = rgb(0.23, 0.51, 0.96); // Blue
    const textColor = rgb(0.06, 0.09, 0.16); // Dark gray

    // Header
    page.drawText('ACORD Intake Platform', {
      x: 50,
      y: height - 50,
      size: 16,
      font: boldFont,
      color: primaryColor,
    });

    page.drawText(formType, {
      x: 50,
      y: height - 75,
      size: 14,
      font: boldFont,
      color: secondaryColor,
    });

    page.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: height - 95,
      size: 10,
      font: font,
      color: textColor,
    });

    // Submission ID
    page.drawText(`Submission ID: ${submission.submissionId}`, {
      x: 50,
      y: height - 115,
      size: 12,
      font: boldFont,
      color: textColor,
    });

    // Business Information Section
    let yPosition = height - 150;
    page.drawText('BUSINESS INFORMATION', {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: primaryColor,
    });

    yPosition -= 25;
    page.drawText(`Business Name: ${submission.businessName}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: textColor,
    });

    yPosition -= 20;
    page.drawText(`Federal ID/EIN: ${submission.federalId}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: textColor,
    });

    yPosition -= 20;
    page.drawText(`Business Type: ${submission.businessType}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: textColor,
    });

    yPosition -= 20;
    page.drawText(`Years in Business: ${submission.yearsInBusiness}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: textColor,
    });

    yPosition -= 20;
    page.drawText(`Description: ${submission.businessDescription}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: textColor,
    });

    if (submission.website) {
      yPosition -= 20;
      page.drawText(`Website: ${submission.website}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: font,
        color: textColor,
      });
    }

    // Contact Information Section
    yPosition -= 40;
    page.drawText('CONTACT INFORMATION', {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: primaryColor,
    });

    yPosition -= 25;
    page.drawText(`Contact Name: ${submission.contactName}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: textColor,
    });

    yPosition -= 20;
    page.drawText(`Email: ${submission.email}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: textColor,
    });

    yPosition -= 20;
    page.drawText(`Phone: ${submission.phone}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: textColor,
    });

    yPosition -= 20;
    page.drawText(`Address: ${submission.address}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: textColor,
    });

    yPosition -= 20;
    page.drawText(`${submission.city}, ${submission.state} ${submission.zipCode}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: textColor,
    });

    // Coverage Information Section
    yPosition -= 40;
    page.drawText('COVERAGE INFORMATION', {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: primaryColor,
    });

    yPosition -= 25;
    page.drawText(`Coverage Types: ${submission.coverageTypes.join(', ')}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: textColor,
    });

    // Coverage-specific responses
    if (submission.coverageResponses && Object.keys(submission.coverageResponses).length > 0) {
      yPosition -= 30;
      page.drawText('COVERAGE-SPECIFIC INFORMATION', {
        x: 50,
        y: yPosition,
        size: 11,
        font: boldFont,
        color: secondaryColor,
      });

      yPosition -= 20;
      for (const [key, value] of Object.entries(submission.coverageResponses)) {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
        
        page.drawText(`${label}: ${displayValue}`, {
          x: 50,
          y: yPosition,
          size: 9,
          font: font,
          color: textColor,
        });
        
        yPosition -= 15;
        
        // Check if we need a new page
        if (yPosition < 100) {
          const newPage = pdfDoc.addPage([612, 792]);
          yPosition = newPage.getHeight() - 50;
        }
      }
    }

    // Form-specific information
    yPosition -= 30;
    page.drawText('FORM INFORMATION', {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: primaryColor,
    });

    yPosition -= 25;
    page.drawText(`Form Type: ${formType}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: textColor,
    });

    yPosition -= 20;
    page.drawText(`Application Type: ${getApplicationType(formType)}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: textColor,
    });

    yPosition -= 20;
    page.drawText(`Effective Date: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: textColor,
    });

    // Watermark
    if (options.includeWatermark && options.watermarkText) {
      page.drawText(options.watermarkText, {
        x: width / 2 - 100,
        y: height / 2,
        size: 20,
        font: font,
        color: rgb(0.8, 0.8, 0.8),
        opacity: 0.3,
        rotate: { type: 'radians', angle: Math.PI / 6 }
      });
    }

    // Footer
    page.drawText('This document was generated by ACORD Intake Platform', {
      x: 50,
      y: 30,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);

  } catch (error) {
    logger.error('ACORD PDF generation failed:', error);
    throw error;
  }
}

export async function generateCOI(
  submission: any,
  options: COIGenerationOptions
): Promise<Buffer> {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();

    // Load fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Set up colors
    const primaryColor = rgb(0.12, 0.23, 0.54); // Dark blue
    const secondaryColor = rgb(0.23, 0.51, 0.96); // Blue
    const textColor = rgb(0.06, 0.09, 0.16); // Dark gray

    // Header
    page.drawText('CERTIFICATE OF INSURANCE', {
      x: width / 2 - 120,
      y: height - 50,
      size: 18,
      font: boldFont,
      color: primaryColor,
    });

    page.drawText('ACORD Intake Platform', {
      x: width / 2 - 80,
      y: height - 80,
      size: 12,
      font: font,
      color: secondaryColor,
    });

    // Certificate Holder Information
    let yPosition = height - 130;
    page.drawText('CERTIFICATE HOLDER', {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: primaryColor,
    });

    yPosition -= 25;
    page.drawText(`Name: ${options.holderName}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: textColor,
    });

    yPosition -= 20;
    page.drawText(`Address: ${options.holderAddress}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: textColor,
    });

    yPosition -= 20;
    page.drawText(`${options.holderCity}, ${options.holderState} ${options.holderZipCode}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: textColor,
    });

    // Insured Information
    yPosition -= 40;
    page.drawText('INSURED', {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: primaryColor,
    });

    yPosition -= 25;
    page.drawText(`Business Name: ${submission.businessName}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: textColor,
    });

    yPosition -= 20;
    page.drawText(`Federal ID: ${submission.federalId}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: textColor,
    });

    yPosition -= 20;
    page.drawText(`Address: ${submission.address}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: textColor,
    });

    yPosition -= 20;
    page.drawText(`${submission.city}, ${submission.state} ${submission.zipCode}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: textColor,
    });

    // Coverage Information
    yPosition -= 40;
    page.drawText('COVERAGE INFORMATION', {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: primaryColor,
    });

    yPosition -= 25;
    page.drawText('Coverage Types:', {
      x: 50,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: textColor,
    });

    yPosition -= 20;
    for (const coverageType of options.coverageTypes) {
      page.drawText(`• ${coverageType}`, {
        x: 70,
        y: yPosition,
        size: 10,
        font: font,
        color: textColor,
      });
      yPosition -= 15;
    }

    // Policy Period
    yPosition -= 30;
    page.drawText('POLICY PERIOD', {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: primaryColor,
    });

    yPosition -= 25;
    page.drawText(`Effective Date: ${new Date(options.effectiveDate).toLocaleDateString()}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: textColor,
    });

    yPosition -= 20;
    page.drawText(`Expiration Date: ${new Date(options.expirationDate).toLocaleDateString()}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: textColor,
    });

    // Disclaimer
    yPosition -= 50;
    page.drawText('DISCLAIMER', {
      x: 50,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: textColor,
    });

    yPosition -= 20;
    const disclaimer = 'This certificate is issued as a matter of information only and confers no rights upon the certificate holder. This certificate does not amend, extend or alter the coverage afforded by the policies below.';
    page.drawText(disclaimer, {
      x: 50,
      y: yPosition,
      size: 8,
      font: font,
      color: textColor,
      maxWidth: width - 100,
    });

    // Footer
    page.drawText(`Generated: ${new Date().toLocaleDateString()} | Submission ID: ${submission.submissionId}`, {
      x: 50,
      y: 30,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);

  } catch (error) {
    logger.error('COI generation failed:', error);
    throw error;
  }
}

function getApplicationType(formType: string): string {
  switch (formType) {
    case 'ACORD 125':
      return 'Commercial Insurance';
    case 'ACORD 126':
      return 'General Liability';
    case 'ACORD 127':
      return 'Business Auto';
    case 'ACORD 130':
      return 'Workers Compensation';
    case 'ACORD 140':
      return 'Property';
    default:
      return 'Commercial Insurance';
  }
}

