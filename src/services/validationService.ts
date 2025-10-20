// src/services/validationService.ts

import { FormSubmission } from './formService';
import { coverageQuestionsService, CoverageQuestion } from './coverageQuestionsService';

export interface ValidationError {
  field: string;
  message: string;
  required: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

class ValidationService {
  /**
   * Validates a form submission to ensure all required fields are filled
   * for proper ACORD form generation
   */
  public validateSubmission(submission: FormSubmission): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate basic business information
    this.validateBusinessInfo(submission, errors, warnings);
    
    // Validate contact information
    this.validateContactInfo(submission, errors, warnings);
    
    // Validate coverage-specific information
    this.validateCoverageInfo(submission, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateBusinessInfo(submission: FormSubmission, errors: ValidationError[], warnings: ValidationError[]): void {
    const { businessInfo } = submission;

    // Required business fields
    if (!businessInfo.name || businessInfo.name.trim() === '') {
      errors.push({
        field: 'businessName',
        message: 'Business name is required for ACORD forms',
        required: true
      });
    }

    if (!businessInfo.federalId || businessInfo.federalId.trim() === '') {
      errors.push({
        field: 'federalId',
        message: 'Federal ID/EIN is required for ACORD forms',
        required: true
      });
    }

    if (!businessInfo.businessType || businessInfo.businessType.trim() === '') {
      errors.push({
        field: 'businessType',
        message: 'Business type is required for ACORD forms',
        required: true
      });
    }

    if (!businessInfo.description || businessInfo.description.trim() === '') {
      errors.push({
        field: 'description',
        message: 'Business description is required for ACORD forms',
        required: true
      });
    }

    // Optional but recommended fields
    if (!businessInfo.website || businessInfo.website.trim() === '') {
      warnings.push({
        field: 'website',
        message: 'Website is recommended for complete business information',
        required: false
      });
    }
  }

  private validateContactInfo(submission: FormSubmission, errors: ValidationError[], warnings: ValidationError[]): void {
    const { contactInfo } = submission;

    // Required contact fields
    if (!contactInfo.contactName || contactInfo.contactName.trim() === '') {
      errors.push({
        field: 'contactName',
        message: 'Contact name is required for ACORD forms',
        required: true
      });
    }

    if (!contactInfo.email || contactInfo.email.trim() === '') {
      errors.push({
        field: 'email',
        message: 'Email address is required for ACORD forms',
        required: true
      });
    }

    if (!contactInfo.phone || contactInfo.phone.trim() === '') {
      errors.push({
        field: 'phone',
        message: 'Phone number is required for ACORD forms',
        required: true
      });
    }

    if (!contactInfo.address || contactInfo.address.trim() === '') {
      errors.push({
        field: 'address',
        message: 'Address is required for ACORD forms',
        required: true
      });
    }

    if (!contactInfo.city || contactInfo.city.trim() === '') {
      errors.push({
        field: 'city',
        message: 'City is required for ACORD forms',
        required: true
      });
    }

    if (!contactInfo.state || contactInfo.state.trim() === '') {
      errors.push({
        field: 'state',
        message: 'State is required for ACORD forms',
        required: true
      });
    }

    if (!contactInfo.zipCode || contactInfo.zipCode.trim() === '') {
      errors.push({
        field: 'zipCode',
        message: 'ZIP code is required for ACORD forms',
        required: true
      });
    }
  }

  private validateCoverageInfo(submission: FormSubmission, errors: ValidationError[], warnings: ValidationError[]): void {
    const { coverageInfo } = submission;

    // Check if coverage types are selected
    if (!coverageInfo.coverageTypes || coverageInfo.coverageTypes.length === 0) {
      errors.push({
        field: 'coverageTypes',
        message: 'At least one coverage type must be selected',
        required: true
      });
      return;
    }

    // Get all questions for selected coverage types
    const allQuestions = coverageQuestionsService.getQuestionsForCoverages(
      coverageInfo.coverageTypes,
      submission.clientType
    );

    // Validate each required question
    allQuestions.forEach(question => {
      if (question.required) {
        const answer = coverageInfo.coverageResponses?.[question.id];
        
        if (!answer || (typeof answer === 'string' && answer.trim() === '') || 
            (Array.isArray(answer) && answer.length === 0)) {
          errors.push({
            field: question.id,
            message: `${question.question} is required for ACORD forms`,
            required: true
          });
        }
      }
    });

    // Check for critical ACORD fields
    this.validateCriticalACORDFields(coverageInfo, errors, warnings);
  }

  private validateCriticalACORDFields(coverageInfo: any, errors: ValidationError[], warnings: ValidationError[]): void {
    const responses = coverageInfo.coverageResponses || {};

    // Critical fields for ACORD 125
    const criticalFields = [
      { id: 'liability-limit', name: 'General Liability Coverage Limit' },
      { id: 'business-operations', name: 'Business Operations Description' },
      { id: 'employee-count', name: 'Employee Count' },
      { id: 'annual-revenue', name: 'Annual Revenue' },
      { id: 'business-location-count', name: 'Business Location Count' },
      { id: 'products-completed-operations', name: 'Products & Completed Operations' },
      { id: 'business-property-value', name: 'Business Property Value' },
      { id: 'property-type', name: 'Property Type' },
      { id: 'inventory-value', name: 'Inventory Value' },
      { id: 'building-description', name: 'Building Description' },
      { id: 'property-address', name: 'Property Address' },
      { id: 'property-county', name: 'Property County' },
      { id: 'hazardous-materials', name: 'Hazardous Materials Handling' },
      { id: 'athletic-teams', name: 'Athletic Team Sponsorship' },
      { id: 'business-classification', name: 'Business Classification' },
      { id: 'sic-code', name: 'SIC Code' },
      { id: 'naics-code', name: 'NAICS Code' }
    ];

    criticalFields.forEach(field => {
      const answer = responses[field.id];
      if (!answer || (typeof answer === 'string' && answer.trim() === '') || 
          (Array.isArray(answer) && answer.length === 0)) {
        errors.push({
          field: field.id,
          message: `${field.name} is required for complete ACORD form generation`,
          required: true
        });
      }
    });

    // Cyber liability specific fields
    if (coverageInfo.coverageTypes?.includes('cyber-liability')) {
      const cyberFields = [
        { id: 'data-stored', name: 'Data Types Stored' },
        { id: 'data-breach-plan', name: 'Data Breach Response Plan' },
        { id: 'cyber-coverage-limit', name: 'Cyber Coverage Limit' },
        { id: 'cyber-security-measures', name: 'Cybersecurity Measures' },
        { id: 'previous-data-breaches', name: 'Previous Data Breaches' }
      ];

      cyberFields.forEach(field => {
        const answer = responses[field.id];
        if (!answer || (typeof answer === 'string' && answer.trim() === '') || 
            (Array.isArray(answer) && answer.length === 0)) {
          errors.push({
            field: field.id,
            message: `${field.name} is required for cyber liability coverage`,
            required: true
          });
        }
      });
    }
  }

  /**
   * Validates email format
   */
  public validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validates phone number format
   */
  public validatePhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    return phoneRegex.test(cleanPhone);
  }

  /**
   * Validates ZIP code format
   */
  public validateZipCode(zipCode: string): boolean {
    const zipRegex = /^\d{5}(-\d{4})?$/;
    return zipRegex.test(zipCode);
  }

  /**
   * Validates Federal ID/EIN format
   */
  public validateFederalId(federalId: string): boolean {
    const einRegex = /^\d{2}-?\d{7}$/;
    return einRegex.test(federalId);
  }
}

export const validationService = new ValidationService();

