import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logger } from './logger';

const prisma = new PrismaClient();

async function main() {
  try {
    logger.info('Starting database seed...');

    // Create default agency
    const agency = await prisma.agency.upsert({
      where: { domain: 'default' },
      update: {},
      create: {
        name: 'ACORD Intake Platform',
        domain: 'default',
        primaryColor: '#1e3a8a',
        accentColor: '#3b82f6',
        settings: {
          autoSave: true,
          emailNotifications: true,
          auditLogging: true,
          maintenanceMode: false,
          sessionTimeout: 3600,
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: false
          },
          twoFactorAuth: false,
          maxFileUploadSize: 10485760,
          allowedFileTypes: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']
        }
      }
    });

    logger.info('Default agency created');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@acordintake.com' },
      update: {},
      create: {
        email: 'admin@acordintake.com',
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        status: 'ACTIVE',
        agencyId: agency.id
      }
    });

    logger.info('Admin user created');

    // Create broker user
    const brokerPassword = await bcrypt.hash('broker123', 12);
    const broker = await prisma.user.upsert({
      where: { email: 'broker@acordintake.com' },
      update: {},
      create: {
        email: 'broker@acordintake.com',
        password: brokerPassword,
        firstName: 'John',
        lastName: 'Broker',
        role: 'BROKER',
        status: 'ACTIVE',
        agencyId: agency.id
      }
    });

    logger.info('Broker user created');

    // Create customer user
    const customerPassword = await bcrypt.hash('customer123', 12);
    const customer = await prisma.user.upsert({
      where: { email: 'customer@acordintake.com' },
      update: {},
      create: {
        email: 'customer@acordintake.com',
        password: customerPassword,
        firstName: 'Jane',
        lastName: 'Customer',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        agencyId: agency.id
      }
    });

    logger.info('Customer user created');

    // Create default field mappings
    const fieldMappings = [
      {
        acordForm: 'ACORD 125',
        fieldName: 'Business Name',
        intakeField: 'businessInfo.name',
        fieldType: 'TEXT',
        required: true,
        agencyId: agency.id
      },
      {
        acordForm: 'ACORD 125',
        fieldName: 'Federal ID',
        intakeField: 'businessInfo.federalId',
        fieldType: 'TEXT',
        required: true,
        agencyId: agency.id
      },
      {
        acordForm: 'ACORD 125',
        fieldName: 'Business Type',
        intakeField: 'businessInfo.businessType',
        fieldType: 'SELECT',
        required: true,
        agencyId: agency.id
      },
      {
        acordForm: 'ACORD 125',
        fieldName: 'Years in Business',
        intakeField: 'businessInfo.yearsInBusiness',
        fieldType: 'NUMBER',
        required: true,
        agencyId: agency.id
      },
      {
        acordForm: 'ACORD 125',
        fieldName: 'Business Description',
        intakeField: 'businessInfo.description',
        fieldType: 'TEXTAREA',
        required: true,
        agencyId: agency.id
      },
      {
        acordForm: 'ACORD 125',
        fieldName: 'Contact Name',
        intakeField: 'contactInfo.contactName',
        fieldType: 'TEXT',
        required: true,
        agencyId: agency.id
      },
      {
        acordForm: 'ACORD 125',
        fieldName: 'Email',
        intakeField: 'contactInfo.email',
        fieldType: 'EMAIL',
        required: true,
        agencyId: agency.id
      },
      {
        acordForm: 'ACORD 125',
        fieldName: 'Phone',
        intakeField: 'contactInfo.phone',
        fieldType: 'PHONE',
        required: true,
        agencyId: agency.id
      },
      {
        acordForm: 'ACORD 125',
        fieldName: 'Address',
        intakeField: 'contactInfo.address',
        fieldType: 'TEXT',
        required: true,
        agencyId: agency.id
      },
      {
        acordForm: 'ACORD 125',
        fieldName: 'City',
        intakeField: 'contactInfo.city',
        fieldType: 'TEXT',
        required: true,
        agencyId: agency.id
      },
      {
        acordForm: 'ACORD 125',
        fieldName: 'State',
        intakeField: 'contactInfo.state',
        fieldType: 'SELECT',
        required: true,
        agencyId: agency.id
      },
      {
        acordForm: 'ACORD 125',
        fieldName: 'ZIP Code',
        intakeField: 'contactInfo.zipCode',
        fieldType: 'TEXT',
        required: true,
        agencyId: agency.id
      },
      {
        acordForm: 'ACORD 126',
        fieldName: 'General Liability Limit',
        intakeField: 'coverageResponses.generalLiabilityLimit',
        fieldType: 'TEXT',
        required: false,
        agencyId: agency.id
      },
      {
        acordForm: 'ACORD 127',
        fieldName: 'Vehicle Count',
        intakeField: 'coverageResponses.vehicleCount',
        fieldType: 'NUMBER',
        required: false,
        agencyId: agency.id
      },
      {
        acordForm: 'ACORD 130',
        fieldName: 'Employee Count',
        intakeField: 'coverageResponses.employeeCount',
        fieldType: 'NUMBER',
        required: false,
        agencyId: agency.id
      }
    ];

    for (const mapping of fieldMappings) {
      await prisma.fieldMapping.upsert({
        where: {
          acordForm_fieldName: {
            acordForm: mapping.acordForm,
            fieldName: mapping.fieldName
          }
        },
        update: {},
        create: mapping
      });
    }

    logger.info('Field mappings created');

    // Create system settings
    const systemSettings = [
      {
        key: 'app_name',
        value: 'ACORD Intake Platform',
        description: 'Application name'
      },
      {
        key: 'app_version',
        value: '1.0.0',
        description: 'Application version'
      },
      {
        key: 'maintenance_mode',
        value: false,
        description: 'Maintenance mode status'
      },
      {
        key: 'max_file_size',
        value: 10485760,
        description: 'Maximum file upload size in bytes'
      },
      {
        key: 'allowed_file_types',
        value: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
        description: 'Allowed file types for upload'
      },
      {
        key: 'session_timeout',
        value: 3600,
        description: 'Session timeout in seconds'
      },
      {
        key: 'email_notifications',
        value: true,
        description: 'Enable email notifications'
      },
      {
        key: 'audit_logging',
        value: true,
        description: 'Enable audit logging'
      }
    ];

    for (const setting of systemSettings) {
      await prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: setting
      });
    }

    logger.info('System settings created');

    // Create sample submissions
    const sampleSubmissions = [
      {
        submissionId: 'SUB-001',
        businessName: 'TechStart Solutions LLC',
        federalId: '12-3456789',
        businessType: 'llc',
        yearsInBusiness: 3,
        businessDescription: 'Software development and IT consulting services',
        website: 'https://techstartsolutions.com',
        contactName: 'Sarah Johnson',
        email: 'sarah@techstartsolutions.com',
        phone: '(555) 123-4567',
        address: '123 Innovation Drive',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        coverageTypes: ['General Liability', 'Cyber Liability', 'Professional Liability'],
        coverageResponses: {
          generalLiabilityLimit: '$2,000,000',
          cyberLiabilityLimit: '$1,000,000',
          professionalLiabilityLimit: '$1,000,000',
          hasDataBreachPlan: 'Yes',
          employeeCount: '25',
          annualRevenue: '$2,500,000'
        },
        clientType: 'BUSINESS',
        status: 'NEW',
        priority: 'HIGH',
        agencyId: agency.id,
        brokerId: broker.id
      },
      {
        submissionId: 'SUB-002',
        businessName: 'Downtown Restaurant Group',
        federalId: '98-7654321',
        businessType: 'corporation',
        yearsInBusiness: 8,
        businessDescription: 'Full-service restaurant with bar and catering services',
        website: 'https://downtownrestaurant.com',
        contactName: 'Lisa Chen',
        email: 'lisa@downtownrestaurant.com',
        phone: '(555) 987-6543',
        address: '456 Main Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        coverageTypes: ['General Liability', 'Property Insurance', 'Workers\' Compensation'],
        coverageResponses: {
          generalLiabilityLimit: '$1,000,000',
          propertyValue: '$500,000',
          employeeCount: '15',
          hasLiquorLiability: 'Yes',
          annualRevenue: '$1,200,000',
          hasSprinklerSystem: 'Yes'
        },
        clientType: 'BUSINESS',
        status: 'REVIEW',
        priority: 'MEDIUM',
        agencyId: agency.id,
        brokerId: broker.id
      }
    ];

    for (const submission of sampleSubmissions) {
      await prisma.submission.upsert({
        where: { submissionId: submission.submissionId },
        update: {},
        create: submission
      });
    }

    logger.info('Sample submissions created');

    logger.info('Database seed completed successfully!');
    logger.info('Default users created:');
    logger.info('Admin: admin@acordintake.com / admin123');
    logger.info('Broker: broker@acordintake.com / broker123');
    logger.info('Customer: customer@acordintake.com / customer123');

  } catch (error) {
    logger.error('Database seed failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    logger.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
