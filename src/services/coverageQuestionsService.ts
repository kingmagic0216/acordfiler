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
  category: 'vehicle' | 'property' | 'business' | 'additional'; // GEICO-style categorization
  icon?: string; // Icon for UI display
}

export interface CoverageResponse {
  coverageType: string;
  answers: Record<string, string | number | boolean | string[]>;
}

class CoverageQuestionsService {
  private coverageTypes: CoverageType[] = [
    // VEHICLE INSURANCE (Personal & Business)
    {
      id: 'personal-auto',
      name: 'Personal Auto',
      description: 'Coverage for personal vehicles and liability while driving',
      acordForms: ['ACORD 125'],
      clientTypes: ['personal', 'both'],
      category: 'vehicle',
      icon: '🚗',
      questions: [
        {
          id: 'personal-vehicle-count',
          question: 'How many personal vehicles do you own?',
          type: 'number',
          required: true,
          validation: { min: 1, max: 10 },
          acordField: 'vehicle_count',
          description: 'Include all vehicles registered in your name'
        },
        {
          id: 'vehicle-types',
          question: 'What types of personal vehicles do you own? (Select all that apply)',
          type: 'checkbox',
          required: true,
          options: ['Car', 'SUV', 'Truck', 'Motorcycle', 'RV', 'Other'],
          acordField: 'vehicle_types',
          description: 'Select all vehicle types you currently own'
        },
        {
          id: 'annual-miles',
          question: 'Estimated annual miles driven personally?',
          type: 'select',
          required: true,
          options: ['Under 5,000', '5,000-10,000', '10,000-15,000', '15,000-20,000', '20,000+'],
          acordField: 'annual_miles',
          description: 'Estimate your total annual driving mileage'
        },
        {
          id: 'driver-count',
          question: 'How many drivers will be covered?',
          type: 'number',
          required: true,
          validation: { min: 1, max: 10 },
          acordField: 'driver_count',
          description: 'Include all drivers who will use the vehicles'
        },
        {
          id: 'violations-accidents',
          question: 'Any driving violations or accidents in the past 3 years?',
          type: 'select',
          required: true,
          options: ['None', '1-2 violations', '3+ violations', 'At-fault accident', 'Not-at-fault accident'],
          acordField: 'driving_record',
          description: 'Include any tickets, citations, or accidents'
        }
      ]
    },
    {
      id: 'motorcycle',
      name: 'Motorcycle Insurance',
      description: 'Coverage for motorcycles, scooters, and off-road vehicles',
      acordForms: ['ACORD 125'],
      clientTypes: ['personal', 'both'],
      category: 'vehicle',
      icon: '🏍️',
      questions: [
        {
          id: 'motorcycle-count',
          question: 'How many motorcycles do you own?',
          type: 'number',
          required: true,
          validation: { min: 1, max: 5 },
          acordField: 'motorcycle_count',
          description: 'Include all motorcycles, scooters, and ATVs'
        },
        {
          id: 'motorcycle-types',
          question: 'Types of motorcycles? (Select all that apply)',
          type: 'checkbox',
          required: true,
          options: ['Cruiser', 'Sport Bike', 'Touring', 'Dirt Bike', 'ATV', 'Scooter', 'Other'],
          acordField: 'motorcycle_types',
          description: 'Types of motorcycles you own'
        },
        {
          id: 'riding-experience',
          question: 'Years of motorcycle riding experience?',
          type: 'select',
          required: true,
          options: ['Less than 1 year', '1-3 years', '3-5 years', '5-10 years', '10+ years'],
          acordField: 'riding_experience',
          description: 'Your motorcycle riding experience'
        }
      ]
    },
    {
      id: 'rv',
      name: 'RV Insurance',
      description: 'Coverage for recreational vehicles and motorhomes',
      acordForms: ['ACORD 125'],
      clientTypes: ['personal', 'both'],
      category: 'vehicle',
      icon: '🚐',
      questions: [
        {
          id: 'rv-type',
          question: 'Type of RV?',
          type: 'select',
          required: true,
          options: ['Motorhome', 'Travel Trailer', 'Fifth Wheel', 'Pop-up Camper', 'Toy Hauler'],
          acordField: 'rv_type',
          description: 'Type of recreational vehicle'
        },
        {
          id: 'rv-value',
          question: 'Estimated value of your RV?',
          type: 'select',
          required: true,
          options: ['Under $25,000', '$25,000-$50,000', '$50,000-$100,000', '$100,000-$200,000', '$200,000+'],
          acordField: 'rv_value',
          description: 'Current market value of your RV'
        },
        {
          id: 'rv-usage',
          question: 'How often do you use your RV?',
          type: 'select',
          required: true,
          options: ['Weekends only', 'Monthly trips', 'Seasonal use', 'Full-time living', 'Occasional use'],
          acordField: 'rv_usage',
          description: 'Frequency of RV usage'
        }
      ]
    },
    {
      id: 'boat',
      name: 'Boat Insurance',
      description: 'Coverage for boats, yachts, and personal watercraft',
      acordForms: ['ACORD 125'],
      clientTypes: ['personal', 'both'],
      category: 'vehicle',
      icon: '⛵',
      questions: [
        {
          id: 'boat-type',
          question: 'Type of watercraft?',
          type: 'select',
          required: true,
          options: ['Powerboat', 'Sailboat', 'Yacht', 'Personal Watercraft (PWC)', 'Pontoon', 'Other'],
          acordField: 'boat_type',
          description: 'Type of watercraft you own'
        },
        {
          id: 'boat-value',
          question: 'Estimated value of your boat?',
          type: 'select',
          required: true,
          options: ['Under $10,000', '$10,000-$25,000', '$25,000-$50,000', '$50,000-$100,000', '$100,000+'],
          acordField: 'boat_value',
          description: 'Current market value of your boat'
        },
        {
          id: 'boat-length',
          question: 'Length of your boat?',
          type: 'select',
          required: true,
          options: ['Under 16 feet', '16-26 feet', '26-40 feet', '40-60 feet', '60+ feet'],
          acordField: 'boat_length',
          description: 'Overall length of your boat'
        }
      ]
    },
    {
      id: 'commercial-auto',
      name: 'Commercial Auto',
      description: 'Coverage for business vehicles and liability while driving for business',
      acordForms: ['ACORD 127', 'ACORD 125'],
      clientTypes: ['business', 'both'],
      category: 'vehicle',
      icon: '🚛',
      questions: [
        {
          id: 'vehicle-count',
          question: 'Number of commercial vehicles?',
          type: 'number',
          required: true,
          validation: { min: 1, max: 100 },
          acordField: 'commercial_vehicle_count',
          description: 'Vehicles used for business purposes'
        },
        {
          id: 'vehicle-types',
          question: 'Types of commercial vehicles? (Select all that apply)',
          type: 'checkbox',
          required: true,
          options: ['Cars', 'Vans', 'Trucks', 'Semi-Trucks', 'Buses', 'Motorcycles', 'Other'],
          acordField: 'commercial_vehicle_types',
          description: 'Types of vehicles used for business'
        },
        {
          id: 'annual-miles',
          question: 'Estimated annual business miles driven?',
          type: 'select',
          required: true,
          options: ['Under 10,000', '10,000-25,000', '25,000-50,000', '50,000-100,000', '100,000+'],
          acordField: 'business_annual_miles',
          description: 'Total annual mileage for business use'
        },
        {
          id: 'driver-count',
          question: 'Number of commercial drivers?',
          type: 'number',
          required: true,
          validation: { min: 1, max: 100 },
          acordField: 'commercial_driver_count',
          description: 'Employees who drive for business purposes'
        }
      ]
    },

    // PROPERTY INSURANCE (Personal & Business)
    {
      id: 'homeowners',
      name: 'Homeowners Insurance',
      description: 'Protection for your home, personal property, and liability',
      acordForms: ['ACORD 125'],
      clientTypes: ['personal', 'both'],
      category: 'property',
      icon: '🏠',
      questions: [
        {
          id: 'home-value',
          question: 'Estimated value of your home?',
          type: 'select',
          required: true,
          options: ['Under $100,000', '$100,000-$200,000', '$200,000-$300,000', '$300,000-$500,000', '$500,000+'],
          acordField: 'home_value',
          description: 'Current market value of your home'
        },
        {
          id: 'home-age',
          question: 'Year your home was built?',
          type: 'number',
          required: true,
          validation: { min: 1800, max: new Date().getFullYear() },
          acordField: 'home_age',
          description: 'Year of construction'
        },
        {
          id: 'home-type',
          question: 'Type of home?',
          type: 'select',
          required: true,
          options: ['Single Family', 'Condo', 'Townhouse', 'Mobile Home', 'Duplex'],
          acordField: 'home_type',
          description: 'Primary structure type'
        }
      ]
    },
    {
      id: 'renters',
      name: 'Renters Insurance',
      description: 'Protection for personal property and liability while renting',
      acordForms: ['ACORD 125'],
      clientTypes: ['personal', 'both'],
      category: 'property',
      icon: '🏢',
      questions: [
        {
          id: 'personal-property-value',
          question: 'Estimated value of personal property?',
          type: 'select',
          required: true,
          options: ['Under $10,000', '$10,000-$25,000', '$25,000-$50,000', '$50,000-$100,000', '$100,000+'],
          acordField: 'personal_property_value',
          description: 'Total value of your personal belongings'
        },
        {
          id: 'rental-type',
          question: 'Type of rental property?',
          type: 'select',
          required: true,
          options: ['Apartment', 'House', 'Condo', 'Townhouse', 'Mobile Home', 'Other'],
          acordField: 'rental_type',
          description: 'Type of property you rent'
        }
      ]
    },
    {
      id: 'condo',
      name: 'Condo Insurance',
      description: 'Protection for condominium units and personal property',
      acordForms: ['ACORD 125'],
      clientTypes: ['personal', 'both'],
      category: 'property',
      icon: '🏘️',
      questions: [
        {
          id: 'condo-value',
          question: 'Estimated value of your condo unit?',
          type: 'select',
          required: true,
          options: ['Under $100,000', '$100,000-$200,000', '$200,000-$300,000', '$300,000-$500,000', '$500,000+'],
          acordField: 'condo_value',
          description: 'Value of your condominium unit'
        },
        {
          id: 'hoa-coverage',
          question: 'Does your HOA provide building coverage?',
          type: 'select',
          required: true,
          options: ['Yes', 'No', 'Partial', 'Unknown'],
          acordField: 'hoa_coverage',
          description: 'Coverage provided by homeowners association'
        }
      ]
    },
    {
      id: 'flood',
      name: 'Flood Insurance',
      description: 'Protection against flood damage to property',
      acordForms: ['ACORD 125'],
      clientTypes: ['personal', 'business', 'both'],
      category: 'property',
      icon: '🌊',
      questions: [
        {
          id: 'flood-zone',
          question: 'Is your property in a flood zone?',
          type: 'select',
          required: true,
          options: ['High Risk (A/V)', 'Moderate Risk (B)', 'Low Risk (C)', 'Unknown'],
          acordField: 'flood_zone',
          description: 'Flood risk level for your property'
        },
        {
          id: 'property-value',
          question: 'Estimated value of property to protect?',
          type: 'select',
          required: true,
          options: ['Under $100,000', '$100,000-$250,000', '$250,000-$500,000', '$500,000-$1,000,000', '$1,000,000+'],
          acordField: 'flood_property_value',
          description: 'Value of property needing flood protection'
        }
      ]
    },

    // BUSINESS INSURANCE
    {
      id: 'general-liability',
      name: 'General Liability',
      description: 'Protection against claims of bodily injury, property damage, and personal injury',
      acordForms: ['ACORD 126', 'ACORD 125'],
      clientTypes: ['business', 'both'],
      category: 'business',
      icon: '🛡️',
      questions: [
        {
          id: 'liability-limit',
          question: 'Desired general liability coverage limit?',
          type: 'select',
          required: true,
          options: ['$100,000', '$250,000', '$500,000', '$1,000,000', '$2,000,000', '$5,000,000+'],
          acordField: 'general_liability_limit',
          description: 'Amount of liability protection needed'
        },
        {
          id: 'business-operations',
          question: 'Describe your business operations',
          type: 'textarea',
          required: true,
          placeholder: 'Describe what your business does, products/services offered, etc.',
          acordField: 'business_operations',
          description: 'Detailed description of business activities'
        },
        {
          id: 'employee-count',
          question: 'Number of employees?',
          type: 'number',
          required: true,
          validation: { min: 0, max: 1000 },
          acordField: 'employee_count',
          description: 'Include all employees, contractors, and volunteers'
        },
        {
          id: 'annual-revenue',
          question: 'Estimated annual revenue?',
          type: 'select',
          required: true,
          options: ['Under $100,000', '$100,000-$500,000', '$500,000-$1,000,000', '$1,000,000-$5,000,000', '$5,000,000+'],
          acordField: 'annual_revenue',
          description: 'Gross annual revenue'
        }
      ]
    },
    {
      id: 'workers-compensation',
      name: 'Workers\' Compensation',
      description: 'Coverage for employee injuries and illnesses related to work',
      acordForms: ['ACORD 130', 'ACORD 125'],
      clientTypes: ['business', 'both'],
      category: 'business',
      icon: '👷',
      questions: [
        {
          id: 'employee-count',
          question: 'Number of employees requiring workers\' compensation?',
          type: 'number',
          required: true,
          validation: { min: 1, max: 1000 },
          acordField: 'wc_employee_count',
          description: 'Employees who need workers\' compensation coverage'
        },
        {
          id: 'payroll-amount',
          question: 'Estimated annual payroll?',
          type: 'select',
          required: true,
          options: ['Under $50,000', '$50,000-$100,000', '$100,000-$250,000', '$250,000-$500,000', '$500,000+'],
          acordField: 'annual_payroll',
          description: 'Total annual payroll for covered employees'
        },
        {
          id: 'business-classification',
          question: 'Primary business classification?',
          type: 'select',
          required: true,
          options: ['Office/Clerical', 'Retail', 'Construction', 'Manufacturing', 'Healthcare', 'Food Service', 'Other'],
          acordField: 'business_classification',
          description: 'Main type of work performed by employees'
        }
      ]
    },
    {
      id: 'property',
      name: 'Business Property',
      description: 'Coverage for business property, equipment, and inventory',
      acordForms: ['ACORD 140', 'ACORD 125'],
      clientTypes: ['business', 'both'],
      category: 'business',
      icon: '🏭',
      questions: [
        {
          id: 'property-value',
          question: 'Estimated value of business property?',
          type: 'select',
          required: true,
          options: ['Under $50,000', '$50,000-$100,000', '$100,000-$250,000', '$250,000-$500,000', '$500,000+'],
          acordField: 'business_property_value',
          description: 'Total value of business property and equipment'
        },
        {
          id: 'property-type',
          question: 'Type of business property?',
          type: 'select',
          required: true,
          options: ['Owned Building', 'Leased Space', 'Home Office', 'Warehouse', 'Retail Space', 'Other'],
          acordField: 'property_type',
          description: 'Primary business location type'
        },
        {
          id: 'inventory-value',
          question: 'Estimated inventory value?',
          type: 'select',
          required: true,
          options: ['None', 'Under $25,000', '$25,000-$50,000', '$50,000-$100,000', '$100,000+'],
          acordField: 'inventory_value',
          description: 'Value of business inventory and stock'
        }
      ]
    },
    {
      id: 'cyber-liability',
      name: 'Cyber Liability',
      description: 'Protection against data breaches and cyber attacks',
      acordForms: ['ACORD 125'],
      clientTypes: ['business', 'both'],
      category: 'business',
      icon: '💻',
      questions: [
        {
          id: 'data-stored',
          question: 'What type of data do you store? (Select all that apply)',
          type: 'checkbox',
          required: true,
          options: ['Customer Information', 'Payment Information', 'Personal Identifiable Information', 'Health Records', 'Financial Data', 'None'],
          acordField: 'data_types',
          description: 'Types of sensitive data your business handles'
        },
        {
          id: 'data-breach-plan',
          question: 'Do you have a data breach response plan?',
          type: 'select',
          required: true,
          options: ['Yes', 'No', 'In Development'],
          acordField: 'breach_plan',
          description: 'Formal plan for responding to data breaches'
        },
        {
          id: 'cyber-coverage-limit',
          question: 'Desired cyber liability coverage limit?',
          type: 'select',
          required: true,
          options: ['$100,000', '$250,000', '$500,000', '$1,000,000', '$2,000,000+'],
          acordField: 'cyber_limit',
          description: 'Amount of cyber liability protection needed'
        }
      ]
    },

    // ADDITIONAL INSURANCE
    {
      id: 'umbrella',
      name: 'Umbrella Insurance',
      description: 'Additional liability protection beyond primary policies',
      acordForms: ['ACORD 125'],
      clientTypes: ['personal', 'business', 'both'],
      category: 'additional',
      icon: '☂️',
      questions: [
        {
          id: 'umbrella-limit',
          question: 'Desired umbrella coverage limit?',
          type: 'select',
          required: true,
          options: ['$1,000,000', '$2,000,000', '$5,000,000', '$10,000,000+'],
          acordField: 'umbrella_limit',
          description: 'Additional liability protection amount'
        },
        {
          id: 'existing-policies',
          question: 'What existing policies do you have? (Select all that apply)',
          type: 'checkbox',
          required: true,
          options: ['Auto Insurance', 'Homeowners Insurance', 'General Liability', 'Other'],
          acordField: 'existing_policies',
          description: 'Current insurance policies'
        }
      ]
    },
    {
      id: 'life',
      name: 'Life Insurance',
      description: 'Protection for your family\'s financial future',
      acordForms: ['ACORD 125'],
      clientTypes: ['personal', 'both'],
      category: 'additional',
      icon: '❤️',
      questions: [
        {
          id: 'life-coverage-amount',
          question: 'Desired life insurance coverage amount?',
          type: 'select',
          required: true,
          options: ['$100,000', '$250,000', '$500,000', '$1,000,000', '$2,000,000+'],
          acordField: 'life_coverage_amount',
          description: 'Amount of life insurance coverage needed'
        },
        {
          id: 'life-insurance-type',
          question: 'Type of life insurance?',
          type: 'select',
          required: true,
          options: ['Term Life', 'Whole Life', 'Universal Life', 'Not Sure'],
          acordField: 'life_insurance_type',
          description: 'Type of life insurance policy'
        }
      ]
    },
    {
      id: 'pet',
      name: 'Pet Insurance',
      description: 'Coverage for veterinary expenses and pet care',
      acordForms: ['ACORD 125'],
      clientTypes: ['personal', 'both'],
      category: 'additional',
      icon: '🐕',
      questions: [
        {
          id: 'pet-count',
          question: 'Number of pets to insure?',
          type: 'number',
          required: true,
          validation: { min: 1, max: 10 },
          acordField: 'pet_count',
          description: 'Number of pets needing insurance'
        },
        {
          id: 'pet-types',
          question: 'Types of pets? (Select all that apply)',
          type: 'checkbox',
          required: true,
          options: ['Dog', 'Cat', 'Bird', 'Reptile', 'Other'],
          acordField: 'pet_types',
          description: 'Types of pets you own'
        }
      ]
    }
  ];

