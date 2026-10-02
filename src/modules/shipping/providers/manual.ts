import { ShippingProvider, CreateShipmentInput, ShipmentResult, TrackingUpdate } from '../types';

export class ManualShippingProvider implements ShippingProvider {
  readonly name = 'manual';

  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    const isExpress = input.deliveryMethod === 'express_60';
    const courierName = isExpress ? 'MUVERA 60-Min Express Fleet' : 'BlueDart Express';
    const prefix = isExpress ? 'MUV-EXP' : 'BD';
    const trackingNumber = `${prefix}-${Math.floor(100000000 + Math.random() * 900000000)}`;
    const trackingUrl = isExpress
      ? `/account/orders/${input.orderId}`
      : `https://www.bluedart.com/tracking?handler=tnt&action=custfind&awb=awb&numbers=${trackingNumber}`;

    return {
      shipmentId: `shp_${Date.now()}`,
      trackingNumber,
      courierName,
      trackingUrl,
      status: 'label_created',
      estimatedDeliveryDate: isExpress
        ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  async getTracking(trackingNumber: string): Promise<TrackingUpdate[]> {
    return [
      {
        trackingNumber,
        status: 'label_created',
        location: 'Indiranagar Hub, Bengaluru',
        timestamp: new Date().toISOString(),
        activity: 'Shipping label created and assigned to rider',
      },
    ];
  }
}
