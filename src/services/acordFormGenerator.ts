// src/services/acordFormGenerator.ts

export interface CustomerData {
  // Personal Information
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  ssn?: string;
  occupation?: string;
  employer?: string;
  
  // Business Information
  businessName?: string;
  federalId?: string;
  businessType?: string;
  yearsInBusiness?: string;
  description?: string;
  website?: string;
  
  // Contact Information
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  zipCode?: string;
  
  // Coverage Information
  coverageTypes: string[];
  insuranceType?: 'personal' | 'business' | 'both';
  clientType?: 'personal' | 'business' | 'both';
  
  // Coverage Answers
  coverageAnswers: Record<string, any>;
}

export interface ACORDField {
  fieldName: string;
  value: string | number | boolean;
  required: boolean;
  description?: string;
}

export interface ACORDForm {
  formType: string;
  formName: string;
  fields: Record<string, string>;
  generatedAt: Date;
  customerData: CustomerData;
}

class ACORDFormGenerator {
  private fieldMappings: Record<string, Record<string, string>> = {
    // ACORD 125 - Commercial General Liability Application
    'ACORD 125': {
      // Applicant Information
      'applicant_name': 'businessName',
      'applicant_address': 'address',
      'applicant_city': 'city',
      'applicant_state': 'state',
      'applicant_zip': 'zip',
      'applicant_phone': 'phone',
      'applicant_email': 'email',
      'business_type': 'businessType',
      'years_in_business': 'yearsInBusiness',
      'business_description': 'description',
      'website': 'website',
      
      // Coverage Information
      'general_liability_limit': 'coverageAnswers.general_liability_limit',
      'business_operations': 'coverageAnswers.business_operations',
      'business_classification': 'coverageAnswers.business_classification',
      'employee_count': 'coverageAnswers.employee_count',
      'annual_revenue': 'coverageAnswers.annual_revenue',
      'business_location_count': 'coverageAnswers.business_location_count',
      'products_completed_operations': 'coverageAnswers.products_completed_operations',
      
      // Contact Information
      'contact_name': 'contactName',
      'contact_phone': 'phone',
      'contact_email': 'email'
    },
    
    // ACORD 126 - Commercial General Liability Section
    'ACORD 126': {
      'liability_limit': 'coverageAnswers.general_liability_limit',
      'business_operations': 'coverageAnswers.business_operations',
      'business_classification': 'coverageAnswers.business_classification',
      'sic_code': 'coverageAnswers.sic_code',
      'naics_code': 'coverageAnswers.naics_code',
      'employee_count': 'coverageAnswers.employee_count',
      'annual_revenue': 'coverageAnswers.annual_revenue',
      'business_location_count': 'coverageAnswers.business_location_count',
      'products_completed_operations': 'coverageAnswers.products_completed_operations',
      'premises_operations_rate': 'coverageAnswers.premises_operations_rate',
      'premises_operations_premium': 'coverageAnswers.premises_operations_premium'
    },
    
    // ACORD 129 - Vehicle Schedule
    'ACORD 129': {
      'vehicle_count': 'coverageAnswers.personal_vehicle_count',
      'vehicle_year': 'coverageAnswers.vehicle_year',
      'vehicle_make': 'coverageAnswers.vehicle_make',
      'vehicle_model': 'coverageAnswers.vehicle_model',
      'vehicle_vin': 'coverageAnswers.vehicle_vin',
      'vehicle_body_type': 'coverageAnswers.vehicle_body_type',
      'vehicle_registration_state': 'coverageAnswers.vehicle_registration_state',
      'annual_miles': 'coverageAnswers.annual_miles',
      'driver_count': 'coverageAnswers.driver_count',
      'driving_record': 'coverageAnswers.violations_accidents',
      'vehicle_address': 'address',
      'vehicle_city': 'city',
      'vehicle_state': 'state',
      'vehicle_zip': 'zip'
    },
    
    // ACORD 130 - Workers Compensation Application
    'ACORD 130': {
      'business_name': 'businessName',
      'business_address': 'address',
      'business_city': 'city',
      'business_state': 'state',
      'business_zip': 'zip',
      'years_in_business': 'yearsInBusiness',
      'sic_code': 'coverageAnswers.wc_sic_code',
      'naics_code': 'coverageAnswers.wc_naics_code',
      'employee_count': 'coverageAnswers.wc_employee_count',
      'annual_payroll': 'coverageAnswers.annual_payroll',
      'business_classification': 'coverageAnswers.wc_business_classification',
      'highest_floor_count': 'coverageAnswers.highest_floor_count',
      'business_county': 'coverageAnswers.business_county',
      'contact_name': 'contactName',
      'contact_phone': 'phone',
      'contact_email': 'email'
    },
    
    // ACORD 137 - Commercial Auto
    'ACORD 137': {
      'commercial_vehicle_count': 'coverageAnswers.commercial_vehicle_count',
      'commercial_auto_symbol': 'coverageAnswers.commercial_auto_symbol',
      'commercial_vehicle_types': 'coverageAnswers.commercial_vehicle_types',
      'business_annual_miles': 'coverageAnswers.commercial_annual_miles',
      'commercial_driver_count': 'coverageAnswers.commercial_driver_count',
      'bodily_injury_limit': 'coverageAnswers.bodily_injury_limit',
      'property_damage_limit': 'coverageAnswers.property_damage_limit',
      'business_name': 'businessName',
      'business_address': 'address',
      'business_city': 'city',
      'business_state': 'state',
      'business_zip': 'zip'
    },
    
    // ACORD 140 - Commercial Property
    'ACORD 140': {
      'business_property_value': 'coverageAnswers.business_property_value',
      'property_type': 'coverageAnswers.property_type',
      'inventory_value': 'coverageAnswers.inventory_value',
      'building_description': 'coverageAnswers.building_description',
      'property_address': 'coverageAnswers.property_address',
      'property_county': 'coverageAnswers.property_county',
      'hazardous_materials': 'coverageAnswers.hazardous_materials',
      'athletic_teams': 'coverageAnswers.athletic_teams',
      'business_name': 'businessName',
      'business_address': 'address',
      'business_city': 'city',
      'business_state': 'state',
      'business_zip': 'zip'
    },
    
    // ACORD 24 - Certificate of Property Insurance
    'ACORD 24': {
      'property_description': 'coverageAnswers.building_description',
      'property_value': 'coverageAnswers.business_property_value',
      'property_address': 'coverageAnswers.property_address',
      'property_city': 'city',
      'property_state': 'state',
      'property_zip': 'zip',
      'property_county': 'coverageAnswers.property_county',
      'business_name': 'businessName',
      'contact_name': 'contactName',
      'contact_phone': 'phone',
      'contact_email': 'email'
    },
    
    // ACORD 160 - Business Owners Section
    'ACORD 160': {
      'business_property_value': 'coverageAnswers.business_property_value',
      'property_type': 'coverageAnswers.property_type',
      'inventory_value': 'coverageAnswers.inventory_value',
      'building_description': 'coverageAnswers.building_description',
      'property_address': 'coverageAnswers.property_address',
      'property_county': 'coverageAnswers.property_county',
      'hazardous_materials': 'coverageAnswers.hazardous_materials',
      'athletic_teams': 'coverageAnswers.athletic_teams',
      'business_name': 'businessName',
      'business_address': 'address',
      'business_city': 'city',
      'business_state': 'state',
      'business_zip': 'zip',
      'years_in_business': 'yearsInBusiness',
      'annual_revenue': 'coverageAnswers.annual_revenue'
    }
  };

