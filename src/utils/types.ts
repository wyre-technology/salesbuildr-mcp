/**
 * SalesBuildr API type definitions
 *
 * These types define the shape of data returned by the SalesBuildr API.
 * They are declared locally so the MCP server can build and test independently
 * of the @wyre-technology/node-salesbuildr package.
 */

export interface Company {
  id: string;
  name: string;
  domain?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  website?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  companyId?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  price?: number;
  recurringPrice?: number;
  billingCycle?: string;
  category?: string;
  vendor?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Opportunity {
  id: string;
  title: string;
  companyId?: string;
  contactId?: string;
  value?: number;
  stage?: string;
  probability?: number;
  expectedCloseDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuoteItem {
  productId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  recurringPrice?: number;
  billingCycle?: string;
  discount?: number;
}

export interface Quote {
  id: string;
  title: string;
  companyId?: string;
  contactId?: string;
  opportunityId?: string;
  status?: string;
  items?: QuoteItem[];
  subtotal?: number;
  total?: number;
  notes?: string;
  validUntil?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
  from: number;
  size: number;
}

/**
 * SalesBuildr client interface
 *
 * Defines the expected shape of the client from @wyre-technology/node-salesbuildr.
 * This allows the MCP server to compile without the actual package installed.
 */
export interface SalesbuildrClient {
  companies: {
    list(params?: {
      query?: string;
      from?: number;
      size?: number;
    }): Promise<ListResponse<Company>>;
    get(id: string): Promise<Company>;
    create(data: Partial<Company>): Promise<Company>;
    update(id: string, data: Partial<Company>): Promise<Company>;
    delete(id: string): Promise<void>;
  };
  contacts: {
    list(params?: {
      query?: string;
      companyId?: string;
      from?: number;
      size?: number;
    }): Promise<ListResponse<Contact>>;
    get(id: string): Promise<Contact>;
    create(data: Partial<Contact>): Promise<Contact>;
    update(id: string, data: Partial<Contact>): Promise<Contact>;
    delete(id: string): Promise<void>;
  };
  products: {
    list(params?: {
      query?: string;
      from?: number;
      size?: number;
    }): Promise<ListResponse<Product>>;
    get(id: string): Promise<Product>;
  };
  opportunities: {
    list(params?: {
      query?: string;
      from?: number;
      size?: number;
    }): Promise<ListResponse<Opportunity>>;
    get(id: string): Promise<Opportunity>;
    create(data: Partial<Opportunity>): Promise<Opportunity>;
    update(id: string, data: Partial<Opportunity>): Promise<Opportunity>;
  };
  quotes: {
    list(params?: {
      query?: string;
      companyId?: string;
      opportunityId?: string;
      from?: number;
      size?: number;
    }): Promise<ListResponse<Quote>>;
    get(id: string): Promise<Quote>;
    create(data: Partial<Quote>): Promise<Quote>;
  };
}
