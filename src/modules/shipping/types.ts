export type CourierName =
  | 'muvera_express_fleet'
  | 'bluedart'
  | 'delhivery'
  | 'shiprocket'
  | 'shadowfax'
  | 'manual';

export interface CreateShipmentInput {
  orderId: string;
  orderNo: string;
  deliveryMethod: 'standard' | 'express_60';
  destinationPincode: string;
  destinationAddress: {
    street: string;
    apartment?: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
  };
  customer: {
    name: string;
    phone: string;
  };
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

export interface ShipmentResult {
  shipmentId: string;
  trackingNumber: string;
  courierName: string;
  trackingUrl: string;
  status: 'label_created' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered';
  estimatedDeliveryDate?: string;
}

export interface TrackingUpdate {
  trackingNumber: string;
  status: 'label_created' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered';
  location?: string;
  timestamp: string;
  activity: string;
}

export interface ShippingProvider {
  readonly name: string;
  createShipment(input: CreateShipmentInput): Promise<ShipmentResult>;
  getTracking(trackingNumber: string): Promise<TrackingUpdate[]>;
}