  public generateACORDForms(customerData: CustomerData): ACORDForm[] {
    const forms: ACORDForm[] = [];
    
    // Get all ACORD forms needed based on selected coverage types
    const requiredForms = this.getRequiredForms(customerData.coverageTypes);
    
    for (const formType of requiredForms) {
      const form = this.generateForm(formType, customerData);
      if (form) {
        forms.push(form);
      }
    }
    
    return forms;
  }

  private getRequiredForms(coverageTypes: string[]): string[] {
    const formSet = new Set<string>();
    
    // Map coverage types to their required ACORD forms
    const coverageToForms: Record<string, string[]> = {
      // Personal Insurance
      'personal-auto': ['ACORD 125', 'ACORD 129'],
      'motorcycle': ['ACORD 125', 'ACORD 127'],
      'rv': ['ACORD 125', 'ACORD 127'],
      'boat': ['ACORD 125', 'ACORD 140'],
      'homeowners': ['ACORD 125', 'ACORD 140'],
      'renters': ['ACORD 125', 'ACORD 140'],
      'condo': ['ACORD 125', 'ACORD 140'],
      'flood': ['ACORD 125', 'ACORD 140'],
      'life': ['ACORD 125', 'ACORD 140'],
      'pet': ['ACORD 125', 'ACORD 140'],
      
      // Commercial Insurance (with proper names from demo data)
      'General Liability': ['ACORD 126', 'ACORD 125'],
      'general-liability': ['ACORD 126', 'ACORD 125'],
      'Property Insurance': ['ACORD 140', 'ACORD 125', 'ACORD 24', 'ACORD 160'],
      'property': ['ACORD 140', 'ACORD 125', 'ACORD 24', 'ACORD 160'],
      'Workers\' Compensation': ['ACORD 130', 'ACORD 125'],
      'workers-compensation': ['ACORD 130', 'ACORD 125'],
      'Commercial Auto': ['ACORD 127', 'ACORD 125', 'ACORD 137'],
      'commercial-auto': ['ACORD 127', 'ACORD 125', 'ACORD 137'],
      'Cyber Liability': ['ACORD 126', 'ACORD 125'],
      'cyber-liability': ['ACORD 126', 'ACORD 125'],
      'Professional Liability': ['ACORD 126', 'ACORD 125'],
      'professional-liability': ['ACORD 126', 'ACORD 125'],
      'Business Property': ['ACORD 140', 'ACORD 125', 'ACORD 24', 'ACORD 160'],
      'business-property': ['ACORD 140', 'ACORD 125', 'ACORD 24', 'ACORD 160'],
      'Umbrella': ['ACORD 125', 'ACORD 126'],
      'umbrella': ['ACORD 125', 'ACORD 126']
    };
    
    coverageTypes.forEach(coverageType => {
      const forms = coverageToForms[coverageType] || [];
      forms.forEach(form => formSet.add(form));
    });
    
    return Array.from(formSet);
  }

