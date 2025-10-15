import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { logger } from '@/utils/logger';

interface CarrierConfig {
  name: string;
  apiBaseUrl: string;
  apiKey: string;
  apiSecret?: string;
  timeout: number;
  retryAttempts: number;
  rateLimitPerMinute: number;
}

interface QuoteRequest {
  submissionId: string;
  businessInfo: {
    name: string;
    federalId: string;
    businessType: string;
    yearsInBusiness: number;
    description: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  coverageInfo: {
    coverageTypes: string[];
    limits: Record<string, number>;
    deductibles: Record<string, number>;
  };
  contactInfo: {
    name: string;
    email: string;
    phone: string;
  };
}

interface QuoteResponse {
  carrierId: string;
  quoteId: string;
  premium: number;
  effectiveDate: string;
  expirationDate: string;
  coverage: {
    type: string;
    limit: number;
    deductible: number;
    premium: number;
  }[];
  terms: string[];
  conditions: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  validUntil: string;
  documents: {
    type: string;
    url: string;
    required: boolean;
  }[];
}

interface PolicyRequest {
  quoteId: string;
  submissionId: string;
  effectiveDate: string;
  paymentMethod: 'ANNUAL' | 'SEMI_ANNUAL' | 'QUARTERLY' | 'MONTHLY';
  billingInfo: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

interface PolicyResponse {
  policyId: string;
  policyNumber: string;
  effectiveDate: string;
  expirationDate: string;
  premium: number;
  paymentSchedule: {
    frequency: string;
    amount: number;
    dueDate: string;
  }[];
  documents: {
    type: string;
    url: string;
    downloadUrl: string;
  }[];
  status: 'ACTIVE' | 'PENDING' | 'CANCELLED' | 'EXPIRED';
}

class CarrierIntegrationService {
  private carriers: Map<string, CarrierConfig> = new Map();
  private clients: Map<string, AxiosInstance> = new Map();

  constructor() {
    this.initializeCarriers();
  }

  private initializeCarriers(): void {
    // State Farm
    this.addCarrier({
      name: 'State Farm',
      apiBaseUrl: process.env.STATE_FARM_API_URL || 'https://api.statefarm.com/v1',
      apiKey: process.env.STATE_FARM_API_KEY || '',
      timeout: 30000,
      retryAttempts: 3,
      rateLimitPerMinute: 100
    });

    // Progressive
    this.addCarrier({
      name: 'Progressive',
      apiBaseUrl: process.env.PROGRESSIVE_API_URL || 'https://api.progressive.com/v2',
      apiKey: process.env.PROGRESSIVE_API_KEY || '',
      timeout: 30000,
      retryAttempts: 3,
      rateLimitPerMinute: 150
    });

    // Allstate
    this.addCarrier({
      name: 'Allstate',
      apiBaseUrl: process.env.ALLSTATE_API_URL || 'https://api.allstate.com/v1',
      apiKey: process.env.ALLSTATE_API_KEY || '',
      timeout: 30000,
      retryAttempts: 3,
      rateLimitPerMinute: 120
    });

    // Liberty Mutual
    this.addCarrier({
      name: 'Liberty Mutual',
      apiBaseUrl: process.env.LIBERTY_MUTUAL_API_URL || 'https://api.libertymutual.com/v1',
      apiKey: process.env.LIBERTY_MUTUAL_API_KEY || '',
      timeout: 30000,
      retryAttempts: 3,
      rateLimitPerMinute: 80
    });

    // Travelers
    this.addCarrier({
      name: 'Travelers',
      apiBaseUrl: process.env.TRAVELERS_API_URL || 'https://api.travelers.com/v1',
      apiKey: process.env.TRAVELERS_API_KEY || '',
      timeout: 30000,
      retryAttempts: 3,
      rateLimitPerMinute: 100
    });
  }

  private addCarrier(config: CarrierConfig): void {
    this.carriers.set(config.name.toLowerCase(), config);
    
    // Create axios instance for this carrier
    const client = axios.create({
      baseURL: config.apiBaseUrl,
      timeout: config.timeout,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ACORD-Intake-Platform/1.0'
      }
    });

    // Add request interceptor for logging
    client.interceptors.request.use(
      (config) => {
        logger.info(`Carrier API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('Carrier API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    client.interceptors.response.use(
      (response) => {
        logger.info(`Carrier API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('Carrier API Response Error:', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message
        });
        return Promise.reject(error);
      }
    );

    this.clients.set(config.name.toLowerCase(), client);
  }

  // Get available carriers
  public getAvailableCarriers(): string[] {
    return Array.from(this.carriers.keys());
  }