  public getCoverageTypes(clientType?: ClientType): CoverageType[] {
    if (!clientType) {
      return this.coverageTypes;
    }
    return this.coverageTypes.filter(coverage =>
      coverage.clientTypes.includes(clientType)
    );
  }

  public getCoverageTypesByCategory(clientType?: ClientType): Record<string, CoverageType[]> {
    const coverageTypes = this.getCoverageTypes(clientType);
    const categorized: Record<string, CoverageType[]> = {
      vehicle: [],
      property: [],
      business: [],
      additional: []
    };

    coverageTypes.forEach(coverage => {
      categorized[coverage.category].push(coverage);
    });

    return categorized;
  }

  public getCoverageTypeById(id: string): CoverageType | undefined {
    return this.coverageTypes.find(coverage => coverage.id === id);
  }

  public getQuestionsForCoverages(coverageIds: string[], clientType?: ClientType): CoverageQuestion[] {
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

  public getCoverageCategories(): string[] {
    return ['vehicle', 'property', 'business', 'additional'];
  }

  public getCategoryDisplayName(category: string): string {
    const categoryNames: Record<string, string> = {
      vehicle: 'Vehicle Insurance',
      property: 'Property Insurance', 
      business: 'Business Insurance',
      additional: 'Additional Insurance'
    };
    return categoryNames[category] || category;
  }
}

export const coverageQuestionsService = new CoverageQuestionsService();