  private generateForm(formType: string, customerData: CustomerData): ACORDForm | null {
    if (formType === 'ACORD 125') {
      return this.generateACORD125(customerData);
    }
    
    const fieldMapping = this.fieldMappings[formType];
    if (!fieldMapping) {
      console.warn(`No field mapping found for form type: ${formType}`);
      return null;
    }

    const fields: Record<string, string> = {};
    
    for (const [acordField, dataPath] of Object.entries(fieldMapping)) {
      const value = this.getValueFromPath(customerData, dataPath);
      
      if (value !== undefined && value !== null && value !== '') {
        fields[acordField] = String(value);
      }
    }

    return {
      formType,
      formName: this.getFormDisplayName(formType),
      fields,
      generatedAt: new Date(),
      customerData
    };
  }

  // Generate ACORD 125 - Commercial General Liability Application
  private generateACORD125(customerData: CustomerData): ACORDForm {
    return {
      formType: 'ACORD 125',
      formName: 'Commercial General Liability Application',
      fields: {
        // Producer Information
        'Producer_FullName_A': 'ACORD Insurance Agency',
        'Producer_MailingAddress_LineOne_A': '123 Insurance St',
        'Producer_MailingAddress_CityName_A': 'Insurance City',
        'Producer_MailingAddress_StateOrProvinceCode_A': 'IC',
        'Producer_MailingAddress_PostalCode_A': '12345',
        'Producer_ContactPerson_FullName_A': 'John Producer',
        'Producer_ContactPerson_PhoneNumber_A': '(555) 123-4567',
        'Producer_ContactPerson_EmailAddress_A': 'john@acord.com',
        
        // Insurer Information
        'Insurer_FullName_A': 'Sample Insurance Company',
        'Insurer_NAICCode_A': '12345',
        'Insurer_ProductDescription_A': 'Commercial General Liability',
        'Insurer_ProductCode_A': 'CGL001',
        'Policy_PolicyNumberIdentifier_A': 'POL-2024-001',
        
        // Policy Status
        'Policy_Status_QuoteIndicator_A': 'Yes',
        'Policy_Status_EffectiveDate_A': new Date().toLocaleDateString(),
        
        // Business Information
        'CommercialPolicy_BusinessName_A': customerData.businessName || 'N/A',
        'CommercialPolicy_BusinessAddress_A': customerData.address || 'N/A',
        'CommercialPolicy_BusinessCity_A': customerData.city || 'N/A',
        'CommercialPolicy_BusinessState_A': customerData.state || 'N/A',
        'CommercialPolicy_BusinessZip_A': customerData.zipCode || 'N/A',
        'CommercialPolicy_FederalTaxId_A': customerData.federalId || 'N/A',
        'CommercialPolicy_BusinessType_A': customerData.businessType || 'N/A',
        'CommercialPolicy_YearsInBusiness_A': customerData.yearsInBusiness || 'N/A',
        'CommercialPolicy_Website_A': customerData.website || 'N/A',
        
        // Contact Information
        'CommercialPolicy_ContactName_A': customerData.contactName || 'N/A',
        'CommercialPolicy_ContactEmail_A': customerData.email || 'N/A',
        'CommercialPolicy_ContactPhone_A': customerData.phone || 'N/A',
        
        // Operations Description
        'CommercialPolicy_OperationsDescription_A': customerData.description || 'N/A',
        
        // Coverage Information
        'CommercialPolicy_CoverageTypes_A': customerData.coverageTypes.join(', '),
        'GeneralLiabilityLineOfBusiness_TotalPremiumAmount_A': '$5,000',
        
        // Form Completion
        'Form_CompletionDate_A': new Date().toLocaleDateString(),
        'Form_EditionIdentifier_A': 'ACORD 125 2016-03r2'
      },
      generatedAt: new Date(),
      customerData
    };
  }