  // Get carrier configuration
  public getCarrierConfig(carrierName: string): CarrierConfig | undefined {
    return this.carriers.get(carrierName.toLowerCase());
  }

  // Request quotes from multiple carriers
  public async requestQuotes(
    quoteRequest: QuoteRequest,
    carrierNames?: string[]
  ): Promise<Map<string, QuoteResponse>> {
    const quotes = new Map<string, QuoteResponse>();
    const carriers = carrierNames || this.getAvailableCarriers();

    const quotePromises = carriers.map(async (carrierName) => {
      try {
        const quote = await this.requestQuoteFromCarrier(carrierName, quoteRequest);
        quotes.set(carrierName, quote);
      } catch (error) {
        logger.error(`Failed to get quote from ${carrierName}:`, error);
        // Continue with other carriers even if one fails
      }
    });

    await Promise.allSettled(quotePromises);
    return quotes;
  }

  // Request quote from specific carrier
  private async requestQuoteFromCarrier(
    carrierName: string,
    quoteRequest: QuoteRequest
  ): Promise<QuoteResponse> {
    const client = this.clients.get(carrierName.toLowerCase());
    if (!client) {
      throw new Error(`Carrier ${carrierName} not configured`);
    }

    const config = this.carriers.get(carrierName.toLowerCase());
    if (!config) {
      throw new Error(`Carrier ${carrierName} configuration not found`);
    }

    // Transform request to carrier-specific format
    const carrierRequest = this.transformQuoteRequest(carrierName, quoteRequest);

    try {
      const response: AxiosResponse<QuoteResponse> = await client.post(
        '/quotes',
        carrierRequest,
        {
          timeout: config.timeout
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        // Rate limit exceeded, wait and retry
        await this.handleRateLimit(carrierName);
        return this.requestQuoteFromCarrier(carrierName, quoteRequest);
      }
      throw error;
    }
  }

  // Transform quote request to carrier-specific format
  private transformQuoteRequest(carrierName: string, request: QuoteRequest): any {
    const baseRequest = {
      businessName: request.businessInfo.name,
      federalId: request.businessInfo.federalId,
      businessType: request.businessInfo.businessType,
      yearsInBusiness: request.businessInfo.yearsInBusiness,
      businessDescription: request.businessInfo.description,
      address: request.businessInfo.address,
      contactName: request.contactInfo.name,
      email: request.contactInfo.email,
      phone: request.contactInfo.phone,
      coverageTypes: request.coverageInfo.coverageTypes,
      limits: request.coverageInfo.limits,
      deductibles: request.coverageInfo.deductibles
    };

    // Carrier-specific transformations
    switch (carrierName.toLowerCase()) {
      case 'state farm':
        return {
          ...baseRequest,
          // State Farm specific fields
          agencyCode: process.env.STATE_FARM_AGENCY_CODE,
          territory: this.getTerritoryFromState(request.businessInfo.address.state)
        };

      case 'progressive':
        return {
          ...baseRequest,
          // Progressive specific fields
          channel: 'AGENT',
          productLine: 'COMMERCIAL'
        };

      case 'allstate':
        return {
          ...baseRequest,
          // Allstate specific fields
          agencyId: process.env.ALLSTATE_AGENCY_ID,
          region: this.getRegionFromState(request.businessInfo.address.state)
        };

      case 'liberty mutual':
        return {
          ...baseRequest,
          // Liberty Mutual specific fields
          producerCode: process.env.LIBERTY_MUTUAL_PRODUCER_CODE,
          marketSegment: 'SMALL_BUSINESS'
        };

      case 'travelers':
        return {
          ...baseRequest,
          // Travelers specific fields
          agentCode: process.env.TRAVELERS_AGENT_CODE,
          businessClass: this.getBusinessClass(request.businessInfo.businessType)
        };

      default:
        return baseRequest;
    }
  }

  // Purchase policy from carrier
  public async purchasePolicy(
    carrierName: string,
    policyRequest: PolicyRequest
  ): Promise<PolicyResponse> {
    const client = this.clients.get(carrierName.toLowerCase());
    if (!client) {
      throw new Error(`Carrier ${carrierName} not configured`);
    }

    const config = this.carriers.get(carrierName.toLowerCase());
    if (!config) {
      throw new Error(`Carrier ${carrierName} configuration not found`);
    }

    try {
      const response: AxiosResponse<PolicyResponse> = await client.post(
        '/policies',
        policyRequest,
        {
          timeout: config.timeout
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        await this.handleRateLimit(carrierName);
        return this.purchasePolicy(carrierName, policyRequest);
      }
      throw error;
    }
  }

  // Get policy status
  public async getPolicyStatus(
    carrierName: string,
    policyId: string
  ): Promise<PolicyResponse> {
    const client = this.clients.get(carrierName.toLowerCase());
    if (!client) {
      throw new Error(`Carrier ${carrierName} not configured`);
    }

    const response: AxiosResponse<PolicyResponse> = await client.get(
      `/policies/${policyId}`
    );

    return response.data;
  }

  // Cancel policy
  public async cancelPolicy(
    carrierName: string,
    policyId: string,
    reason: string,
    effectiveDate?: string
  ): Promise<{ success: boolean; cancellationId: string }> {
    const client = this.clients.get(carrierName.toLowerCase());
    if (!client) {
      throw new Error(`Carrier ${carrierName} not configured`);
    }

    const response: AxiosResponse<{ success: boolean; cancellationId: string }> = 
      await client.post(`/policies/${policyId}/cancel`, {
        reason,
        effectiveDate: effectiveDate || new Date().toISOString()
      });

    return response.data;
  }

  // Get policy documents
  public async getPolicyDocuments(
    carrierName: string,
    policyId: string
  ): Promise<{ type: string; url: string; downloadUrl: string }[]> {
    const client = this.clients.get(carrierName.toLowerCase());
    if (!client) {
      throw new Error(`Carrier ${carrierName} not configured`);
    }

    const response: AxiosResponse<{ type: string; url: string; downloadUrl: string }[]> = 
      await client.get(`/policies/${policyId}/documents`);

    return response.data;
  }

  // Handle rate limiting
  private async handleRateLimit(carrierName: string): Promise<void> {
    const config = this.carriers.get(carrierName.toLowerCase());
    if (!config) return;

    const waitTime = (60 * 1000) / config.rateLimitPerMinute; // Convert to milliseconds
    logger.warn(`Rate limit exceeded for ${carrierName}, waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  // Helper methods
  private getTerritoryFromState(state: string): string {
    const territoryMap: Record<string, string> = {
      'CA': 'WEST',
      'NY': 'NORTHEAST',
      'TX': 'SOUTH',
      'FL': 'SOUTH',
      'IL': 'MIDWEST'
    };
    return territoryMap[state] || 'UNKNOWN';
  }

  private getRegionFromState(state: string): string {
    const regionMap: Record<string, string> = {
      'CA': 'WESTERN',
      'NY': 'EASTERN',
      'TX': 'SOUTHERN',
      'FL': 'SOUTHERN',
      'IL': 'CENTRAL'
    };
    return regionMap[state] || 'UNKNOWN';
  }

  private getBusinessClass(businessType: string): string {
    const classMap: Record<string, string> = {
      'sole-proprietorship': 'SOLE_PROP',
      'partnership': 'PARTNERSHIP',
      'llc': 'LLC',
      'corporation': 'CORPORATION',
      'non-profit': 'NON_PROFIT'
    };
    return classMap[businessType] || 'OTHER';
  }

  // Webhook handler for carrier notifications
  public async handleCarrierWebhook(
    carrierName: string,
    payload: any
  ): Promise<{ processed: boolean; message: string }> {
    try {
      logger.info(`Received webhook from ${carrierName}:`, payload);

      // Process different webhook types
      switch (payload.type) {
        case 'QUOTE_READY':
          await this.processQuoteReady(carrierName, payload);
          break;
        case 'POLICY_ISSUED':
          await this.processPolicyIssued(carrierName, payload);
          break;
        case 'POLICY_CANCELLED':
          await this.processPolicyCancelled(carrierName, payload);
          break;
        case 'PAYMENT_RECEIVED':
          await this.processPaymentReceived(carrierName, payload);
          break;
        default:
          logger.warn(`Unknown webhook type: ${payload.type}`);
      }

      return { processed: true, message: 'Webhook processed successfully' };
    } catch (error) {
      logger.error(`Error processing webhook from ${carrierName}:`, error);
      return { processed: false, message: 'Webhook processing failed' };
    }
  }

  private async processQuoteReady(carrierName: string, payload: any): Promise<void> {
    // Update quote status in database
    logger.info(`Quote ready from ${carrierName}:`, payload.quoteId);
  }

  private async processPolicyIssued(carrierName: string, payload: any): Promise<void> {
    // Update policy status in database
    logger.info(`Policy issued from ${carrierName}:`, payload.policyId);
  }

  private async processPolicyCancelled(carrierName: string, payload: any): Promise<void> {
    // Update policy cancellation status
    logger.info(`Policy cancelled from ${carrierName}:`, payload.policyId);
  }

  private async processPaymentReceived(carrierName: string, payload: any): Promise<void> {
    // Update payment status
    logger.info(`Payment received from ${carrierName}:`, payload.paymentId);
  }
}

export const carrierIntegrationService = new CarrierIntegrationService();
export default carrierIntegrationService;
