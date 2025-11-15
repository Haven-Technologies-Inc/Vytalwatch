/**
 * ReshADX TypeScript SDK - Main Client
 */

import { ReshADXConfig } from './types';
import { HttpClient } from './utils/http';
import { Auth } from './resources/auth';
import { Link } from './resources/link';
import { Accounts } from './resources/accounts';
import { Transactions } from './resources/transactions';
import { CreditScoreResource } from './resources/credit-score';
import { Risk } from './resources/risk';
import { Webhooks } from './resources/webhooks';
import { Items } from './resources/items';

export class ReshADX {
  private http: HttpClient;

  // Resource instances
  public auth: Auth;
  public link: Link;
  public accounts: Accounts;
  public transactions: Transactions;
  public creditScore: CreditScoreResource;
  public risk: Risk;
  public webhooks: Webhooks;
  public items: Items;

  constructor(config: ReshADXConfig) {
    this.http = new HttpClient(config);

    // Initialize resources
    this.auth = new Auth(this.http);
    this.link = new Link(this.http);
    this.accounts = new Accounts(this.http);
    this.transactions = new Transactions(this.http);
    this.creditScore = new CreditScoreResource(this.http);
    this.risk = new Risk(this.http);
    this.webhooks = new Webhooks(this.http);
    this.items = new Items(this.http);
  }

  /**
   * Set access token for authenticated requests
   * Use this if you have a stored access token
   */
  setAccessToken(token: string): void {
    this.http.setAccessToken(token);
  }

  /**
   * Clear access token
   */
  clearAccessToken(): void {
    this.http.clearAccessToken();
  }
}