  private getValueFromPath(data: any, path: string): any {
    const keys = path.split('.');
    let value = data;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private isRequiredField(fieldName: string): boolean {
    const requiredFields = [
      'applicant_name', 'business_name', 'contact_name', 'contact_phone', 'contact_email',
      'applicant_address', 'applicant_city', 'applicant_state', 'applicant_zip',
      'vehicle_count', 'vehicle_year', 'vehicle_make', 'vehicle_model',
      'employee_count', 'annual_revenue', 'business_classification'
    ];
    
    return requiredFields.includes(fieldName);
  }

  private getFieldDescription(fieldName: string): string {
    const descriptions: Record<string, string> = {
      'applicant_name': 'Full legal name of the applicant',
      'business_name': 'Legal name of the business',
      'contact_name': 'Primary contact person',
      'contact_phone': 'Primary phone number',
      'contact_email': 'Primary email address',
      'applicant_address': 'Street address',
      'applicant_city': 'City name',
      'applicant_state': 'State abbreviation',
      'applicant_zip': 'ZIP code',
      'vehicle_count': 'Number of vehicles',
      'vehicle_year': 'Model year of primary vehicle',
      'vehicle_make': 'Manufacturer of primary vehicle',
      'vehicle_model': 'Model of primary vehicle',
      'vehicle_vin': 'Vehicle Identification Number',
      'employee_count': 'Number of employees',
      'annual_revenue': 'Annual business revenue',
      'business_classification': 'Primary business classification'
    };
    
    return descriptions[fieldName] || '';
  }

  private getFormDisplayName(formType: string): string {
    const displayNames: Record<string, string> = {
      'ACORD 125': 'Commercial General Liability Application',
      'ACORD 126': 'Commercial General Liability Section',
      'ACORD 129': 'Vehicle Schedule',
      'ACORD 130': 'Workers Compensation Application',
      'ACORD 137': 'Commercial Auto Application',
      'ACORD 140': 'Commercial Property Application',
      'ACORD 24': 'Certificate of Property Insurance',
      'ACORD 160': 'Business Owners Section'
    };
    
    return displayNames[formType] || formType;
  }

  public generateFormSummary(forms: ACORDForm[]): string {
    let summary = `ACORD Forms Generated: ${forms.length}\n\n`;
    
    forms.forEach(form => {
      summary += `📋 ${form.formName} (${form.formType})\n`;
      summary += `   Fields Populated: ${form.fields.length}\n`;
      summary += `   Generated: ${form.generatedAt.toLocaleString()}\n\n`;
    });
    
    return summary;
  }

  public exportFormsAsJSON(forms: ACORDForm[]): string {
    return JSON.stringify(forms, null, 2);
  }

  public getFormPreview(form: ACORDForm): string {
    let preview = `📋 ${form.formName}\n`;
    preview += `Form Type: ${form.formType}\n`;
    preview += `Generated: ${form.generatedAt.toLocaleString()}\n\n`;
    preview += `Fields Populated:\n`;
    
    form.fields.forEach(field => {
      preview += `  • ${field.fieldName}: ${field.value}\n`;
    });
    
    return preview;
  }
}

export const acordFormGenerator = new ACORDFormGenerator();
