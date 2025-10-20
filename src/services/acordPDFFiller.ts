// src/services/acordPDFFiller.ts

import { PDFDocument, PDFForm, PDFTextField } from 'pdf-lib';
import { CustomerData } from './acordFormGenerator';

export class ACORDPDFFiller {
  private async loadACORD125Template(): Promise<PDFDocument> {
    // Load the actual ACORD 125 PDF template
    const response = await fetch('/125 Application-Applicant Information Commercial General Liability Section.pdf');
    const pdfBytes = await response.arrayBuffer();
    return await PDFDocument.load(pdfBytes);
  }

  public async fillACORD125(customerData: CustomerData): Promise<Uint8Array> {
    // Load the ACORD 125 template
    const pdfDoc = await this.loadACORD125Template();
    const form = pdfDoc.getForm();

    // Map customer data to ACORD form fields
    this.fillFormFields(form, customerData);

    // Return the filled PDF as bytes
    return await pdfDoc.save();
  }

  private fillFormFields(form: PDFForm, customerData: CustomerData): void {
    try {
      // Producer Information (these are typically pre-filled by the agency)
      this.setFieldValue(form, 'Producer_FullName_A', 'ACORD Insurance Agency');
      this.setFieldValue(form, 'Producer_MailingAddress_LineOne_A', '123 Insurance St');
      this.setFieldValue(form, 'Producer_MailingAddress_CityName_A', 'Insurance City');
      this.setFieldValue(form, 'Producer_MailingAddress_StateOrProvinceCode_A', 'IC');
      this.setFieldValue(form, 'Producer_MailingAddress_PostalCode_A', '12345');
      this.setFieldValue(form, 'Producer_ContactPerson_FullName_A', 'John Producer');
      this.setFieldValue(form, 'Producer_ContactPerson_PhoneNumber_A', '(555) 123-4567');
      this.setFieldValue(form, 'Producer_ContactPerson_EmailAddress_A', 'john@acord.com');

      // Insurer Information
      this.setFieldValue(form, 'Insurer_FullName_A', 'Sample Insurance Company');
      this.setFieldValue(form, 'Insurer_NAICCode_A', '12345');
      this.setFieldValue(form, 'Insurer_ProductDescription_A', 'Commercial General Liability');
      this.setFieldValue(form, 'Insurer_ProductCode_A', 'CGL001');
      this.setFieldValue(form, 'Policy_PolicyNumberIdentifier_A', 'POL-2024-001');

      // Policy Status
      this.setFieldValue(form, 'Policy_Status_QuoteIndicator_A', 'Yes');
      this.setFieldValue(form, 'Policy_Status_EffectiveDate_A', new Date().toLocaleDateString());

      // Business Information - Map customer data to actual ACORD fields
      this.setFieldValue(form, 'NamedInsured_FullName_A', customerData.businessName || '');
      this.setFieldValue(form, 'NamedInsured_MailingAddress_LineOne_A', customerData.address || '');
      this.setFieldValue(form, 'NamedInsured_MailingAddress_CityName_A', customerData.city || '');
      this.setFieldValue(form, 'NamedInsured_MailingAddress_StateOrProvinceCode_A', customerData.state || '');
      this.setFieldValue(form, 'NamedInsured_MailingAddress_PostalCode_A', customerData.zipCode || '');
      this.setFieldValue(form, 'NamedInsured_TaxIdentifier_A', customerData.federalId || '');
      this.setFieldValue(form, 'NamedInsured_Primary_PhoneNumber_A', customerData.phone || '');
      this.setFieldValue(form, 'NamedInsured_Primary_WebsiteAddress_A', customerData.website || '');

      // Contact Information (using business name as contact for now)
      this.setFieldValue(form, 'Producer_ContactPerson_FullName_A', customerData.contactName || '');
      this.setFieldValue(form, 'Producer_ContactPerson_EmailAddress_A', customerData.email || '');
      this.setFieldValue(form, 'Producer_ContactPerson_PhoneNumber_A', customerData.phone || '');

      // Operations Description
      this.setFieldValue(form, 'CommercialPolicy_OperationsDescription_A', customerData.description || '');

      // Coverage Information
      this.setFieldValue(form, 'CommercialPolicy_CoverageTypes_A', customerData.coverageTypes.join(', '));
      this.setFieldValue(form, 'GeneralLiabilityLineOfBusiness_TotalPremiumAmount_A', '$5,000');

      // Form Completion
      this.setFieldValue(form, 'Form_CompletionDate_A', new Date().toLocaleDateString());
      this.setFieldValue(form, 'Form_EditionIdentifier_A', 'ACORD 125 2016-03r2');

      // Additional coverage-specific fields based on customer answers
      if (customerData.coverageAnswers) {
        this.fillCoverageAnswers(form, customerData.coverageAnswers);
      }

    } catch (error) {
      console.error('Error filling form fields:', error);
      // Continue with partial data rather than failing completely
    }
  }

