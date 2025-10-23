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
      acordForms: ['ACORD 125', 'ACORD 129'],
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
          id: 'vehicle-year',
          question: 'What year is your primary vehicle?',
          type: 'number',
          required: true,
          validation: { min: 1990, max: new Date().getFullYear() + 1 },
          acordField: 'vehicle_year',
          description: 'Model year of your primary vehicle'
        },
        {
          id: 'vehicle-make',
          question: 'What is the make of your primary vehicle?',
          type: 'text',
          required: true,
          placeholder: 'e.g., Ford, Toyota, Honda',
          acordField: 'vehicle_make',
          description: 'Manufacturer of your primary vehicle'
        },
        {
          id: 'vehicle-model',
          question: 'What is the model of your primary vehicle?',
          type: 'text',
          required: true,
          placeholder: 'e.g., F-150, Camry, Civic',
          acordField: 'vehicle_model',
          description: 'Model name of your primary vehicle'
        },
        {
          id: 'vehicle-vin',
          question: 'What is the VIN of your primary vehicle?',
          type: 'text',
          required: false,
          placeholder: '17-character Vehicle Identification Number',
          validation: { pattern: '^[A-HJ-NPR-Z0-9]{17}$' },
          acordField: 'vehicle_vin',
          description: 'Vehicle Identification Number (optional but recommended)'
        },
        {
          id: 'vehicle-body-type',
          question: 'What is the body type of your primary vehicle?',
          type: 'select',
          required: true,
          options: ['Sedan', 'SUV', 'Truck', 'Coupe', 'Convertible', 'Hatchback', 'Wagon', 'Van', 'Other'],
          acordField: 'vehicle_body_type',
          description: 'Body style of your primary vehicle'
        },
        {
          id: 'vehicle-registration-state',
          question: 'In which state is your vehicle registered?',
          type: 'select',
          required: true,
          options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'],
          acordField: 'vehicle_registration_state',
          description: 'State where your vehicle is registered'
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
        },
        {
          id: 'previous-carrier',
          question: 'Who is your current auto insurance carrier?',
          type: 'text',
          required: false,
          placeholder: 'e.g., State Farm, GEICO, Allstate',
          acordField: 'previous_carrier',
          description: 'Current or most recent auto insurance company'
        },
        {
          id: 'current-policy-number',
          question: 'Current policy number (if applicable)',
          type: 'text',
          required: false,
          placeholder: 'Policy number',
          acordField: 'current_policy_number',
          description: 'Your current auto insurance policy number'
        },
        {
          id: 'garaging-address',
          question: 'Where is your vehicle garaged/parked?',
          type: 'text',
          required: true,
          placeholder: 'Street address where vehicle is parked',
          acordField: 'garaging_address',
          description: 'Primary location where your vehicle is parked overnight'
        },
        {
          id: 'vehicle-usage',
          question: 'How do you primarily use your vehicle?',
          type: 'select',
          required: true,
          options: ['Pleasure only', 'Commuting to work', 'Business use', 'Farm use', 'Other'],
          acordField: 'vehicle_usage',
          description: 'Primary purpose for using your vehicle'
        },
        {
          id: 'desired-liability-limits',
          question: 'What liability coverage limits do you want?',
          type: 'select',
          required: true,
          options: ['State minimum', '$25,000/$50,000', '$50,000/$100,000', '$100,000/$300,000', '$250,000/$500,000', '$500,000/$1,000,000'],
          acordField: 'liability_limits',
          description: 'Bodily injury and property damage liability limits'
        },
        {
          id: 'collision-comprehensive',
          question: 'Do you want collision and comprehensive coverage?',
          type: 'select',
          required: true,
          options: ['Yes, both', 'Collision only', 'Comprehensive only', 'No, liability only'],
          acordField: 'physical_damage_coverage',
          description: 'Coverage for damage to your own vehicle'
        },
        {
          id: 'deductible-preference',
          question: 'What deductible amount do you prefer?',
          type: 'select',
          required: true,
          options: ['$250', '$500', '$1,000', '$2,500', '$5,000'],
          acordField: 'deductible_amount',
          description: 'Amount you pay out-of-pocket before insurance covers damage'
        },
        {
          id: 'primary-driver-license-number',
          question: 'Primary driver\'s license number',
          type: 'text',
          required: true,
          placeholder: 'Driver\'s license number',
          acordField: 'primary_driver_license_number',
          description: 'Driver\'s license number of the primary driver'
        },
        {
          id: 'primary-driver-license-state',
          question: 'Primary driver\'s license state',
          type: 'select',
          required: true,
          options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'],
          acordField: 'primary_driver_license_state',
          description: 'State that issued the primary driver\'s license'
        },
        {
          id: 'primary-driver-license-issue-date',
          question: 'Primary driver\'s license issue date',
          type: 'text',
          required: true,
          placeholder: 'MM/DD/YYYY',
          acordField: 'primary_driver_license_issue_date',
          description: 'Date the primary driver\'s license was issued'
        },
        {
          id: 'primary-driver-date-of-birth',
          question: 'Primary driver\'s date of birth',
          type: 'text',
          required: true,
          placeholder: 'MM/DD/YYYY',
          acordField: 'primary_driver_date_of_birth',
          description: 'Date of birth of the primary driver'
        },
        {
          id: 'primary-driver-gender',
          question: 'Primary driver\'s gender',
          type: 'select',
          required: true,
          options: ['Male', 'Female', 'Other', 'Prefer not to answer'],
          acordField: 'primary_driver_gender',
          description: 'Gender of the primary driver'
        },
        {
          id: 'primary-driver-marital-status',
          question: 'Primary driver\'s marital status',
          type: 'select',
          required: true,
          options: ['Single', 'Married', 'Divorced', 'Widowed', 'Separated'],
          acordField: 'primary_driver_marital_status',
          description: 'Marital status of the primary driver'
        },
        {
          id: 'vehicle-purchase-price',
          question: 'What was the purchase price of your primary vehicle?',
          type: 'select',
          required: true,
          options: ['Under $5,000', '$5,000-$10,000', '$10,000-$15,000', '$15,000-$25,000', '$25,000-$35,000', '$35,000-$50,000', '$50,000+'],
          acordField: 'vehicle_purchase_price',
          description: 'Original purchase price of your primary vehicle'
        },
        {
          id: 'vehicle-purchase-date',
          question: 'When did you purchase your primary vehicle?',
          type: 'text',
          required: true,
          placeholder: 'MM/DD/YYYY',
          acordField: 'vehicle_purchase_date',
          description: 'Date you purchased your primary vehicle'
        },
        {
          id: 'vehicle-financing',
          question: 'How is your primary vehicle financed?',
          type: 'select',
          required: true,
          options: ['Owned outright', 'Financed through bank/credit union', 'Financed through dealer', 'Leased', 'Other'],
          acordField: 'vehicle_financing',
          description: 'How your primary vehicle is financed'
        },
        {
          id: 'lienholder-name',
          question: 'Lienholder name (if financed)',
          type: 'text',
          required: false,
          placeholder: 'Bank or financial institution name',
          acordField: 'lienholder_name',
          description: 'Name of the bank or financial institution that holds the lien'
        },
        {
          id: 'vehicle-modifications',
          question: 'Does your vehicle have any modifications?',
          type: 'select',
          required: true,
          options: ['No modifications', 'Performance modifications', 'Custom paint/body work', 'Audio/video equipment', 'Wheel/tire upgrades', 'Other'],
          acordField: 'vehicle_modifications',
          description: 'Any aftermarket modifications to your vehicle'
        },
        {
          id: 'vehicle-storage-type',
          question: 'How is your vehicle stored?',
          type: 'select',
          required: true,
          options: ['Garage', 'Carport', 'Driveway', 'Street parking', 'Parking lot', 'Other'],
          acordField: 'vehicle_storage_type',
          description: 'Where your vehicle is typically parked'
        },
        {
          id: 'prior-insurance-cancellation',
          question: 'Have you ever had insurance cancelled or non-renewed?',
          type: 'select',
          required: true,
          options: ['No', 'Yes, cancelled for non-payment', 'Yes, cancelled for violations', 'Yes, non-renewed', 'Yes, other reason'],
          acordField: 'prior_insurance_cancellation',
          description: 'Any prior insurance cancellations or non-renewals'
        },
        {
          id: 'prior-insurance-lapse',
          question: 'Have you ever had a gap in insurance coverage?',
          type: 'select',
          required: true,
          options: ['No', 'Yes, less than 30 days', 'Yes, 30-90 days', 'Yes, more than 90 days'],
          acordField: 'prior_insurance_lapse',
          description: 'Any periods without insurance coverage'
        },
        {
          id: 'prior-insurance-claims',
          question: 'Any insurance claims in the past 5 years?',
          type: 'select',
          required: true,
          options: ['None', '1 claim', '2 claims', '3+ claims'],
          acordField: 'prior_insurance_claims',
          description: 'Previous insurance claims history'
        },
        {
          id: 'desired-policy-term',
          question: 'What policy term do you prefer?',
          type: 'select',
          required: true,
          options: ['6 months', '12 months'],
          acordField: 'desired_policy_term',
          description: 'Length of the insurance policy term'
        },
        {
          id: 'desired-effective-date',
          question: 'When would you like coverage to start?',
          type: 'select',
          required: true,
          options: ['Immediately', 'Next week', 'Next month', 'Specific date'],
          acordField: 'desired_effective_date',
          description: 'When you want your insurance coverage to begin'
        },
        {
          id: 'payment-method-preference',
          question: 'How would you like to pay for your insurance?',
          type: 'select',
          required: true,
          options: ['Monthly', 'Quarterly', 'Semi-annually', 'Annually'],
          acordField: 'payment_method_preference',
          description: 'Preferred payment frequency for your insurance'
        }
      ]
    },
    {
      id: 'motorcycle',
      name: 'Motorcycle Insurance',
      description: 'Coverage for motorcycles, scooters, and off-road vehicles',
      acordForms: ['ACORD 125', 'ACORD 127'],
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
      acordForms: ['ACORD 125', 'ACORD 127'],
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
      acordForms: ['ACORD 125', 'ACORD 140'],
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
      acordForms: ['ACORD 127', 'ACORD 125', 'ACORD 137'],
      clientTypes: ['business', 'both'],
      category: 'vehicle',
      icon: '🚛',
      questions: [
        {
          id: 'commercial-vehicle-count',
          question: 'Number of commercial vehicles?',
          type: 'number',
          required: true,
          validation: { min: 1, max: 100 },
          acordField: 'commercial_vehicle_count',
          description: 'Vehicles used for business purposes'
        },
        {
          id: 'commercial-auto-symbol',
          question: 'What type of commercial auto coverage do you need?',
          type: 'select',
          required: true,
          options: ['Any Auto', 'Owned Autos Only', 'Owned Private Passenger Autos Only', 'Owned Autos Other Than Private Passenger', 'Specifically Described Autos', 'Hired Autos Only', 'Non-Owned Autos Only'],
          acordField: 'commercial_auto_symbol',
          description: 'Type of commercial auto coverage needed'
        },
        {
          id: 'commercial-vehicle-types',
          question: 'Types of commercial vehicles? (Select all that apply)',
          type: 'checkbox',
          required: true,
          options: ['Cars', 'Vans', 'Trucks', 'Semi-Trucks', 'Buses', 'Motorcycles', 'Other'],
          acordField: 'commercial_vehicle_types',
          description: 'Types of vehicles used for business'
        },
        {
          id: 'commercial-annual-miles',
          question: 'Estimated annual business miles driven?',
          type: 'select',
          required: true,
          options: ['Under 10,000', '10,000-25,000', '25,000-50,000', '50,000-100,000', '100,000+'],
          acordField: 'business_annual_miles',
          description: 'Total annual mileage for business use'
        },
        {
          id: 'commercial-driver-count',
          question: 'Number of commercial drivers?',
          type: 'number',
          required: true,
          validation: { min: 1, max: 100 },
          acordField: 'commercial_driver_count',
          description: 'Employees who drive for business purposes'
        },
        {
          id: 'bodily-injury-limit',
          question: 'Desired bodily injury liability limit per person?',
          type: 'select',
          required: true,
          options: ['$25,000', '$50,000', '$100,000', '$250,000', '$500,000', '$1,000,000+'],
          acordField: 'bodily_injury_limit',
          description: 'Bodily injury liability limit per person'
        },
        {
          id: 'property-damage-limit',
          question: 'Desired property damage liability limit per accident?',
          type: 'select',
          required: true,
          options: ['$25,000', '$50,000', '$100,000', '$250,000', '$500,000', '$1,000,000+'],
          acordField: 'property_damage_limit',
          description: 'Property damage liability limit per accident'
        }
      ]
    },

    // PROPERTY INSURANCE (Personal & Business)
    {
      id: 'homeowners',
      name: 'Homeowners Insurance',
      description: 'Protection for your home, personal property, and liability',
      acordForms: ['ACORD 125', 'ACORD 140'],
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
        },
        {
          id: 'construction-type',
          question: 'What is the construction type of your home?',
          type: 'select',
          required: true,
          options: ['Frame', 'Brick', 'Masonry', 'Steel', 'Concrete', 'Other'],
          acordField: 'construction_type',
          description: 'Primary building material used in construction'
        },
        {
          id: 'square-footage',
          question: 'What is the square footage of your home?',
          type: 'number',
          required: true,
          validation: { min: 500, max: 50000 },
          acordField: 'square_footage',
          description: 'Total living area in square feet'
        },
        {
          id: 'number-stories',
          question: 'How many stories is your home?',
          type: 'select',
          required: true,
          options: ['1 story', '2 stories', '3+ stories', 'Split level'],
          acordField: 'number_stories',
          description: 'Number of floors in your home'
        },
        {
          id: 'roof-type',
          question: 'What type of roof does your home have?',
          type: 'select',
          required: true,
          options: ['Asphalt shingles', 'Metal', 'Tile', 'Slate', 'Wood shingles', 'Flat', 'Other'],
          acordField: 'roof_type',
          description: 'Primary roofing material'
        },
        {
          id: 'roof-age',
          question: 'How old is your roof?',
          type: 'select',
          required: true,
          options: ['Less than 5 years', '5-10 years', '10-15 years', '15-20 years', '20+ years', 'Unknown'],
          acordField: 'roof_age',
          description: 'Age of your current roof'
        },
        {
          id: 'heating-system',
          question: 'What type of heating system do you have?',
          type: 'select',
          required: true,
          options: ['Forced air', 'Radiant heat', 'Heat pump', 'Baseboard', 'Wood stove', 'Other'],
          acordField: 'heating_system',
          description: 'Primary heating system type'
        },
        {
          id: 'security-system',
          question: 'Do you have a security system?',
          type: 'select',
          required: true,
          options: ['Yes, monitored', 'Yes, unmonitored', 'No'],
          acordField: 'security_system',
          description: 'Home security and alarm system'
        },
        {
          id: 'smoke-detectors',
          question: 'What type of smoke detectors do you have?',
          type: 'select',
          required: true,
          options: ['Hardwired', 'Battery operated', 'Both', 'None'],
          acordField: 'smoke_detectors',
          description: 'Smoke detection system type'
        },
        {
          id: 'swimming-pool',
          question: 'Do you have a swimming pool?',
          type: 'select',
          required: true,
          options: ['No', 'Yes, in-ground', 'Yes, above-ground', 'Yes, hot tub/spa'],
          acordField: 'swimming_pool',
          description: 'Swimming pool or hot tub on property'
        },
        {
          id: 'trampoline',
          question: 'Do you have a trampoline?',
          type: 'select',
          required: true,
          options: ['No', 'Yes'],
          acordField: 'trampoline',
          description: 'Trampoline on property'
        },
        {
          id: 'dog-ownership',
          question: 'Do you own any dogs?',
          type: 'select',
          required: true,
          options: ['No', 'Yes, no bite history', 'Yes, with bite history'],
          acordField: 'dog_ownership',
          description: 'Dog ownership and bite history'
        },
        {
          id: 'previous-homeowner-carrier',
          question: 'Who is your current homeowners insurance carrier?',
          type: 'text',
          required: false,
          placeholder: 'e.g., State Farm, Allstate, Farmers',
          acordField: 'previous_homeowner_carrier',
          description: 'Current or most recent homeowners insurance company'
        },
        {
          id: 'previous-homeowner-claims',
          question: 'Any homeowners insurance claims in the past 5 years?',
          type: 'select',
          required: true,
          options: ['None', '1 claim', '2 claims', '3+ claims'],
          acordField: 'previous_homeowner_claims',
          description: 'Previous homeowners insurance claims history'
        },
        {
          id: 'property-security-features',
          question: 'What security features does your property have?',
          type: 'checkbox',
          required: true,
          options: ['Alarm system', 'Security cameras', 'Gated community', 'Security guard', 'Motion sensors', 'None'],
          acordField: 'property_security_features',
          description: 'Security measures in place at your property'
        },
        {
          id: 'property-maintenance',
          question: 'Recent property maintenance or upgrades?',
          type: 'select',
          required: true,
          options: ['None in past 5 years', 'Roof replacement', 'HVAC upgrade', 'Electrical upgrade', 'Plumbing upgrade', 'Kitchen renovation', 'Bathroom renovation', 'Other'],
          acordField: 'property_maintenance',
          description: 'Recent maintenance or upgrades to your property'
        },
        {
          id: 'property-hazards',
          question: 'Any additional hazards on your property?',
          type: 'checkbox',
          required: true,
          options: ['None', 'Aggressive dog breeds', 'Trampoline', 'Swimming pool', 'Hot tub', 'Fireplace', 'Wood stove', 'Other'],
          acordField: 'property_hazards',
          description: 'Additional hazards or features on your property'
        },
        {
          id: 'mortgagee-information',
          question: 'Do you have a mortgage on this property?',
          type: 'select',
          required: true,
          options: ['No mortgage', 'Yes, conventional mortgage', 'Yes, FHA mortgage', 'Yes, VA mortgage', 'Yes, other'],
          acordField: 'mortgagee_information',
          description: 'Mortgage information for the property'
        },
        {
          id: 'mortgagee-name',
          question: 'Mortgagee name (if applicable)',
          type: 'text',
          required: false,
          placeholder: 'Bank or mortgage company name',
          acordField: 'mortgagee_name',
          description: 'Name of the mortgage company or bank'
        },
        {
          id: 'billing-address-different',
          question: 'Is your billing address different from property address?',
          type: 'select',
          required: true,
          options: ['No, same address', 'Yes, different address'],
          acordField: 'billing_address_different',
          description: 'Whether billing address differs from property address'
        },
        {
          id: 'billing-address',
          question: 'Billing address (if different)',
          type: 'text',
          required: false,
          placeholder: 'Street address, City, State, ZIP',
          acordField: 'billing_address',
          description: 'Address where bills should be sent'
        },
        {
          id: 'homeowners-policy-term',
          question: 'What policy term do you prefer?',
          type: 'select',
          required: true,
          options: ['12 months', '24 months', '36 months'],
          acordField: 'homeowners_policy_term',
          description: 'Length of the homeowners insurance policy term'
        },
        {
          id: 'homeowners-effective-date',
          question: 'When would you like coverage to start?',
          type: 'select',
          required: true,
          options: ['Immediately', 'Next week', 'Next month', 'Specific date'],
          acordField: 'homeowners_effective_date',
          description: 'When you want your homeowners insurance coverage to begin'
        },
        {
          id: 'homeowners-payment-method',
          question: 'How would you like to pay for your homeowners insurance?',
          type: 'select',
          required: true,
          options: ['Monthly', 'Quarterly', 'Semi-annually', 'Annually'],
          acordField: 'homeowners_payment_method',
          description: 'Preferred payment frequency for your homeowners insurance'
        }
      ]
    },
    {
      id: 'renters',
      name: 'Renters Insurance',
      description: 'Protection for personal property and liability while renting',
      acordForms: ['ACORD 125', 'ACORD 140'],
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
      acordForms: ['ACORD 125', 'ACORD 140'],
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
      acordForms: ['ACORD 125', 'ACORD 140'],
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
          id: 'business-classification',
          question: 'What is your primary business classification?',
          type: 'select',
          required: true,
          options: ['Office/Clerical', 'Retail', 'Construction', 'Manufacturing', 'Healthcare', 'Food Service', 'Professional Services', 'Technology', 'Real Estate', 'Transportation', 'Other'],
          acordField: 'business_classification',
          description: 'Primary type of business activity'
        },
        {
          id: 'sic-code',
          question: 'What is your SIC (Standard Industry Classification) code?',
          type: 'text',
          required: true,
          placeholder: 'e.g., 5411 (Legal Services), 7372 (Software)',
          acordField: 'sic_code',
          description: 'Standard Industry Classification code (required for ACORD forms)'
        },
        {
          id: 'naics-code',
          question: 'What is your NAICS (North American Industry Classification) code?',
          type: 'text',
          required: true,
          placeholder: 'e.g., 541110 (Offices of Lawyers), 541511 (Custom Computer Programming)',
          acordField: 'naics_code',
          description: 'North American Industry Classification code (required for ACORD forms)'
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
        },
        {
          id: 'business-location-count',
          question: 'How many business locations do you have?',
          type: 'number',
          required: true,
          validation: { min: 1, max: 50 },
          acordField: 'business_location_count',
          description: 'Number of physical business locations'
        },
        {
          id: 'products-completed-operations',
          question: 'Do you need Products & Completed Operations coverage?',
          type: 'select',
          required: true,
          options: ['Yes', 'No', 'Not Sure'],
          acordField: 'products_completed_operations',
          description: 'Coverage for products you make or work you complete'
        },
        {
          id: 'business-start-date',
          question: 'When did your business start?',
          type: 'text',
          required: true,
          placeholder: 'MM/DD/YYYY',
          acordField: 'business_start_date',
          description: 'Date your business began operations'
        },
        {
          id: 'business-ownership-structure',
          question: 'What is your business ownership structure?',
          type: 'select',
          required: true,
          options: ['Sole Proprietorship', 'Partnership', 'Corporation', 'LLC', 'S-Corporation', 'Non-Profit', 'Other'],
          acordField: 'business_ownership_structure',
          description: 'Legal structure of your business'
        },
        {
          id: 'business-licenses',
          question: 'What licenses does your business have?',
          type: 'checkbox',
          required: true,
          options: ['Business license', 'Professional license', 'Trade license', 'Health department permit', 'Fire department permit', 'Other', 'None required'],
          acordField: 'business_licenses',
          description: 'Required licenses and permits for your business'
        },
        {
          id: 'business-certifications',
          question: 'What certifications does your business have?',
          type: 'checkbox',
          required: true,
          options: ['ISO certification', 'Industry certification', 'Safety certification', 'Quality certification', 'Environmental certification', 'Other', 'None'],
          acordField: 'business_certifications',
          description: 'Professional certifications held by your business'
        },
        {
          id: 'prior-business-insurance',
          question: 'Who was your previous business insurance carrier?',
          type: 'text',
          required: false,
          placeholder: 'e.g., Travelers, Hartford, Liberty Mutual',
          acordField: 'prior_business_insurance',
          description: 'Previous business insurance company'
        },
        {
          id: 'prior-business-claims',
          question: 'Any business insurance claims in the past 5 years?',
          type: 'select',
          required: true,
          options: ['None', '1 claim', '2 claims', '3+ claims'],
          acordField: 'prior_business_claims',
          description: 'Previous business insurance claims history'
        },
        {
          id: 'subcontractor-usage',
          question: 'Do you use subcontractors?',
          type: 'select',
          required: true,
          options: ['No subcontractors', 'Occasionally', 'Regularly', 'Always'],
          acordField: 'subcontractor_usage',
          description: 'Frequency of subcontractor usage'
        },
        {
          id: 'international-operations',
          question: 'Do you have international operations?',
          type: 'select',
          required: true,
          options: ['No international operations', 'Yes, occasional', 'Yes, regular', 'Yes, extensive'],
          acordField: 'international_operations',
          description: 'International business operations'
        },
        {
          id: 'contractual-liability',
          question: 'Do you have contractual liability agreements?',
          type: 'select',
          required: true,
          options: ['No contractual agreements', 'Yes, indemnification agreements', 'Yes, hold harmless agreements', 'Yes, other'],
          acordField: 'contractual_liability',
          description: 'Contractual liability and indemnification agreements'
        },
        {
          id: 'general-liability-policy-term',
          question: 'What policy term do you prefer?',
          type: 'select',
          required: true,
          options: ['12 months', '24 months', '36 months'],
          acordField: 'general_liability_policy_term',
          description: 'Length of the general liability policy term'
        },
        {
          id: 'general-liability-effective-date',
          question: 'When would you like coverage to start?',
          type: 'select',
          required: true,
          options: ['Immediately', 'Next week', 'Next month', 'Specific date'],
          acordField: 'general_liability_effective_date',
          description: 'When you want your general liability coverage to begin'
        },
        {
          id: 'general-liability-payment-method',
          question: 'How would you like to pay for your general liability insurance?',
          type: 'select',
          required: true,
          options: ['Monthly', 'Quarterly', 'Semi-annually', 'Annually'],
          acordField: 'general_liability_payment_method',
          description: 'Preferred payment frequency for your general liability insurance'
        },
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
          id: 'wc-employee-count',
          question: 'Number of employees requiring workers\' compensation?',
          type: 'number',
          required: true,
          validation: { min: 1, max: 1000 },
          acordField: 'wc_employee_count',
          description: 'Employees who need workers\' compensation coverage'
        },
        {
          id: 'annual-payroll',
          question: 'Estimated annual payroll?',
          type: 'select',
          required: true,
          options: ['Under $50,000', '$50,000-$100,000', '$100,000-$250,000', '$250,000-$500,000', '$500,000+'],
          acordField: 'annual_payroll',
          description: 'Total annual payroll for covered employees'
        },
        {
          id: 'wc-business-classification',
          question: 'Primary business classification for workers\' comp?',
          type: 'select',
          required: true,
          options: ['Office/Clerical', 'Retail', 'Construction', 'Manufacturing', 'Healthcare', 'Food Service', 'Professional Services', 'Technology', 'Real Estate', 'Transportation', 'Other'],
          acordField: 'wc_business_classification',
          description: 'Main type of work performed by employees'
        },
        {
          id: 'wc-sic-code',
          question: 'Do you know your SIC code for workers\' comp?',
          type: 'text',
          required: false,
          placeholder: 'e.g., 5411 (Legal Services), 7372 (Software)',
          acordField: 'wc_sic_code',
          description: 'Standard Industry Classification code for workers\' comp (optional)'
        },
        {
          id: 'wc-naics-code',
          question: 'Do you know your NAICS code for workers\' comp?',
          type: 'text',
          required: false,
          placeholder: 'e.g., 541110 (Offices of Lawyers), 541511 (Custom Computer Programming)',
          acordField: 'wc_naics_code',
          description: 'North American Industry Classification code for workers\' comp (optional)'
        },
        {
          id: 'years-in-business',
          question: 'How many years have you been in business?',
          type: 'number',
          required: true,
          validation: { min: 0, max: 100 },
          acordField: 'years_in_business',
          description: 'Number of years your business has been operating'
        },
        {
          id: 'highest-floor-count',
          question: 'What is the highest floor of your business location?',
          type: 'number',
          required: false,
          validation: { min: 1, max: 100 },
          acordField: 'highest_floor_count',
          description: 'Highest floor number of your business location (optional)'
        },
        {
          id: 'business-county',
          question: 'What county is your business located in?',
          type: 'text',
          required: true,
          placeholder: 'e.g., Los Angeles County, Cook County',
          acordField: 'business_county',
          description: 'County where your business is located'
        }
      ]
    },
    {
      id: 'property',
      name: 'Business Property',
      description: 'Coverage for business property, equipment, and inventory',
      acordForms: ['ACORD 140', 'ACORD 125', 'ACORD 24', 'ACORD 160'],
      clientTypes: ['business', 'both'],
      category: 'business',
      icon: '🏭',
      questions: [
        {
          id: 'business-property-value',
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
          options: ['Owned Building', 'Leased Space', 'Home Office', 'Warehouse', 'Retail Space', 'Manufacturing Facility', 'Office Building', 'Other'],
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
        },
        {
          id: 'building-description',
          question: 'Describe your business building/property',
          type: 'textarea',
          required: true,
          placeholder: 'Describe the building type, construction materials, age, etc.',
          acordField: 'building_description',
          description: 'Detailed description of your business property'
        },
        {
          id: 'property-address',
          question: 'What is the address of your business property?',
          type: 'text',
          required: true,
          placeholder: 'Street address, City, State, ZIP',
          acordField: 'property_address',
          description: 'Physical address of your business property'
        },
        {
          id: 'property-county',
          question: 'What county is your business property in?',
          type: 'text',
          required: true,
          placeholder: 'e.g., Los Angeles County, Cook County',
          acordField: 'property_county',
          description: 'County where your business property is located'
        },
        {
          id: 'hazardous-materials',
          question: 'Do your operations involve storing, treating, discharging, applying, disposing, or transporting hazardous materials?',
          type: 'select',
          required: true,
          options: ['Yes', 'No', 'Not Sure'],
          acordField: 'hazardous_materials',
          description: 'Whether your business handles hazardous materials'
        },
        {
          id: 'athletic-teams',
          question: 'Do you sponsor athletic teams?',
          type: 'select',
          required: true,
          options: ['Yes', 'No'],
          acordField: 'athletic_teams',
          description: 'Whether your business sponsors athletic teams'
        }
      ]
    },
    {
      id: 'cyber-liability',
      name: 'Cyber Liability',
      description: 'Protection against data breaches and cyber attacks',
      acordForms: ['ACORD 126', 'ACORD 125'],
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
        },
        {
          id: 'cyber-security-measures',
          question: 'What cybersecurity measures do you have in place? (Select all that apply)',
          type: 'checkbox',
          required: true,
          options: ['Firewall', 'Antivirus Software', 'Data Encryption', 'Regular Backups', 'Employee Training', 'Incident Response Plan', 'None'],
          acordField: 'cyber_security_measures',
          description: 'Current cybersecurity protections'
        },
        {
          id: 'previous-data-breaches',
          question: 'Have you experienced any data breaches in the past 3 years?',
          type: 'select',
          required: true,
          options: ['No', 'Yes - Minor', 'Yes - Major', 'Prefer not to say'],
          acordField: 'previous_breaches',
          description: 'History of data security incidents'
        }
      ]
    },

    // ADDITIONAL INSURANCE
    {
      id: 'umbrella',
      name: 'Umbrella Insurance',
      description: 'Additional liability protection beyond primary policies',
      acordForms: ['ACORD 125', 'ACORD 126'],
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
      acordForms: ['ACORD 125', 'ACORD 140'],
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
      acordForms: ['ACORD 125', 'ACORD 140'],
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

  public getQuestionsGroupedByCoverage(coverageIds: string[], clientType?: ClientType): Record<string, CoverageQuestion[]> {
    const groupedQuestions: Record<string, CoverageQuestion[]> = {};

    coverageIds.forEach(coverageId => {
      const coverageType = this.getCoverageTypeById(coverageId);
      if (coverageType) {
        const questions = coverageType.questions.filter(question =>
          !clientType || !question.clientTypes || question.clientTypes.includes(clientType)
        );
        
        if (questions.length > 0) {
          groupedQuestions[coverageId] = questions;
        }
      }
    });

    return groupedQuestions;
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