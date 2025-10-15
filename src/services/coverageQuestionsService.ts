// src/services/coverageQuestionsService.ts

export type ClientType = 'personal' | 'business' | 'both';

export interface CoverageQuestion {
  id: string;
  question: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea';
  required: boolean;
  options?: string[];
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  acordField?: string; // Maps to ACORD form field
  description?: string;
  clientTypes?: ClientType[]; // Which client types this question applies to
}

export interface CoverageType {
  id: string;
  name: string;
  description: string;
  acordForms: string[]; // Which ACORD forms this coverage affects
  clientTypes: ClientType[]; // Which client types this coverage applies to
  questions: CoverageQuestion[];
}

export interface CoverageResponse {
  coverageType: string;
  answers: Record<string, string | number | boolean | string[]>;
}

class CoverageQuestionsService {
  private coverageTypes: CoverageType[] = [
    // Personal Coverage Types
    {
      id: 'personal-auto',
      name: 'Personal Auto',
      description: 'Coverage for personal vehicles and liability while driving',
      acordForms: ['ACORD 125'],
      clientTypes: ['personal', 'both'],
      questions: [
        {
          id: 'personal-vehicle-count',
          question: 'How many personal vehicles do you own?',
          type: 'number',
          required: true,
          validation: { min: 1, max: 10 },
          acordField: 'vehicle_count',
          clientTypes: ['personal', 'both']
        },
        {
          id: 'personal-vehicle-types',
          question: 'What types of personal vehicles do you own? (Select all that apply)',
          type: 'checkbox',
          required: true,
          options: ['Car', 'SUV', 'Truck', 'Motorcycle', 'RV', 'Other'],
          acordField: 'vehicle_types',
          clientTypes: ['personal', 'both']
        },
        {
          id: 'personal-annual-miles',
          question: 'Estimated annual miles driven personally?',
          type: 'select',
          required: true,
          options: ['Under 5,000', '5,000 - 10,000', '10,000 - 15,000', '15,000 - 20,000', 'Over 20,000'],
          acordField: 'annual_miles',
          clientTypes: ['personal', 'both']
        },
        {
          id: 'personal-drivers',
          question: 'How many drivers will be covered?',
          type: 'number',
          required: true,
          validation: { min: 1, max: 10 },
          acordField: 'number_of_drivers',
          clientTypes: ['personal', 'both']
        },
        {
          id: 'personal-driving-record',
          question: 'Any driving violations or accidents in the past 3 years?',
          type: 'select',
          required: true,
          options: ['No violations', '1-2 violations', '3+ violations', 'At-fault accidents'],
          acordField: 'driving_violations',
          clientTypes: ['personal', 'both']
        }
      ]
    },
    {
      id: 'homeowners',
      name: 'Homeowners Insurance',
      description: 'Protection for your home, personal property, and liability',
      acordForms: ['ACORD 125'],
      clientTypes: ['personal', 'both'],
      questions: [
        {
          id: 'home-type',
          question: 'What type of home do you own?',
          type: 'select',
          required: true,
          options: ['Single Family', 'Condo', 'Townhouse', 'Mobile Home', 'Rental Property'],
          acordField: 'home_type',
          clientTypes: ['personal', 'both']
        },
        {
          id: 'home-value',
          question: 'Estimated value of your home?',
          type: 'select',
          required: true,
          options: ['Under $100K', '$100K - $200K', '$200K - $300K', '$300K - $500K', '$500K - $1M', 'Over $1M'],
          acordField: 'home_value',
          clientTypes: ['personal', 'both']
        },
        {
          id: 'home-age',
          question: 'How old is your home?',
          type: 'select',
          required: true,
          options: ['New (0-5 years)', '5-15 years', '15-30 years', '30+ years'],
          acordField: 'home_age',
          clientTypes: ['personal', 'both']
        },
        {
          id: 'personal-property-value',
          question: 'Estimated value of personal property?',
          type: 'select',
          required: true,
          options: ['Under $25K', '$25K - $50K', '$50K - $100K', '$100K - $200K', 'Over $200K'],
          acordField: 'personal_property_value',
          clientTypes: ['personal', 'both']
        }
      ]
    },
    {
      id: 'personal-liability',
      name: 'Personal Liability',
      description: 'Protection against personal liability claims',
      acordForms: ['ACORD 125'],
      clientTypes: ['personal', 'both'],
      questions: [
        {
          id: 'personal-occupation',
          question: 'What is your occupation?',
          type: 'text',
          required: true,
          placeholder: 'e.g., Teacher, Engineer, Consultant',
          acordField: 'occupation',
          clientTypes: ['personal', 'both']
        },
        {
          id: 'personal-income',
          question: 'What is your annual income range?',
          type: 'select',
          required: true,
          options: ['Under $25K', '$25K - $50K', '$50K - $75K', '$75K - $100K', '$100K - $150K', 'Over $150K'],
          acordField: 'annual_income',
          clientTypes: ['personal', 'both']
        },
        {
          id: 'personal-assets',
          question: 'Estimated value of personal assets?',
          type: 'select',
          required: true,
          options: ['Under $50K', '$50K - $100K', '$100K - $250K', '$250K - $500K', '$500K - $1M', 'Over $1M'],
          acordField: 'personal_assets',
          clientTypes: ['personal', 'both']
        }
      ]
    },
    // Business Coverage Types
    {
      id: 'general-liability',
      name: 'General Liability',
      description: 'Protection against claims of bodily injury, property damage, and personal injury',
      acordForms: ['ACORD 126', 'ACORD 125'],
      clientTypes: ['business', 'both'],
      questions: [
        {
          id: 'business-description',
          question: 'Please describe your business operations in detail',
          type: 'textarea',
          required: true,
          placeholder: 'Describe what your business does, products/services offered, etc.',
          acordField: 'business_description',
          description: 'This helps underwriters understand your risk profile',
          clientTypes: ['business', 'both']
        },
        {
          id: 'annual-revenue',
          question: 'What is your estimated annual revenue?',
          type: 'select',
          required: true,
          options: ['Under $100K', '$100K - $500K', '$500K - $1M', '$1M - $5M', '$5M - $10M', 'Over $10M'],
          acordField: 'annual_revenue'
        },
        {
          id: 'employees',
          question: 'How many employees do you have?',
          type: 'number',
          required: true,
          validation: { min: 0, max: 10000 },
          acordField: 'number_of_employees'
        },
        {
          id: 'previous-claims',
          question: 'Have you had any general liability claims in the past 5 years?',
          type: 'select',
          required: true,
          options: ['No', 'Yes - 1 claim', 'Yes - 2-3 claims', 'Yes - 4+ claims'],
          acordField: 'previous_claims'
        },
        {
          id: 'contractor-work',
          question: 'Do you work with independent contractors or subcontractors?',
          type: 'select',
          required: true,
          options: ['No', 'Yes - Occasionally', 'Yes - Regularly'],
          acordField: 'contractor_work'
        }
      ]
    },
    {
      id: 'commercial-auto',
      name: 'Commercial Auto',
      description: 'Coverage for business vehicles and liability while driving for business',
      acordForms: ['ACORD 127', 'ACORD 125'],
      clientTypes: ['business', 'both'],
      questions: [
        {
          id: 'vehicle-count',
          question: 'How many vehicles do you own/lease for business use?',
          type: 'number',
          required: true,
          validation: { min: 1, max: 1000 },
          acordField: 'vehicle_count'
        },
        {
          id: 'vehicle-types',
          question: 'What types of vehicles do you use? (Select all that apply)',
          type: 'checkbox',
          required: true,
          options: ['Cars', 'Trucks', 'Vans', 'Motorcycles', 'Heavy Equipment', 'Trailers', 'Other'],
          acordField: 'vehicle_types'
        },
        {
          id: 'annual-miles',
          question: 'Estimated annual miles driven for business?',
          type: 'select',
          required: true,
          options: ['Under 5,000', '5,000 - 15,000', '15,000 - 30,000', '30,000 - 50,000', 'Over 50,000'],
          acordField: 'annual_miles'
        },
        {
          id: 'drivers',
          question: 'How many drivers will be covered?',
          type: 'number',
          required: true,
          validation: { min: 1, max: 100 },
          acordField: 'number_of_drivers'
        },
        {
          id: 'driving-violations',
          question: 'Any driving violations or accidents in the past 3 years?',
          type: 'select',
          required: true,
          options: ['No violations', '1-2 violations', '3+ violations', 'At-fault accidents'],
          acordField: 'driving_violations'
        }
      ]
    },
    {
      id: 'workers-compensation',
      name: 'Workers\' Compensation',
      description: 'Coverage for employee injuries and illnesses related to work',
      acordForms: ['ACORD 130', 'ACORD 125'],
      clientTypes: ['business', 'both'],
      questions: [
        {
          id: 'employee-count',
          question: 'How many employees do you have?',
          type: 'number',
          required: true,
          validation: { min: 1, max: 10000 },
          acordField: 'employee_count'
        },
        {
          id: 'payroll',
          question: 'Estimated annual payroll?',
          type: 'select',
          required: true,
          options: ['Under $50K', '$50K - $100K', '$100K - $250K', '$250K - $500K', '$500K - $1M', 'Over $1M'],
          acordField: 'annual_payroll'
        },
        {
          id: 'job-classifications',
          question: 'What are your main job classifications? (Select all that apply)',
          type: 'checkbox',
          required: true,
          options: ['Office/Clerical', 'Sales', 'Professional Services', 'Construction', 'Manufacturing', 'Healthcare', 'Retail', 'Other'],
          acordField: 'job_classifications'
        },
        {
          id: 'workplace-safety',
          question: 'Do you have a formal workplace safety program?',
          type: 'select',
          required: true,
          options: ['No', 'Basic safety training', 'Formal safety program', 'OSHA certified'],
          acordField: 'safety_program'
        },
        {
          id: 'previous-wc-claims',
          question: 'Any workers\' compensation claims in the past 3 years?',
          type: 'select',
          required: true,
          options: ['No claims', '1 claim', '2-3 claims', '4+ claims'],
          acordField: 'previous_wc_claims'
        }
      ]
    },
    {
      id: 'property',
      name: 'Property Insurance',
      description: 'Coverage for business property, equipment, and inventory',
      acordForms: ['ACORD 140', 'ACORD 125'],
      clientTypes: ['business', 'both'],
      questions: [
        {
          id: 'property-type',
          question: 'What type of property do you own/lease?',
          type: 'select',
          required: true,
          options: ['Office Building', 'Warehouse', 'Retail Store', 'Manufacturing Facility', 'Restaurant', 'Other'],
          acordField: 'property_type'
        },
        {
          id: 'property-value',
          question: 'Estimated value of business property and equipment?',
          type: 'select',
          required: true,
          options: ['Under $25K', '$25K - $100K', '$100K - $500K', '$500K - $1M', '$1M - $5M', 'Over $5M'],
          acordField: 'property_value'
        },
        {
          id: 'inventory-value',
          question: 'Estimated value of inventory at peak season?',
          type: 'select',
          required: true,
          options: ['Under $10K', '$10K - $50K', '$50K - $100K', '$100K - $500K', 'Over $500K'],
          acordField: 'inventory_value'
        },
        {
          id: 'building-age',
          question: 'How old is your building?',
          type: 'select',
          required: true,
          options: ['New (0-5 years)', '5-15 years', '15-30 years', '30+ years'],
          acordField: 'building_age'
        },
        {
          id: 'security-measures',
          question: 'What security measures do you have? (Select all that apply)',
          type: 'checkbox',
          required: true,
          options: ['Alarm System', 'Security Cameras', 'Security Guards', 'Locked Doors', 'None'],
          acordField: 'security_measures'
        }
      ]
    },
    {
      id: 'cyber-liability',
      name: 'Cyber Liability',
      description: 'Protection against data breaches and cyber attacks',
      acordForms: ['ACORD 125'],
      clientTypes: ['business', 'both'],
      questions: [
        {
          id: 'data-storage',
          question: 'What type of data do you store? (Select all that apply)',
          type: 'checkbox',
          required: true,
          options: ['Customer Personal Info', 'Payment Information', 'Health Records', 'Financial Data', 'Intellectual Property', 'Other'],
          acordField: 'data_types'
        },
        {
          id: 'data-volume',
          question: 'How many customer records do you store?',
          type: 'select',
          required: true,
          options: ['Under 1,000', '1,000 - 10,000', '10,000 - 100,000', '100,000 - 1M', 'Over 1M'],
          acordField: 'data_volume'
        },
        {
          id: 'cyber-security',
          question: 'What cybersecurity measures do you have? (Select all that apply)',
          type: 'checkbox',
          required: true,
          options: ['Firewall', 'Antivirus Software', 'Data Encryption', 'Regular Backups', 'Employee Training', 'Incident Response Plan'],
          acordField: 'cyber_security'
        },
        {
          id: 'online-presence',
          question: 'Do you have an online presence? (website, e-commerce, etc.)',
          type: 'select',
          required: true,
          options: ['No online presence', 'Website only', 'E-commerce site', 'Mobile app', 'Multiple platforms'],
          acordField: 'online_presence'
        }
      ]
    }
  ];