  private fillCoverageAnswers(form: PDFForm, coverageAnswers: Record<string, any>): void {
    // Map coverage question answers to ACORD form fields
    Object.entries(coverageAnswers).forEach(([question, answer]) => {
      // Map specific questions to ACORD fields
      switch (question) {
        case 'liability-limit':
        case 'generalLiabilityLimit':
          this.setFieldValue(form, 'GeneralLiabilityLineOfBusiness_TotalPremiumAmount_A', answer);
          break;
        case 'business-operations':
        case 'businessOperations':
          this.setFieldValue(form, 'CommercialPolicy_OperationsDescription_A', answer);
          break;
        case 'employee-count':
        case 'employeeCount':
          this.setFieldValue(form, 'CommercialPolicy_EmployeeCount_A', answer);
          break;
        case 'annual-revenue':
        case 'annualRevenue':
          this.setFieldValue(form, 'CommercialPolicy_AnnualRevenue_A', answer);
          break;
        case 'business-location-count':
        case 'businessLocationCount':
          this.setFieldValue(form, 'CommercialPolicy_BusinessLocationCount_A', answer);
          break;
        case 'products-completed-operations':
        case 'productsCompletedOperations':
          this.setFieldValue(form, 'CommercialPolicy_ProductsCompletedOperations_A', answer);
          break;
        case 'business-property-value':
        case 'businessPropertyValue':
          this.setFieldValue(form, 'CommercialPolicy_BusinessPropertyValue_A', answer);
          break;
        case 'property-type':
        case 'propertyType':
          this.setFieldValue(form, 'CommercialPolicy_PropertyType_A', answer);
          break;
        case 'inventory-value':
        case 'inventoryValue':
          this.setFieldValue(form, 'CommercialPolicy_InventoryValue_A', answer);
          break;
        case 'building-description':
        case 'buildingDescription':
          this.setFieldValue(form, 'CommercialPolicy_BuildingDescription_A', answer);
          break;
        case 'property-address':
        case 'propertyAddress':
          this.setFieldValue(form, 'CommercialPolicy_PropertyAddress_A', answer);
          break;
        case 'property-county':
        case 'propertyCounty':
          this.setFieldValue(form, 'CommercialPolicy_PropertyCounty_A', answer);
          break;
        case 'hazardous-materials':
        case 'hazardousMaterials':
          this.setFieldValue(form, 'CommercialPolicy_HazardousMaterials_A', answer);
          break;
        case 'athletic-teams':
        case 'athleticTeams':
          this.setFieldValue(form, 'CommercialPolicy_AthleticTeams_A', answer);
          break;
        case 'business-classification':
        case 'businessClassification':
          this.setFieldValue(form, 'CommercialPolicy_BusinessClassification_A', answer);
          break;
        case 'sic-code':
        case 'sicCode':
          this.setFieldValue(form, 'CommercialPolicy_SICCode_A', answer);
          break;
        case 'naics-code':
        case 'naicsCode':
          this.setFieldValue(form, 'CommercialPolicy_NAICSCode_A', answer);
          break;
        case 'data-stored':
        case 'dataStored':
          this.setFieldValue(form, 'CommercialPolicy_DataTypesStored_A', Array.isArray(answer) ? answer.join(', ') : answer);
          break;
        case 'data-breach-plan':
        case 'dataBreachPlan':
          this.setFieldValue(form, 'CommercialPolicy_DataBreachPlan_A', answer);
          break;
        case 'cyber-coverage-limit':
        case 'cyberCoverageLimit':
          this.setFieldValue(form, 'CommercialPolicy_CyberCoverageLimit_A', answer);
          break;
        case 'cyber-security-measures':
        case 'cyberSecurityMeasures':
          this.setFieldValue(form, 'CommercialPolicy_CyberSecurityMeasures_A', Array.isArray(answer) ? answer.join(', ') : answer);
          break;
        case 'previous-data-breaches':
        case 'previousDataBreaches':
          this.setFieldValue(form, 'CommercialPolicy_PreviousBreaches_A', answer);
          break;
      }
    });
  }

  private setFieldValue(form: PDFForm, fieldName: string, value: string): void {
    try {
      const field = form.getField(fieldName);
      if (field && field instanceof PDFTextField) {
        field.setText(value);
      }
    } catch (error) {
      // Field might not exist in this PDF version, skip silently
      console.warn(`Field ${fieldName} not found in PDF form`);
    }
  }

  public async downloadFilledPDF(pdfBytes: Uint8Array, filename: string): Promise<void> {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  public async previewFilledPDF(pdfBytes: Uint8Array): Promise<void> {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const newWindow = window.open(url, '_blank');
    if (newWindow) {
      newWindow.document.title = 'ACORD 125 - Commercial General Liability Application';
    }
  }
}

export const acordPDFFiller = new ACORDPDFFiller();
