/**
 * ReshADX TypeScript SDK - Link Resource
 */

import { HttpClient } from '../utils/http';
import {
  CreateLinkTokenRequest,
  CreateLinkTokenResponse,
  ExchangePublicTokenRequest,
  ExchangePublicTokenResponse,
} from '../types';

export class Link {
  constructor(private http: HttpClient) {}

  /**
   * Create a Link token for account linking
   */
  async createLinkToken(request: CreateLinkTokenRequest): Promise<CreateLinkTokenResponse> {
    return this.http.post<CreateLinkTokenResponse>('/link/token/create', request);
  }

  /**
   * Exchange public token for access token
   */
  async exchangePublicToken(request: ExchangePublicTokenRequest): Promise<ExchangePublicTokenResponse> {
    return this.http.post<ExchangePublicTokenResponse>('/link/token/exchange', request);
  }

  /**
   * Update Link for an existing item (re-authenticate)
   */
  async updateLinkToken(itemId: string): Promise<CreateLinkTokenResponse> {
    return this.http.post<CreateLinkTokenResponse>('/link/token/update', { itemId });
  }
}
