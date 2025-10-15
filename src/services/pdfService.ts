// PDF generation service for ACORD forms
import { FormSubmission } from './formService';
import { acordFormGenerator, CustomerData } from './acordFormGenerator';
import { pdfGenerator } from './pdfGenerator';

export interface PDFGenerationOptions {
  filename?: string;
  includeWatermark?: boolean;
  watermarkText?: string;
}

class PDFService {
  // Generate PDF for ACORD form using proper ACORD form generation
  async generateACORDPDF(
    submission: FormSubmission,
    formType: string,
    options: PDFGenerationOptions = {}
  ): Promise<Blob> {
    // Convert FormSubmission to CustomerData format
    const customerData: CustomerData = this.convertSubmissionToCustomerData(submission);
    
    // Generate ACORD forms using the proper generator
    const acordForms = acordFormGenerator.generateACORDForms(customerData);
    
    // Find the specific form type requested
    const requestedForm = acordForms.find(form => form.formType === formType);
    
    if (!requestedForm) {
      throw new Error(`ACORD form ${formType} not found for this submission`);
    }
    
    // Generate PDF using the proper PDF generator
    return await pdfGenerator.generateACORDPDF(requestedForm);
  }

  // Convert FormSubmission to CustomerData format
  private convertSubmissionToCustomerData(submission: FormSubmission): CustomerData {
    const { businessInfo, contactInfo, coverageInfo } = submission;
    
    // Parse contact name into first and last name
    const nameParts = contactInfo.contactName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    return {
      // Personal Information
      firstName,
      lastName,
      
      // Business Information
      businessName: businessInfo.name,
      federalId: businessInfo.federalId,
      businessType: businessInfo.businessType,
      yearsInBusiness: businessInfo.yearsInBusiness.toString(),
      description: businessInfo.description,
      website: businessInfo.website,
      
      // Contact Information
      contactName: contactInfo.contactName,
      email: contactInfo.email,
      phone: contactInfo.phone,
      address: contactInfo.address,
      city: contactInfo.city,
      state: contactInfo.state,
      zip: contactInfo.zipCode,
      zipCode: contactInfo.zipCode,
      
      // Coverage Information
      coverageTypes: coverageInfo.coverageTypes,
      coverageAnswers: coverageInfo.coverageResponses || {}
    };
  }


  // Download PDF file
  async downloadPDF(blob: Blob, filename: string): Promise<void> {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Generate COI (Certificate of Insurance)
  async generateCOI(
    submission: FormSubmission,
    options: PDFGenerationOptions = {}
  ): Promise<Blob> {
    // Convert FormSubmission to CustomerData format
    const customerData: CustomerData = this.convertSubmissionToCustomerData(submission);
    
    // Generate ACORD forms using the proper generator
    const acordForms = acordFormGenerator.generateACORDForms(customerData);
    
    // Find ACORD 24 (Certificate of Property Insurance) or create a generic COI
    const coiForm = acordForms.find(form => form.formType === 'ACORD 24');
    
    if (coiForm) {
      return await pdfGenerator.generateACORDPDF(coiForm);
    } else {
      // Fallback to generic COI if ACORD 24 not available
      return this.createGenericCOI(submission);
    }
  }

  // Create generic COI content (fallback)
  private async createGenericCOI(submission: FormSubmission): Promise<Blob> {
    const { businessInfo, contactInfo, coverageInfo } = submission;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Certificate of Insurance - ${submission.id}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .form-title { font-size: 18px; font-weight: bold; }
        .section { margin: 20px 0; }
        .section-title { font-weight: bold; background-color: #f0f0f0; padding: 5px; }
        .field { margin: 5px 0; }
        .label { font-weight: bold; display: inline-block; width: 150px; }
        .value { display: inline-block; }
    </style>
</head>
<body>
    <div class="header">
        <div class="form-title">CERTIFICATE OF INSURANCE</div>
        <div>Certificate ID: ${submission.id}</div>
        <div>Issued: ${new Date().toLocaleDateString()}</div>
    </div>

    <div class="section">
        <div class="section-title">Insured Information</div>
        <div class="field">
            <span class="label">Insured Name:</span>
            <span class="value">${businessInfo.name}</span>
        </div>
        <div class="field">
            <span class="label">Federal ID:</span>
            <span class="value">${businessInfo.federalId}</span>
        </div>
        <div class="field">
            <span class="label">Address:</span>
            <span class="value">${contactInfo.address}, ${contactInfo.city}, ${contactInfo.state} ${contactInfo.zipCode}</span>
        </div>
        <div class="field">
            <span class="label">Contact:</span>
            <span class="value">${contactInfo.contactName}</span>
        </div>
        <div class="field">
            <span class="label">Email:</span>
            <span class="value">${contactInfo.email}</span>
        </div>
        <div class="field">
            <span class="label">Phone:</span>
            <span class="value">${contactInfo.phone}</span>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Coverage Requested</div>
        <div class="field">
            <span class="label">Coverage Types:</span>
            <span class="value">${coverageInfo.coverageTypes.join(', ')}</span>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Certificate Details</div>
        <div class="field">
            <span class="label">Status:</span>
            <span class="value">${submission.status.toUpperCase()}</span>
        </div>
        <div class="field">
            <span class="label">Priority:</span>
            <span class="value">${submission.priority.toUpperCase()}</span>
        </div>
        <div class="field">
            <span class="label">Submitted:</span>
            <span class="value">${submission.submittedAt.toLocaleDateString()}</span>
        </div>
    </div>
</body>
</html>`;
    
    return new Blob([html], { type: 'text/html' });
  }
}

export const pdfService = new PDFService();