  getCoverageTypes(clientType?: ClientType): CoverageType[] {
    if (!clientType) {
      return this.coverageTypes;
    }
    return this.coverageTypes.filter(coverage => 
      coverage.clientTypes.includes(clientType)
    );
  }

  getCoverageTypeById(id: string): CoverageType | undefined {
    return this.coverageTypes.find(coverage => coverage.id === id);
  }

  getQuestionsForCoverages(coverageIds: string[], clientType?: ClientType): CoverageQuestion[] {
    const allQuestions: CoverageQuestion[] = [];
    
    coverageIds.forEach(coverageId => {
      const coverageType = this.getCoverageTypeById(coverageId);
      if (coverageType) {
        const questions = coverageType.questions.filter(question => 
          !clientType || !question.clientTypes || question.clientTypes.includes(clientType)
        );
        allQuestions.push(...questions);
      }
    });

    // Remove duplicate questions (same ID)
    const uniqueQuestions = allQuestions.filter((question, index, self) => 
      index === self.findIndex(q => q.id === question.id)
    );

    return uniqueQuestions;
  }

  getACORDFormsForCoverages(coverageIds: string[]): string[] {
    const allForms: string[] = [];
    
    coverageIds.forEach(coverageId => {
      const coverageType = this.getCoverageTypeById(coverageId);
      if (coverageType) {
        allForms.push(...coverageType.acordForms);
      }
    });

    // Remove duplicates
    return [...new Set(allForms)];
  }

  generateACORDData(coverageResponses: CoverageResponse[]): Record<string, any> {
    const acordData: Record<string, any> = {};

    coverageResponses.forEach(response => {
      const coverageType = this.getCoverageTypeById(response.coverageType);
      if (coverageType) {
        coverageType.questions.forEach(question => {
          const answer = response.answers[question.id];
          if (answer !== undefined && question.acordField) {
            acordData[question.acordField] = answer;
          }
        });
      }
    });

    return acordData;
  }
}

export const coverageQuestionsService = new CoverageQuestionsService();
