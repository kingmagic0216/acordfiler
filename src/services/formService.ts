// Form submission service for handling customer intake forms
export interface BusinessInfo {
  name: string;
  federalId: string;
  businessType: string;
  yearsInBusiness: number;
  description: string;
  website?: string;
}

export interface ContactInfo {
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface CoverageInfo {
  coverageTypes: string[];
  documents?: File[];
  coverageResponses?: Record<string, any>; // Coverage-specific question responses
}

export interface FormSubmission {
  id: string;
  businessInfo: BusinessInfo;
  contactInfo: ContactInfo;
  coverageInfo: CoverageInfo;
  status: 'new' | 'review' | 'signature' | 'completed';
  priority: 'low' | 'medium' | 'high';
  submittedAt: Date;
  brokerId?: string;
}

class FormService {
  private submissions: FormSubmission[] = [];
  private nextId = 1;

  constructor() {
    this.initializeDemoData();
  }

  // Initialize with demo data for testing
  private initializeDemoData(): void {
    const demoSubmissions: FormSubmission[] = [
      {
        id: 'SUB-001',
        businessInfo: {
          name: 'TechStart Solutions LLC',
          federalId: '12-3456789',
          businessType: 'llc',
          yearsInBusiness: 3,
          description: 'Software development and IT consulting services',
          website: 'https://techstartsolutions.com'
        },
        contactInfo: {
          contactName: 'Sarah Johnson',
          email: 'sarah@techstartsolutions.com',
          phone: '(555) 123-4567',
          address: '123 Innovation Drive',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94105'
        },
        coverageInfo: {
          coverageTypes: ['General Liability', 'Cyber Liability', 'Professional Liability'],
          coverageResponses: {
            'generalLiabilityLimit': '$2,000,000',
            'cyberLiabilityLimit': '$1,000,000',
            'professionalLiabilityLimit': '$1,000,000',
            'hasDataBreachPlan': 'Yes',
            'employeeCount': '25',
            'annualRevenue': '$2,500,000'
          }
        },
        status: 'new',
        priority: 'high',
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        brokerId: 'broker-001'
      },
      {
        id: 'SUB-002',
        businessInfo: {
          name: 'Downtown Restaurant Group',
          federalId: '98-7654321',
          businessType: 'corporation',
          yearsInBusiness: 8,
          description: 'Full-service restaurant with bar and catering services',
          website: 'https://downtownrestaurant.com'
        },
        contactInfo: {
          contactName: 'Lisa Chen',
          email: 'lisa@downtownrestaurant.com',
          phone: '(555) 987-6543',
          address: '456 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001'
        },
        coverageInfo: {
          coverageTypes: ['General Liability', 'Property Insurance', 'Workers\' Compensation'],
          coverageResponses: {
            'generalLiabilityLimit': '$1,000,000',
            'propertyValue': '$500,000',
            'employeeCount': '15',
            'hasLiquorLiability': 'Yes',
            'annualRevenue': '$1,200,000',
            'hasSprinklerSystem': 'Yes'
          }
        },
        status: 'review',
        priority: 'medium',
        submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        brokerId: 'broker-001'
      },
      {
        id: 'SUB-003',
        businessInfo: {
          name: 'Green Earth Landscaping',
          federalId: '45-6789012',
          businessType: 'llc',
          yearsInBusiness: 12,
          description: 'Commercial and residential landscaping services',
          website: 'https://greenearthlandscaping.com'
        },
        contactInfo: {
          contactName: 'Mike Wilson',
          email: 'mike@greenearthlandscaping.com',
          phone: '(555) 456-7890',
          address: '789 Garden Way',
          city: 'Austin',
          state: 'TX',
          zipCode: '78701'
        },
        coverageInfo: {
          coverageTypes: ['General Liability', 'Commercial Auto', 'Workers\' Compensation'],
          coverageResponses: {
            'generalLiabilityLimit': '$2,000,000',
            'vehicleCount': '8',
            'employeeCount': '22',
            'hasEquipmentInsurance': 'Yes',
            'annualRevenue': '$800,000',
            'usesPesticides': 'Yes'
          }
        },
        status: 'completed',
        priority: 'low',
        submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        brokerId: 'broker-001'
      },
      {
        id: 'SUB-004',
        businessInfo: {
          name: 'ABC Insurance Agency',
          federalId: '78-9012345',
          businessType: 'corporation',
          yearsInBusiness: 15,
          description: 'Independent insurance agency providing personal and commercial lines',
          website: 'https://abcinsurance.com'
        },
        contactInfo: {
          contactName: 'John Smith',
          email: 'john@abcinsurance.com',
          phone: '(555) 234-5678',
          address: '321 Business Plaza',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60601'
        },
        coverageInfo: {
          coverageTypes: ['Professional Liability', 'Cyber Liability', 'General Liability'],
          coverageResponses: {
            'professionalLiabilityLimit': '$1,000,000',
            'cyberLiabilityLimit': '$500,000',
            'hasErrorsOmissions': 'Yes',
            'employeeCount': '8',
            'annualRevenue': '$1,500,000',
            'hasClientDataProtection': 'Yes'
          }
        },
        status: 'signature',
        priority: 'medium',
        submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        brokerId: 'broker-001'
      },
      {
        id: 'SUB-005',
        businessInfo: {
          name: 'Metro Construction Co.',
          federalId: '34-5678901',
          businessType: 'llc',
          yearsInBusiness: 6,
          description: 'Commercial construction and renovation services',
          website: 'https://metroconstruction.com'
        },
        contactInfo: {
          contactName: 'Robert Martinez',
          email: 'robert@metroconstruction.com',
          phone: '(555) 345-6789',
          address: '567 Industrial Blvd',
          city: 'Miami',
          state: 'FL',
          zipCode: '33101'
        },
        coverageInfo: {
          coverageTypes: ['General Liability', 'Commercial Auto', 'Workers\' Compensation', 'Property Insurance'],
          coverageResponses: {
            'generalLiabilityLimit': '$5,000,000',
            'vehicleCount': '12',
            'employeeCount': '45',
            'propertyValue': '$2,000,000',
            'annualRevenue': '$5,000,000',
            'hasBonding': 'Yes'
          }
        },
        status: 'new',
        priority: 'high',
        submittedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        brokerId: 'broker-001'
      }
    ];

    // Only add demo data if no submissions exist in localStorage
    const existingData = localStorage.getItem('acord_submissions');
    if (!existingData) {
      this.submissions = demoSubmissions;
      this.nextId = 6; // Start next ID after demo data
      this.saveToStorage();
    }
  }

