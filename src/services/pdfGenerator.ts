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
    const fields = form.fields.reduce((acc, field) => {
      acc[field.fieldName] = String(field.value);
      return acc;
    }, {} as Record<string, string>);

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
        <div class="field-group-title">Applicant Information</div>
        ${this.generateFieldRow('Applicant Name', fields.applicant_name || fields.business_name, true)}
        ${this.generateFieldRow('Address', fields.applicant_address || fields.business_address)}
        ${this.generateFieldRow('City', fields.applicant_city || fields.business_city)}
        ${this.generateFieldRow('State', fields.applicant_state || fields.business_state)}
        ${this.generateFieldRow('ZIP Code', fields.applicant_zip || fields.business_zip)}
        ${this.generateFieldRow('Phone', fields.contact_phone || fields.applicant_phone)}
        ${this.generateFieldRow('Email', fields.contact_email || fields.applicant_email)}
    </div>

    ${this.generateCoverageSection(form)}
    ${this.generateVehicleSection(form)}
    ${this.generateBusinessSection(form)}
    ${this.generatePropertySection(form)}

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

  private generateCoverageSection(form: ACORDForm): string {
    const coverageFields = form.fields.filter(field => 
      field.fieldName.includes('liability') || 
      field.fieldName.includes('coverage') ||
      field.fieldName.includes('limit')
    );

    if (coverageFields.length === 0) return '';

    return `
    <div class="field-group">
        <div class="field-group-title">Coverage Information</div>
        ${coverageFields.map(field => 
          this.generateFieldRow(
            this.formatFieldLabel(field.fieldName), 
            String(field.value), 
            field.required
          )
        ).join('')}
    </div>`;
  }

  private generateVehicleSection(form: ACORDForm): string {
    const vehicleFields = form.fields.filter(field => 
      field.fieldName.includes('vehicle') || 
      field.fieldName.includes('driver') ||
      field.fieldName.includes('miles') ||
      field.fieldName.includes('vin')
    );

    if (vehicleFields.length === 0) return '';

    return `
    <div class="field-group">
        <div class="field-group-title">Vehicle Information</div>
        ${vehicleFields.map(field => 
          this.generateFieldRow(
            this.formatFieldLabel(field.fieldName), 
            String(field.value), 
            field.required
          )
        ).join('')}
    </div>`;
  }

  private generateBusinessSection(form: ACORDForm): string {
    const businessFields = form.fields.filter(field => 
      field.fieldName.includes('business') || 
      field.fieldName.includes('employee') ||
      field.fieldName.includes('revenue') ||
      field.fieldName.includes('operations') ||
      field.fieldName.includes('classification')
    );

    if (businessFields.length === 0) return '';

    return `
    <div class="field-group">
        <div class="field-group-title">Business Information</div>
        ${businessFields.map(field => 
          this.generateFieldRow(
            this.formatFieldLabel(field.fieldName), 
            String(field.value), 
            field.required
          )
        ).join('')}
    </div>`;
  }

  private generatePropertySection(form: ACORDForm): string {
    const propertyFields = form.fields.filter(field => 
      field.fieldName.includes('property') || 
      field.fieldName.includes('building') ||
      field.fieldName.includes('inventory') ||
      field.fieldName.includes('hazardous')
    );

    if (propertyFields.length === 0) return '';

    return `
    <div class="field-group">
        <div class="field-group-title">Property Information</div>
        ${propertyFields.map(field => 
          this.generateFieldRow(
            this.formatFieldLabel(field.fieldName), 
            String(field.value), 
            field.required
          )
        ).join('')}
    </div>`;
  }

  private formatFieldLabel(fieldName: string): string {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace('Applicant ', '')
      .replace('Business ', '')
      .replace('Contact ', '')
      .replace('Vehicle ', '');
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
