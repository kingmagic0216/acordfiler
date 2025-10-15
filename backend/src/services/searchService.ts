import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

interface SearchFilters {
  query?: string;
  status?: string[];
  priority?: string[];
  coverageTypes?: string[];
  businessType?: string[];
  state?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  brokerId?: string;
  agencyId?: string;
}

interface SearchOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
}

interface SearchResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  filters: SearchFilters;
}

class SearchService {
  // Advanced submission search
  async searchSubmissions(
    filters: SearchFilters = {},
    options: SearchOptions = {}
  ): Promise<SearchResult<any>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'submittedAt',
      sortOrder = 'desc',
      includeArchived = false
    } = options;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Text search across multiple fields
    if (filters.query) {
      where.OR = [
        { businessName: { contains: filters.query, mode: 'insensitive' } },
        { contactName: { contains: filters.query, mode: 'insensitive' } },
        { email: { contains: filters.query, mode: 'insensitive' } },
        { submissionId: { contains: filters.query, mode: 'insensitive' } },
        { federalId: { contains: filters.query, mode: 'insensitive' } },
        { businessDescription: { contains: filters.query, mode: 'insensitive' } }
      ];
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    // Priority filter
    if (filters.priority && filters.priority.length > 0) {
      where.priority = { in: filters.priority };
    }

    // Coverage types filter
    if (filters.coverageTypes && filters.coverageTypes.length > 0) {
      where.coverageTypes = { hasSome: filters.coverageTypes };
    }

    // Business type filter
    if (filters.businessType && filters.businessType.length > 0) {
      where.businessType = { in: filters.businessType };
    }

    // State filter
    if (filters.state && filters.state.length > 0) {
      where.state = { in: filters.state };
    }

    // Date range filter
    if (filters.dateRange) {
      where.submittedAt = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end
      };
    }

    // Broker filter
    if (filters.brokerId) {
      where.brokerId = filters.brokerId;
    }

    // Agency filter
    if (filters.agencyId) {
      where.agencyId = filters.agencyId;
    }

    // Exclude archived if not requested
    if (!includeArchived) {
      where.status = { not: 'CANCELLED' };
    }

    // Build orderBy clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    try {
      const [submissions, total] = await Promise.all([
        prisma.submission.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            broker: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            agency: {
              select: {
                id: true,
                name: true
              }
            },
            documents: {
              select: {
                id: true,
                fileName: true,
                documentType: true,
                uploadedAt: true
              }
            },
            acordForms: {
              select: {
                id: true,
                formType: true,
                status: true,
                generatedAt: true
              }
            },
            _count: {
              select: {
                documents: true,
                acordForms: true
              }
            }
          }
        }),
        prisma.submission.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        data: submissions,
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage,
        filters
      };
    } catch (error) {
      logger.error('Submission search failed:', error);
      throw error;
    }
  }

  // Advanced user search
  async searchUsers(
    filters: {
      query?: string;
      role?: string[];
      status?: string[];
      agencyId?: string;
      lastLoginRange?: { start: Date; end: Date };
    } = {},
    options: SearchOptions = {}
  ): Promise<SearchResult<any>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;
    const where: any = {};

    // Text search
    if (filters.query) {
      where.OR = [
        { firstName: { contains: filters.query, mode: 'insensitive' } },
        { lastName: { contains: filters.query, mode: 'insensitive' } },
        { email: { contains: filters.query, mode: 'insensitive' } }
      ];
    }

    // Role filter
    if (filters.role && filters.role.length > 0) {
      where.role = { in: filters.role };
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    // Agency filter
    if (filters.agencyId) {
      where.agencyId = filters.agencyId;
    }

    // Last login range
    if (filters.lastLoginRange) {
      where.lastLoginAt = {
        gte: filters.lastLoginRange.start,
        lte: filters.lastLoginRange.end
      };
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    try {
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
            avatar: true,
            phone: true,
            agency: {
              select: {
                id: true,
                name: true
              }
            },
            createdAt: true,
            lastLoginAt: true,
            _count: {
              select: {
                submissions: true
              }
            }
          }
        }),
        prisma.user.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        data: users,
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage,
        filters
      };
    } catch (error) {
      logger.error('User search failed:', error);
      throw error;
    }
  }

  // Advanced document search
  async searchDocuments(
    filters: {
      query?: string;
      submissionId?: string;
      documentType?: string[];
      uploadedBy?: string;
      dateRange?: { start: Date; end: Date };
      fileSizeRange?: { min: number; max: number };
    } = {},
    options: SearchOptions = {}
  ): Promise<SearchResult<any>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'uploadedAt',
      sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;
    const where: any = {};

    // Text search
    if (filters.query) {
      where.OR = [
        { fileName: { contains: filters.query, mode: 'insensitive' } },
        { originalName: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } }
      ];
    }

    // Submission filter
    if (filters.submissionId) {
      where.submissionId = filters.submissionId;
    }

    // Document type filter
    if (filters.documentType && filters.documentType.length > 0) {
      where.documentType = { in: filters.documentType };
    }

    // Uploaded by filter
    if (filters.uploadedBy) {
      where.uploadedBy = filters.uploadedBy;
    }

    // Date range filter
    if (filters.dateRange) {
      where.uploadedAt = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end
      };
    }

    // File size range filter
    if (filters.fileSizeRange) {
      where.fileSize = {
        gte: filters.fileSizeRange.min,
        lte: filters.fileSizeRange.max
      };
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    try {
      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            submission: {
              select: {
                id: true,
                submissionId: true,
                businessName: true,
                contactName: true
              }
            }
          }
        }),
        prisma.document.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        data: documents,
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage,
        filters
      };
    } catch (error) {
      logger.error('Document search failed:', error);
      throw error;
    }
  }

  // Global search across all entities
  async globalSearch(
    query: string,
    entityTypes: string[] = ['submissions', 'users', 'documents'],
    options: SearchOptions = {}
  ): Promise<{
    submissions?: SearchResult<any>;
    users?: SearchResult<any>;
    documents?: SearchResult<any>;
  }> {
    const results: any = {};

    try {
      if (entityTypes.includes('submissions')) {
        results.submissions = await this.searchSubmissions(
          { query },
          { ...options, limit: options.limit || 10 }
        );
      }

      if (entityTypes.includes('users')) {
        results.users = await this.searchUsers(
          { query },
          { ...options, limit: options.limit || 10 }
        );
      }

      if (entityTypes.includes('documents')) {
        results.documents = await this.searchDocuments(
          { query },
          { ...options, limit: options.limit || 10 }
        );
      }

      return results;
    } catch (error) {
      logger.error('Global search failed:', error);
      throw error;
    }
  }

  // Get search suggestions
  async getSearchSuggestions(query: string, limit: number = 10): Promise<{
    businessNames: string[];
    contactNames: string[];
    emails: string[];
    submissionIds: string[];
  }> {
    try {
      const [businessNames, contactNames, emails, submissionIds] = await Promise.all([
        prisma.submission.findMany({
          where: {
            businessName: { contains: query, mode: 'insensitive' }
          },
          select: { businessName: true },
          distinct: ['businessName'],
          take: limit
        }),
        prisma.submission.findMany({
          where: {
            contactName: { contains: query, mode: 'insensitive' }
          },
          select: { contactName: true },
          distinct: ['contactName'],
          take: limit
        }),
        prisma.submission.findMany({
          where: {
            email: { contains: query, mode: 'insensitive' }
          },
          select: { email: true },
          distinct: ['email'],
          take: limit
        }),
        prisma.submission.findMany({
          where: {
            submissionId: { contains: query, mode: 'insensitive' }
          },
          select: { submissionId: true },
          distinct: ['submissionId'],
          take: limit
        })
      ]);

      return {
        businessNames: businessNames.map(s => s.businessName),
        contactNames: contactNames.map(s => s.contactName),
        emails: emails.map(s => s.email),
        submissionIds: submissionIds.map(s => s.submissionId)
      };
    } catch (error) {
      logger.error('Search suggestions failed:', error);
      throw error;
    }
  }

  // Get filter options for UI
  async getFilterOptions(): Promise<{
    statuses: string[];
    priorities: string[];
    coverageTypes: string[];
    businessTypes: string[];
    states: string[];
  }> {
    try {
      const [statuses, priorities, coverageTypes, businessTypes, states] = await Promise.all([
        prisma.submission.findMany({
          select: { status: true },
          distinct: ['status']
        }),
        prisma.submission.findMany({
          select: { priority: true },
          distinct: ['priority']
        }),
        prisma.submission.findMany({
          select: { coverageTypes: true }
        }),
        prisma.submission.findMany({
          select: { businessType: true },
          distinct: ['businessType']
        }),
        prisma.submission.findMany({
          select: { state: true },
          distinct: ['state']
        })
      ]);

      // Flatten coverage types array
      const allCoverageTypes = coverageTypes
        .flatMap(s => s.coverageTypes)
        .filter((type, index, array) => array.indexOf(type) === index);

      return {
        statuses: statuses.map(s => s.status),
        priorities: priorities.map(p => p.priority),
        coverageTypes: allCoverageTypes,
        businessTypes: businessTypes.map(b => b.businessType),
        states: states.map(s => s.state)
      };
    } catch (error) {
      logger.error('Filter options failed:', error);
      throw error;
    }
  }
}

export const searchService = new SearchService();
export default searchService;