  // Generate unique submission ID
  private generateId(): string {
    return `SUB-${String(this.nextId++).padStart(3, '0')}`;
  }

  // Submit a new form
  async submitForm(
    businessInfo: BusinessInfo,
    contactInfo: ContactInfo,
    coverageInfo: CoverageInfo
  ): Promise<FormSubmission> {
    const submission: FormSubmission = {
      id: this.generateId(),
      businessInfo,
      contactInfo,
      coverageInfo,
      status: 'new',
      priority: this.calculatePriority(coverageInfo.coverageTypes),
      submittedAt: new Date(),
    };

    this.submissions.push(submission);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Store in localStorage for persistence
    this.saveToStorage();
    
    return submission;
  }

  // Get all submissions
  async getSubmissions(): Promise<FormSubmission[]> {
    this.loadFromStorage();
    return [...this.submissions];
  }

  // Get submission by ID
  async getSubmission(id: string): Promise<FormSubmission | null> {
    this.loadFromStorage();
    return this.submissions.find(sub => sub.id === id) || null;
  }

  // Update submission status
  async updateSubmissionStatus(id: string, status: FormSubmission['status']): Promise<boolean> {
    this.loadFromStorage();
    const submission = this.submissions.find(sub => sub.id === id);
    if (submission) {
      submission.status = status;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Calculate priority based on coverage types
  private calculatePriority(coverageTypes: string[]): 'low' | 'medium' | 'high' {
    const highPriorityTypes = ['Cyber Liability', 'Umbrella/Excess'];
    const mediumPriorityTypes = ['Commercial Property', 'Workers\' Compensation'];
    
    if (coverageTypes.some(type => highPriorityTypes.includes(type))) {
      return 'high';
    }
    if (coverageTypes.some(type => mediumPriorityTypes.includes(type))) {
      return 'medium';
    }
    return 'low';
  }

  // Save to localStorage
  private saveToStorage(): void {
    try {
      localStorage.setItem('acord_submissions', JSON.stringify(this.submissions));
    } catch (error) {
      console.error('Failed to save submissions to localStorage:', error);
    }
  }

  // Load from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('acord_submissions');
      if (stored) {
        this.submissions = JSON.parse(stored).map((sub: any) => ({
          ...sub,
          submittedAt: new Date(sub.submittedAt)
        }));
      }
    } catch (error) {
      console.error('Failed to load submissions from localStorage:', error);
    }
  }

  // Generate ACORD form data
  generateACORDData(submission: FormSubmission, formType: string): any {
    const { businessInfo, contactInfo, coverageInfo } = submission;
    
    const baseData = {
      submissionId: submission.id,
      formType,
      businessName: businessInfo.name,
      federalId: businessInfo.federalId,
      businessType: businessInfo.businessType,
      yearsInBusiness: businessInfo.yearsInBusiness,
      businessDescription: businessInfo.description,
      website: businessInfo.website,
      contactName: contactInfo.contactName,
      email: contactInfo.email,
      phone: contactInfo.phone,
      address: contactInfo.address,
      city: contactInfo.city,
      state: contactInfo.state,
      zipCode: contactInfo.zipCode,
      coverageTypes: coverageInfo.coverageTypes,
      submittedAt: submission.submittedAt.toISOString(),
    };

    // Add form-specific fields based on ACORD form type
    switch (formType) {
      case 'ACORD 125':
        return {
          ...baseData,
          applicationType: 'Commercial Insurance',
          effectiveDate: new Date().toISOString().split('T')[0],
        };
      case 'ACORD 126':
        return {
          ...baseData,
          applicationType: 'General Liability',
          effectiveDate: new Date().toISOString().split('T')[0],
        };
      case 'ACORD 127':
        return {
          ...baseData,
          applicationType: 'Business Auto',
          effectiveDate: new Date().toISOString().split('T')[0],
        };
      case 'ACORD 130':
        return {
          ...baseData,
          applicationType: 'Workers Compensation',
          effectiveDate: new Date().toISOString().split('T')[0],
        };
      case 'ACORD 140':
        return {
          ...baseData,
          applicationType: 'Property',
          effectiveDate: new Date().toISOString().split('T')[0],
        };
      default:
        return baseData;
    }
  }
}

export const formService = new FormService();
