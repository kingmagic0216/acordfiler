// src/services/pdfGenerator.ts

import { ACORDForm, CustomerData } from './acordFormGenerator';

export interface PDFFormData {
  formType: string;
  formName: string;
  fields: Record<string, string>;
  customerData: CustomerData;
  generatedAt: Date;
}

class PDFGenerator {
  public async generateACORDPDF(form: ACORDForm): Promise<Blob> {
    // Create a simple HTML representation of the ACORD form
    const html = this.generateFormHTML(form);
    
    // Convert HTML to PDF using browser's print functionality
    return this.htmlToPDF(html);
  }

  private generateFormHTML(form: ACORDForm): string {
    const fields = form.fields;

    return `
<!DOCTYPE html>
<html>
<head>
    <title>${form.formName}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.4;
        }
        .form-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .form-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .form-type {
            font-size: 14px;
            color: #666;
        }
        .field-group {
            margin-bottom: 15px;
            border: 1px solid #ddd;
            padding: 10px;
            border-radius: 5px;
        }
        .field-group-title {
            font-weight: bold;
            background-color: #f5f5f5;
            padding: 5px;
            margin: -10px -10px 10px -10px;
            border-radius: 5px 5px 0 0;
        }
        .field-row {
            display: flex;
            margin-bottom: 8px;
            align-items: center;
        }
        .field-label {
            font-weight: bold;
            min-width: 200px;
            margin-right: 10px;
        }
        .field-value {
            flex: 1;
            padding: 5px;
            border: 1px solid #ccc;
            background-color: #f9f9f9;
            border-radius: 3px;
        }
        .required {
            color: red;
        }
        .form-footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
        @media print {
            body { margin: 0; }
            .field-group { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="form-header">
        <div class="form-title">${form.formName}</div>
        <div class="form-type">${form.formType}</div>
    </div>

    <div class="field-group">
        <div class="field-group-title">Producer Information</div>
        ${this.generateFieldRow('Producer Name', fields['Producer_FullName_A'])}
        ${this.generateFieldRow('Producer Address', fields['Producer_MailingAddress_LineOne_A'])}
        ${this.generateFieldRow('Producer City', fields['Producer_MailingAddress_CityName_A'])}
        ${this.generateFieldRow('Producer State', fields['Producer_MailingAddress_StateOrProvinceCode_A'])}
        ${this.generateFieldRow('Producer ZIP', fields['Producer_MailingAddress_PostalCode_A'])}
        ${this.generateFieldRow('Contact Person', fields['Producer_ContactPerson_FullName_A'])}
        ${this.generateFieldRow('Phone', fields['Producer_ContactPerson_PhoneNumber_A'])}
        ${this.generateFieldRow('Email', fields['Producer_ContactPerson_EmailAddress_A'])}
    </div>

    <div class="field-group">
        <div class="field-group-title">Insurer Information</div>
        ${this.generateFieldRow('Insurer Name', fields['Insurer_FullName_A'])}
        ${this.generateFieldRow('NAIC Code', fields['Insurer_NAICCode_A'])}
        ${this.generateFieldRow('Product Description', fields['Insurer_ProductDescription_A'])}
        ${this.generateFieldRow('Product Code', fields['Insurer_ProductCode_A'])}
        ${this.generateFieldRow('Policy Number', fields['Policy_PolicyNumberIdentifier_A'])}
    </div>

    <div class="field-group">
        <div class="field-group-title">Business Information</div>
        ${this.generateFieldRow('Business Name', fields['CommercialPolicy_BusinessName_A'], true)}
        ${this.generateFieldRow('Business Address', fields['CommercialPolicy_BusinessAddress_A'])}
        ${this.generateFieldRow('City', fields['CommercialPolicy_BusinessCity_A'])}
        ${this.generateFieldRow('State', fields['CommercialPolicy_BusinessState_A'])}
        ${this.generateFieldRow('ZIP Code', fields['CommercialPolicy_BusinessZip_A'])}
        ${this.generateFieldRow('Federal Tax ID', fields['CommercialPolicy_FederalTaxId_A'])}
        ${this.generateFieldRow('Business Type', fields['CommercialPolicy_BusinessType_A'])}
        ${this.generateFieldRow('Years in Business', fields['CommercialPolicy_YearsInBusiness_A'])}
        ${this.generateFieldRow('Website', fields['CommercialPolicy_Website_A'])}
    </div>

    <div class="field-group">
        <div class="field-group-title">Contact Information</div>
        ${this.generateFieldRow('Contact Name', fields['CommercialPolicy_ContactName_A'])}
        ${this.generateFieldRow('Contact Email', fields['CommercialPolicy_ContactEmail_A'])}
        ${this.generateFieldRow('Contact Phone', fields['CommercialPolicy_ContactPhone_A'])}
    </div>

    <div class="field-group">
        <div class="field-group-title">Operations Description</div>
        ${this.generateFieldRow('Business Description', fields['CommercialPolicy_OperationsDescription_A'])}
    </div>

    <div class="field-group">
        <div class="field-group-title">Coverage Information</div>
        ${this.generateFieldRow('Coverage Types', fields['CommercialPolicy_CoverageTypes_A'])}
        ${this.generateFieldRow('General Liability Premium', fields['GeneralLiabilityLineOfBusiness_TotalPremiumAmount_A'])}
    </div>

    <div class="field-group">
        <div class="field-group-title">Form Completion</div>
        ${this.generateFieldRow('Completion Date', fields['Form_CompletionDate_A'])}
        ${this.generateFieldRow('Form Edition', fields['Form_EditionIdentifier_A'])}
    </div>

    <div class="form-footer">
        <p>Generated on ${form.generatedAt.toLocaleString()}</p>
        <p>ACORD Intake Platform - Automated Form Generation</p>
    </div>
</body>
</html>`;
  }

  private generateFieldRow(label: string, value: string, required: boolean = false): string {
    if (!value) return '';
    
    return `
    <div class="field-row">
        <div class="field-label">${label}${required ? ' <span class="required">*</span>' : ''}:</div>
        <div class="field-value">${value}</div>
    </div>`;
  }

  private async htmlToPDF(html: string): Promise<Blob> {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open print window');
    }

    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load
    await new Promise(resolve => {
      printWindow.onload = resolve;
    });

    // Trigger print dialog
    printWindow.print();

    // Return a placeholder blob (in a real implementation, you'd use a PDF library)
    return new Blob([html], { type: 'text/html' });
  }

  public async generateAllFormsPDF(forms: ACORDForm[]): Promise<Blob> {
    const combinedHTML = forms.map(form => this.generateFormHTML(form)).join('<div style="page-break-before: always;"></div>');
    return this.htmlToPDF(combinedHTML);
  }

  public downloadPDF(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  public previewForm(form: ACORDForm): void {
    const html = this.generateFormHTML(form);
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(html);
      previewWindow.document.close();
    }
  }
}

export const pdfGenerator = new PDFGenerator();
