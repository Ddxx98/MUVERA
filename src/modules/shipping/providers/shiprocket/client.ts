import { serverEnv } from '@/config/env.server';
import { getValidShiprocketToken } from './token-manager';

export interface ShiprocketOrderInput {
  order_id: string;
  order_date: string;
  pickup_location: string;
  channel_id?: string;
  comment?: string;
  billing_customer_name: string;
  billing_last_name?: string;
  billing_address: string;
  billing_address_2?: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country: string;
  billing_email: string;
  billing_phone: string;
  shipping_is_billing: boolean;
  order_items: Array<{
    name: string;
    sku: string;
    units: number;
    selling_price: number;
  }>;
  payment_method: 'Prepaid' | 'COD';
  sub_total: number;
  length: number;
  breadth: number;
  height: number;
  weight: number; // in kilograms
}

export class ShiprocketClient {
  private baseUrl = 'https://apiv2.shiprocket.in/v1/external';

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (serverEnv.SHIPPING_PROVIDER === 'mock') {
      return this.handleMockRequest<T>(endpoint, options);
    }

    let token = await getValidShiprocketToken();
    let res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    // 401 recovery: retry once with fresh token
    if (res.status === 401) {
      token = await getValidShiprocketToken({ rejectedToken: token });
      res = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Shiprocket API error [${res.status}] ${endpoint}: ${text}`);
    }

    return res.json();
  }

  async createAdhocOrder(input: ShiprocketOrderInput): Promise<{ order_id: number; shipment_id: number; status: string }> {
    return this.request<{ order_id: number; shipment_id: number; status: string }>('/orders/create/adhoc', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async assignAwb(shipmentId: number, courierId?: number): Promise<{ awb_code: string; courier_name: string; courier_company_id: number }> {
    return this.request<{ awb_code: string; courier_name: string; courier_company_id: number }>('/courier/assign/awb', {
      method: 'POST',
      body: JSON.stringify({ shipment_id: shipmentId, ...(courierId ? { courier_id: courierId } : {}) }),
    });
  }

  async schedulePickup(shipmentId: number): Promise<{ response: { pickup_scheduled_date: string; status: number } }> {
    return this.request<{ response: { pickup_scheduled_date: string; status: number } }>('/courier/generate/pickup', {
      method: 'POST',
      body: JSON.stringify({ shipment_id: [shipmentId] }),
    });
  }

  async generateLabel(shipmentId: number): Promise<{ label_url: string; label_created: number }> {
    return this.request<{ label_url: string; label_created: number }>('/courier/generate/label', {
      method: 'POST',
      body: JSON.stringify({ shipment_id: [shipmentId] }),
    });
  }

  async trackAwb(awb: string): Promise<{ tracking_data: { track_status: number; shipment_status: number; current_status: string } }> {
    return this.request<{ tracking_data: { track_status: number; shipment_status: number; current_status: string } }>(
      `/courier/track/awb/${awb}`
    );
  }

  async checkWalletBalance(): Promise<{ balance_amount: number }> {
    return this.request<{ balance_amount: number }>('/account/details/wallet-balance');
  }

  async cancelOrder(orderIds: number[]): Promise<any> {
    return this.request('/orders/cancel', {
      method: 'POST',
      body: JSON.stringify({ ids: orderIds }),
    });
  }

  async cancelAwb(awbs: string[]): Promise<any> {
    return this.request('/orders/cancel/shipment/awbs', {
      method: 'POST',
      body: JSON.stringify({ awbs }),
    });
  }

  private handleMockRequest<T>(endpoint: string, options: RequestInit): T {
    if (endpoint.includes('/orders/create/adhoc')) {
      const body = JSON.parse(String(options.body || '{}'));
      return {
        order_id: Math.floor(Math.random() * 1000000),
        shipment_id: Math.floor(Math.random() * 1000000),
        status: 'NEW',
      } as T;
    }
    if (endpoint.includes('/courier/assign/awb')) {
      return {
        awb_code: `MOCK_AWB_${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        courier_name: 'Delhivery Surface',
        courier_company_id: 10,
      } as T;
    }
    if (endpoint.includes('/courier/generate/pickup')) {
      return {
        response: {
          pickup_scheduled_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          status: 1,
        },
      } as T;
    }
    if (endpoint.includes('/courier/generate/label')) {
      return {
        label_url: 'https://shiprocket.mock/labels/sample_label.pdf',
        label_created: 1,
      } as T;
    }
    if (endpoint.includes('/courier/track/awb/')) {
      return {
        tracking_data: {
          track_status: 1,
          shipment_status: 7,
          current_status: 'DELIVERED',
        },
      } as T;
    }
    if (endpoint.includes('/account/details/wallet-balance')) {
      return {
        balance_amount: 5000,
      } as T;
    }
    if (endpoint.includes('/orders/cancel')) {
      return {
        message: 'Order cancelled successfully',
        status_code: 200,
      } as T;
    }
    return {} as T;
  }
}

export const shiprocketClient = new ShiprocketClient();
